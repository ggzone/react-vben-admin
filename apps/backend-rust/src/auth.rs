//! JWT 认证与 RBAC 鉴权
//!
//! 与官方 backend-mock 的差异（安全强化）：
//! - accessToken 只放「身份标识」，角色与权限每次从库里读，避免授予过期权限
//! - 令牌带 `jti` 与 `ver`（token_version）：改密码 / 退出登录 / 检测到 refresh 复用
//!   都会把 `ver` +1，已签发令牌立即失效（无需等自然过期）
//! - 校验 `iss` / `aud` / `typ`，拒绝把 refresh token 当 access token 使用
//! - 用户被禁用（status=0）后，旧令牌立即不可用

use std::sync::Arc;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::HeaderMap;
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::db::security_repo;
use crate::error::AppError;
use crate::security::ClientInfo;
use crate::state::AppState;

/// 令牌类型
pub const TOKEN_TYPE_ACCESS: &str = "access";

/// JWT 配置
#[derive(Debug, Clone)]
pub struct JwtConfig {
    /// 签名密钥
    pub secret: String,
    /// accessToken 有效期（分钟）
    pub access_ttl_minutes: i64,
    /// 签发者
    pub issuer: String,
    /// 受众
    pub audience: String,
}

/// Token 中的声明
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// 用户 ID
    pub sub: String,
    /// 用户名
    pub username: String,
    /// 令牌版本（与 system_user.token_version 比对）
    pub ver: i64,
    /// 令牌唯一标识（便于审计与后续吊销）
    pub jti: String,
    /// 令牌类型（access）
    pub typ: String,
    /// 签发者
    pub iss: String,
    /// 受众
    pub aud: String,
    /// 过期时间（unix 秒）
    pub exp: i64,
    /// 签发时间（unix 秒）
    pub iat: i64,
}

/// JWT 服务
pub struct JwtService {
    config: JwtConfig,
}

impl JwtService {
    pub fn new(config: JwtConfig) -> Arc<Self> {
        Arc::new(Self { config })
    }

    /// accessToken 有效期（秒）
    pub fn access_ttl_secs(&self) -> i64 {
        self.config.access_ttl_minutes * 60
    }

    /// 签发 accessToken，返回 (token, jti, expires_in_secs)
    pub fn create_access_token(
        &self,
        user_id: i64,
        username: &str,
        token_version: i64,
    ) -> Result<(String, String, i64), AppError> {
        let now = chrono::Utc::now().timestamp();
        let ttl = self.access_ttl_secs();
        let claims = Claims {
            aud: self.config.audience.clone(),
            exp: now + ttl,
            iat: now,
            iss: self.config.issuer.clone(),
            jti: crate::security::rand_hex(12),
            sub: user_id.to_string(),
            typ: TOKEN_TYPE_ACCESS.to_string(),
            username: username.to_string(),
            ver: token_version,
        };
        let token = jsonwebtoken::encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(self.config.secret.as_bytes()),
        )
        .map_err(|e| AppError::internal(format!("failed to create token: {e}")))?;
        Ok((token, claims.jti, ttl))
    }

    /// 校验并解析 accessToken（签名 + exp + iss + aud + typ）
    pub fn verify_access_token(&self, token: &str) -> Result<Claims, AppError> {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;
        validation.leeway = 5;
        validation.set_issuer(&[self.config.issuer.as_str()]);
        validation.set_audience(&[self.config.audience.as_str()]);

        let data = jsonwebtoken::decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.config.secret.as_bytes()),
            &validation,
        )?;

        // 令牌类型必须为 access，防止 refresh token 被当成 access token 使用
        if data.claims.typ != TOKEN_TYPE_ACCESS {
            return Err(AppError::unauthorized("Invalid token type"));
        }
        Ok(data.claims)
    }
}

/// 从 `Authorization: Bearer <token>` 取出原始令牌
pub fn bearer_token(headers: &HeaderMap) -> Option<String> {
    let raw = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())?;
    let (scheme, token) = raw.split_once(' ')?;
    if !scheme.eq_ignore_ascii_case("bearer") {
        return None;
    }
    let token = token.trim();
    if token.is_empty() {
        None
    } else {
        Some(token.to_string())
    }
}

/// 当前登录用户（已过库校验）
#[derive(Debug, Clone)]
pub struct CurrentUser {
    pub id: i64,
    pub username: String,
    pub real_name: String,
    pub roles: Vec<String>,
    pub token_version: i64,
    /// 当前令牌 id（审计用）
    pub jti: String,
}

impl CurrentUser {
    /// 是否超级管理员（拥有全部权限）
    pub fn is_super(&self) -> bool {
        self.roles.iter().any(|r| r == "super")
    }
}

impl FromRequestParts<Arc<AppState>> for CurrentUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let token =
            bearer_token(&parts.headers).ok_or_else(|| AppError::unauthorized("Unauthorized"))?;
        let claims = state.jwt.verify_access_token(&token)?;

        let user_id: i64 = claims
            .sub
            .parse()
            .map_err(|_| AppError::unauthorized("Invalid token subject"))?;

        let user = crate::db::user_repo::find_user_by_id(&state.pool, user_id)
            .await?
            .ok_or_else(|| AppError::unauthorized("Unauthorized"))?;

        // 账号被禁用：立即失效
        if user.status != 1 {
            return Err(AppError::forbidden("账号已被禁用，请联系管理员"));
        }

        // 令牌版本校验：改密码 / 退出 / refresh 复用检测后，旧令牌立即失效
        if claims.ver != user.token_version {
            return Err(AppError::unauthorized("Token revoked"));
        }

        let roles = crate::db::user_repo::find_roles_by_user_id(&state.pool, user.id).await?;

        Ok(CurrentUser {
            id: user.id,
            jti: claims.jti,
            real_name: user.real_name,
            roles,
            token_version: user.token_version,
            username: user.username,
        })
    }
}

/// 查询用户的权限码集合（super 直接短路为「全部」）
pub async fn load_permissions(
    state: &AppState,
    user: &CurrentUser,
) -> Result<Vec<String>, AppError> {
    if user.is_super() {
        return security_repo::all_permission_codes(&state.pool).await;
    }
    security_repo::find_permissions_by_user_id(&state.pool, user.id).await
}

/// RBAC 断言：无权限时写审计日志并返回 403
pub async fn ensure_permission(
    state: &AppState,
    user: &CurrentUser,
    client: &ClientInfo,
    code: &str,
) -> Result<(), AppError> {
    if user.is_super() {
        return Ok(());
    }
    let perms = security_repo::find_permissions_by_user_id(&state.pool, user.id).await?;
    if perms.iter().any(|p| p == code) {
        return Ok(());
    }

    crate::db::audit::write(
        &state.pool,
        crate::db::audit::AuditEntry {
            action: "deny".into(),
            detail: format!("缺少权限 {code}"),
            ip: client.ip.clone(),
            method: String::new(),
            path: String::new(),
            resource: code.split(':').nth(1).unwrap_or("api").to_string(),
            resource_id: String::new(),
            status: 403,
            success: false,
            user_agent: client.user_agent.clone(),
            user_id: user.id,
            username: user.username.clone(),
        },
    )
    .await;

    Err(AppError::forbidden("没有权限执行该操作"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn service() -> Arc<JwtService> {
        JwtService::new(JwtConfig {
            access_ttl_minutes: 120,
            audience: "vben-admin".into(),
            issuer: "vben-backend-rust".into(),
            secret: "test-secret".into(),
        })
    }

    #[test]
    fn token_roundtrip() {
        let svc = service();
        let (token, jti, ttl) = svc.create_access_token(7, "vben", 3).unwrap();
        assert!(ttl > 0);
        let claims = svc.verify_access_token(&token).unwrap();
        assert_eq!(claims.sub, "7");
        assert_eq!(claims.username, "vben");
        assert_eq!(claims.ver, 3);
        assert_eq!(claims.jti, jti);
        assert_eq!(claims.typ, TOKEN_TYPE_ACCESS);
    }

    #[test]
    fn tampered_token_rejected() {
        let svc = service();
        let (token, _, _) = svc.create_access_token(1, "a", 0).unwrap();
        let mut tampered = token.clone();
        tampered.push('x');
        assert!(svc.verify_access_token(&tampered).is_err());
    }

    #[test]
    fn other_secret_rejected() {
        let a = service();
        let (token, _, _) = a.create_access_token(1, "a", 0).unwrap();
        let b = JwtService::new(JwtConfig {
            access_ttl_minutes: 120,
            audience: "vben-admin".into(),
            issuer: "vben-backend-rust".into(),
            secret: "another-secret".into(),
        });
        assert!(b.verify_access_token(&token).is_err());
    }

    #[test]
    fn bearer_parsing() {
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::AUTHORIZATION,
            "Bearer abc".parse().unwrap(),
        );
        assert_eq!(bearer_token(&headers).as_deref(), Some("abc"));
        headers.insert(
            axum::http::header::AUTHORIZATION,
            "Basic abc".parse().unwrap(),
        );
        assert_eq!(bearer_token(&headers), None);
    }
}
