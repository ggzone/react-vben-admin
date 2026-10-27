//! 安全基座 —— 密码学、随机令牌、限流、客户端信息、安全响应头、Cookie
//!
//! 设计原则（安全优先）：
//! 1. 密码与 refresh token 只存哈希（argon2id），永不落明文、永不回传。
//! 2. 登录失败计数与锁定、按 IP 的固定窗口限流双层防护。
//! 3. 对外错误信息只给「用户可读但不泄露内部细节」的文案。
//! 4. refresh token 放在 HttpOnly + SameSite=Strict 的 Cookie 里，令牌本体不暴露给 JS。

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{LazyLock, Mutex};

use argon2::password_hash::rand_core::{OsRng, RngCore};
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use axum::extract::Request;
use axum::http::{header, HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};

use crate::error::AppError;

/* ============================ 密码 ============================ */

/// 密码最小长度（政策）
pub const MIN_PASSWORD_LEN: usize = 8;
/// 密码最大长度（防止超长输入拖慢哈希，构成 DoS）
pub const MAX_PASSWORD_LEN: usize = 72;

/// argon2id 哈希密码
pub fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::internal(format!("failed to hash password: {e}")))?;
    Ok(hash.to_string())
}

/// 校验密码（argon2 内部为常量时间比较）
pub fn verify_password(password: &str, password_hash: &str) -> bool {
    match PasswordHash::new(password_hash) {
        Ok(parsed) => Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok(),
        Err(err) => {
            tracing::error!(error = %err, "invalid password hash in database");
            false
        }
    }
}

/// 一个固定的「假哈希」：用户不存在时也跑一次 argon2，
/// 让响应时间与「密码错误」接近，避免通过时间差枚举用户名。
static DUMMY_HASH: LazyLock<String> =
    LazyLock::new(|| hash_password("vben-dummy-password-for-timing").unwrap_or_default());

/// 时间均衡校验（用户不存在时调用，返回值恒为 false）
pub fn verify_password_dummy(password: &str) -> bool {
    let _ = verify_password(password, &DUMMY_HASH);
    false
}

/// 密码强度校验（政策：长度 + 字母 + 数字）
pub fn validate_password_policy(password: &str) -> Result<(), AppError> {
    if password.len() < MIN_PASSWORD_LEN {
        return Err(AppError::bad_request(format!(
            "密码至少需要 {MIN_PASSWORD_LEN} 位"
        )));
    }
    if password.len() > MAX_PASSWORD_LEN {
        return Err(AppError::bad_request(format!(
            "密码最长 {MAX_PASSWORD_LEN} 位"
        )));
    }
    let has_alpha = password.chars().any(|c| c.is_ascii_alphabetic());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    if !has_alpha || !has_digit {
        return Err(AppError::bad_request("密码必须同时包含字母和数字"));
    }
    Ok(())
}

/* ============================ 随机令牌 ============================ */

const HEX: &[u8; 16] = b"0123456789abcdef";

fn hex_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0x0f) as usize] as char);
    }
    out
}

/// 生成 n 字节密码学安全随机数的 hex 字符串
pub fn rand_hex(n: usize) -> String {
    let mut buf = vec![0u8; n];
    OsRng.fill_bytes(&mut buf);
    hex_encode(&buf)
}

/// 生成 refresh token：`selector.verifier`
///
/// - selector（8 字节）：明文入库，作为索引定位令牌行；
/// - verifier（32 字节）：只存 argon2 哈希，数据库泄露也无法反推可用令牌。
pub fn new_refresh_token() -> (String, String, String) {
    let selector = rand_hex(8);
    let verifier = rand_hex(32);
    let hash = hash_password(&verifier).unwrap_or_default();
    (format!("{selector}.{verifier}"), selector, hash)
}

/// 拆分 `selector.verifier`，格式不合法直接拒绝
pub fn split_refresh_token(raw: &str) -> Option<(&str, &str)> {
    let (selector, verifier) = raw.split_once('.')?;
    if selector.len() != 16 || verifier.len() < 32 {
        return None;
    }
    Some((selector, verifier))
}

/* ============================ 限流 ============================ */

/// 固定窗口限流器（进程内；单实例部署足够，多实例可换 Redis）
#[derive(Default)]
pub struct RateLimiter {
    buckets: Mutex<HashMap<String, (i64, u32)>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self::default()
    }

    /// 计一次请求；`Err(retry_after_secs)` 表示已超限
    pub fn check(&self, key: &str, limit: u32, window_secs: i64) -> Result<(), i64> {
        let now = chrono::Utc::now().timestamp();
        let mut guard = match self.buckets.lock() {
            Ok(g) => g,
            Err(err) => {
                // 锁中毒时放行：限流组件故障不应导致服务不可用
                tracing::error!(error = %err, "rate limiter poisoned");
                return Ok(());
            }
        };

        // 轻量 GC：桶过多时清掉过期窗口
        if guard.len() > 4096 {
            guard.retain(|_, (start, _)| now - *start < window_secs);
        }

        let entry = guard.entry(key.to_string()).or_insert((now, 0));
        if now - entry.0 >= window_secs {
            *entry = (now, 0);
        }
        if entry.1 >= limit {
            return Err(window_secs - (now - entry.0));
        }
        entry.1 += 1;
        Ok(())
    }
}

/* ============================ 客户端信息 ============================ */

/// 客户端信息（用于审计与锁定）
#[derive(Debug, Clone, Default)]
pub struct ClientInfo {
    pub ip: String,
    pub user_agent: String,
}

impl ClientInfo {
    /// 从请求头与连接信息提取
    ///
    /// 仅当 `trust_proxy` 为真才采信 `X-Forwarded-For`（否则客户端可伪造 IP 绕过限流）
    pub fn from_headers(headers: &HeaderMap, addr: Option<SocketAddr>, trust_proxy: bool) -> Self {
        let mut ip = addr.map(|a| a.ip().to_string()).unwrap_or_default();
        if trust_proxy {
            if let Some(forwarded) = headers
                .get("x-forwarded-for")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.split(',').next())
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                ip = forwarded.to_string();
            } else if let Some(real) = headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .filter(|s| !s.is_empty())
            {
                ip = real.to_string();
            }
        }
        let user_agent = headers
            .get(header::USER_AGENT)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .chars()
            .take(256)
            .collect::<String>();
        Self { ip, user_agent }
    }

    /// 从 axum Request 提取（连接信息来自 `into_make_service_with_connect_info`）
    pub fn from_request(req: &Request, trust_proxy: bool) -> Self {
        let addr = req
            .extensions()
            .get::<axum::extract::ConnectInfo<SocketAddr>>()
            .map(|c| c.0);
        Self::from_headers(req.headers(), addr, trust_proxy)
    }
}

/* ============================ Cookie ============================ */

/// refresh token 的 Cookie 名（前端只带 Cookie，不接触令牌本体）
pub const REFRESH_COOKIE: &str = "vben_refresh_token";

/// 从请求头解析指定 Cookie
pub fn read_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    for value in headers.get_all(header::COOKIE) {
        let raw = value.to_str().ok()?;
        for part in raw.split(';') {
            let part = part.trim();
            if let Some((k, v)) = part.split_once('=') {
                if k.trim() == name {
                    return Some(v.trim().to_string());
                }
            }
        }
    }
    None
}

/// 构造 refresh token 的 Set-Cookie
///
/// `Path=/api/auth` 限定作用域：只有刷新/退出接口会带上它，减少暴露面。
pub fn refresh_cookie(value: &str, max_age: i64, secure: bool) -> HeaderValue {
    let mut cookie = format!(
        "{name}={value}; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age={max_age}",
        name = REFRESH_COOKIE
    );
    if secure {
        cookie.push_str("; Secure");
    }
    HeaderValue::from_str(&cookie).unwrap_or_else(|_| HeaderValue::from_static(""))
}

/// 构造清除 refresh token 的 Set-Cookie
pub fn clear_refresh_cookie(secure: bool) -> HeaderValue {
    let mut cookie = format!(
        "{name}=; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=0",
        name = REFRESH_COOKIE
    );
    if secure {
        cookie.push_str("; Secure");
    }
    HeaderValue::from_str(&cookie).unwrap_or_else(|_| HeaderValue::from_static(""))
}

/* ============================ 安全响应头 ============================ */

/// 全局安全响应头中间件
///
/// - `nosniff`：禁止浏览器猜 MIME（配合 JSON 响应可阻断 XSS 载荷解释）
/// - `DENY`：禁止被 iframe 嵌套（防点击劫持）
/// - 严格 CSP：本服务只出 JSON，不需要任何资源加载能力
/// - `no-referrer`：不向第三方泄露路径
/// - 认证接口一律 `no-store`，避免令牌/用户信息被缓存
pub async fn security_headers(req: Request, next: Next) -> Response {
    let path = req.uri().path().to_string();
    let mut response = next.run(req).await;
    let headers = response.headers_mut();

    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::X_FRAME_OPTIONS,
        HeaderValue::from_static("DENY"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("no-referrer"),
    );
    headers.insert(
        HeaderName::from_static("content-security-policy"),
        HeaderValue::from_static("default-src 'none'; frame-ancestors 'none'; base-uri 'none'"),
    );
    headers.insert(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static("geolocation=(), microphone=(), camera=()"),
    );
    // API 响应统一不允许被中间层缓存
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store, no-cache, must-revalidate, private"),
    );

    // 认证类接口额外加 Pragma/Expires，兼容老代理
    if path.starts_with("/api/auth") {
        headers.insert(header::PRAGMA, HeaderValue::from_static("no-cache"));
    }

    response
}

/// 429 响应（带 Retry-After）
pub fn too_many_requests(retry_after: i64, message: &str) -> Response {
    let body = serde_json::json!({
        "code": -1,
        "data": null,
        "error": message,
        "message": message,
    });
    (
        StatusCode::TOO_MANY_REQUESTS,
        [(header::RETRY_AFTER, retry_after.max(1).to_string())],
        axum::Json(body),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn password_policy_rejects_weak() {
        assert!(validate_password_policy("12345678").is_err()); // 无字母
        assert!(validate_password_policy("abcdefgh").is_err()); // 无数字
        assert!(validate_password_policy("abc123").is_err()); // 太短
        assert!(validate_password_policy(&"a".repeat(80)).is_err()); // 太长
        assert!(validate_password_policy("abc12345").is_ok());
    }

    #[test]
    fn hash_is_not_plaintext_and_verifies() {
        let hash = hash_password("abc12345").unwrap();
        assert!(!hash.contains("abc12345"));
        assert!(hash.starts_with("$argon2"));
        assert!(verify_password("abc12345", &hash));
        assert!(!verify_password("abc12346", &hash));
    }

    #[test]
    fn refresh_token_shape() {
        let (raw, selector, hash) = new_refresh_token();
        assert!(raw.starts_with(&selector));
        assert_ne!(selector, hash);
        let (s, v) = split_refresh_token(&raw).expect("valid token");
        assert_eq!(s, selector);
        assert_eq!(v.len(), 64);
        assert!(split_refresh_token("bad").is_none());
        assert!(split_refresh_token("0011.22").is_none());
    }

    #[test]
    fn rate_limiter_blocks_after_limit() {
        let limiter = RateLimiter::new();
        for _ in 0..3 {
            assert!(limiter.check("k", 3, 60).is_ok());
        }
        assert!(limiter.check("k", 3, 60).is_err());
        assert!(limiter.check("other", 3, 60).is_ok());
    }

    #[test]
    fn cookie_parser_picks_named_value() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            HeaderValue::from_static("a=1; vben_refresh_token=abc.def; b=2"),
        );
        assert_eq!(
            read_cookie(&headers, REFRESH_COOKIE).as_deref(),
            Some("abc.def")
        );
        assert_eq!(read_cookie(&headers, "missing"), None);
    }
}
