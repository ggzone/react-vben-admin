//! 认证路由 —— 登录 / 刷新 / 退出 / 权限码
//!
//! 安全设计（对应 OWASP 相关条目）：
//! - 登录：IP 限流（10 次 / 5 分钟）+ 用户名与 IP 双维度失败锁定（5 次 / 15 分钟）
//! - 统一错误文案「用户名或密码错误」，不泄露账号是否存在
//! - 用户不存在时也跑一次 Argon2（时间均衡，防时序枚举）
//! - refresh token 放在 HttpOnly + SameSite=Strict Cookie；每次刷新都轮换，
//!   检测到旧令牌复用（泄露特征）立即吊销该用户全部会话
//! - 退出登录：吊销全部 refresh token + token_version +1，已签发 accessToken 同步失效

use std::sync::Arc;

use axum::extract::{Extension, Json, State};
use axum::http::header::SET_COOKIE;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Router;
use serde::Deserialize;

use crate::auth::{bearer_token, load_permissions, CurrentUser};
use crate::db::audit::{write, AuditEntry};
use crate::db::models::LoginResult;
use crate::db::{security_repo, user_repo};
use crate::error::AppError;
use crate::response::R;
use crate::security::{
    clear_refresh_cookie, new_refresh_token, read_cookie, refresh_cookie, split_refresh_token,
    verify_password, verify_password_dummy, ClientInfo, REFRESH_COOKIE,
};
use crate::state::AppState;

/// 登录参数
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub password: Option<String>,
    pub username: Option<String>,
}

/// 认证相关路由（挂在 `/api/auth` 下）
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/login", post(login))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
        .route("/codes", get(codes))
}

/// 未来某个时间点（用于 refresh token 过期时间）
fn days_from_now(days: i64) -> String {
    chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(days))
        .unwrap_or_else(chrono::Utc::now)
        .to_rfc3339()
}

/* ============================ 登录 ============================ */

async fn login(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    Json(body): Json<LoginRequest>,
) -> Result<Response, AppError> {
    let username = body.username.unwrap_or_default().trim().to_string();
    let password = body.password.unwrap_or_default();

    // ---- 参数校验 ----
    if username.is_empty() || password.is_empty() {
        return Err(AppError::bad_request("用户名和密码不能为空"));
    }
    // 超长输入先拒绝，避免把超长串喂给 Argon2 造成 CPU DoS
    if username.len() > 64 || password.len() > 256 {
        return Err(AppError::bad_request("用户名或密码长度超出限制"));
    }

    // ---- IP 限流（10 次 / 5 分钟）----
    if let Err(retry_after) = state.limiter.check(&format!("login:ip:{}", client.ip), 10, 300) {
        return Ok(crate::security::too_many_requests(
            retry_after,
            "请求过于频繁，请稍后再试",
        ));
    }

    // ---- 锁定检查（用户名维度 + IP 维度）----
    let cfg = &state.config;
    let locked_user = security_repo::lock_remaining_secs(&state.pool, "user", &username).await?;
    let locked_ip = security_repo::lock_remaining_secs(&state.pool, "ip", &client.ip).await?;
    let locked = locked_user.max(locked_ip);
    if locked > 0 {
        return Ok(crate::security::too_many_requests(
            locked,
            &format!("登录失败次数过多，请 {locked} 秒后重试"),
        ));
    }

    // ---- 查询用户（不存在则走时间均衡的假校验）----
    let user = user_repo::find_user_by_username(&state.pool, &username).await?;
    let password_ok = match &user {
        Some(u) => verify_password(&password, &u.password),
        None => verify_password_dummy(&password),
    };

    if !password_ok {
        // 双维度记失败：用户维度 5 次锁定，IP 维度放宽到 15 次（防 NAT 误伤）
        let _ = security_repo::register_login_failure(
            &state.pool,
            "user",
            &username,
            cfg.login_max_fail,
            cfg.login_window_minutes,
            cfg.lock_minutes,
        )
        .await;
        let _ = security_repo::register_login_failure(
            &state.pool,
            "ip",
            &client.ip,
            cfg.login_max_fail * 3,
            cfg.login_window_minutes,
            cfg.lock_minutes,
        )
        .await;

        write(
            &state.pool,
            AuditEntry {
                action: "login".into(),
                detail: format!("failed for {username}"),
                ip: client.ip.clone(),
                method: "POST".into(),
                path: "/api/auth/login".into(),
                resource: "auth".into(),
                status: 401,
                success: false,
                user_agent: client.user_agent.clone(),
                ..Default::default()
            },
        )
        .await;

        // 统一文案：不区分「用户不存在」与「密码错误」
        return Err(AppError::unauthorized("用户名或密码错误"));
    }

    let user = user.ok_or_else(|| AppError::unauthorized("用户名或密码错误"))?;
    if user.status != 1 {
        return Err(AppError::forbidden("账号已被禁用，请联系管理员"));
    }

    // ---- 登录成功 ----
    let _ = security_repo::clear_login_failures(&state.pool, "user", &username).await;
    let _ = security_repo::clear_login_failures(&state.pool, "ip", &client.ip).await;
    let _ = user_repo::touch_login(&state.pool, user.id, &client.ip).await;

    let (access_token, jti, _) =
        state
            .jwt
            .create_access_token(user.id, &user.username, user.token_version)?;

    let (raw_refresh, selector, verifier_hash) = new_refresh_token();
    security_repo::insert_refresh_token(
        &state.pool,
        &selector,
        &verifier_hash,
        user.id,
        &days_from_now(cfg.refresh_ttl_days),
        &client.ip,
        &client.user_agent,
    )
    .await?;

    let info = user_repo::load_user_info(&state.pool, &user).await?;
    let result = LoginResult {
        access_token,
        user: info,
    };

    write(
        &state.pool,
        AuditEntry {
            action: "login".into(),
            detail: format!("jti={jti}"),
            ip: client.ip.clone(),
            method: "POST".into(),
            path: "/api/auth/login".into(),
            resource: "auth".into(),
            resource_id: user.id.to_string(),
            status: 200,
            success: true,
            user_agent: client.user_agent.clone(),
            user_id: user.id,
            username: user.username.clone(),
        },
    )
    .await;

    let cookie = refresh_cookie(&raw_refresh, cfg.refresh_ttl_days * 24 * 3600, cfg.secure_cookies);
    Ok((
        StatusCode::OK,
        [(SET_COOKIE, cookie)],
        axum::Json(R::ok(result)),
    )
        .into_response())
}

/* ============================ 刷新 ============================ */

const INVALID_SESSION: &str = "登录状态已失效，请重新登录";

async fn refresh(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    if let Err(retry_after) = state
        .limiter
        .check(&format!("refresh:ip:{}", client.ip), 30, 300)
    {
        return Ok(crate::security::too_many_requests(
            retry_after,
            "请求过于频繁，请稍后再试",
        ));
    }

    let raw = read_cookie(&headers, REFRESH_COOKIE).ok_or_else(|| AppError::unauthorized(INVALID_SESSION))?;
    let (selector, verifier) =
        split_refresh_token(&raw).ok_or_else(|| AppError::unauthorized(INVALID_SESSION))?;

    let row = security_repo::find_refresh_token(&state.pool, selector)
        .await?
        .ok_or_else(|| AppError::unauthorized(INVALID_SESSION))?;

    if row.revoked_at.is_some() {
        return Err(AppError::unauthorized(INVALID_SESSION));
    }
    let expires = chrono::DateTime::parse_from_rfc3339(&row.expires_at)
        .map(|t| t.timestamp())
        .unwrap_or(0);
    if expires < chrono::Utc::now().timestamp() {
        let _ = security_repo::revoke_refresh_token(&state.pool, selector).await;
        return Err(AppError::unauthorized(INVALID_SESSION));
    }
    if !verify_password(verifier, &row.verifier) {
        return Err(AppError::unauthorized(INVALID_SESSION));
    }

    // ---- 复用检测：已被替换过的旧令牌再次出现 → 判定令牌泄露 ----
    if row.replaced_by.is_some() {
        let user_id = row.user_id;
        let _ = security_repo::revoke_all_refresh_tokens(&state.pool, user_id).await;
        let _ = user_repo::bump_token_version(&state.pool, user_id).await;

        let username = user_repo::find_user_by_id(&state.pool, user_id)
            .await?
            .map(|u| u.username)
            .unwrap_or_default();
        write(
            &state.pool,
            AuditEntry {
                action: "reuse_detected".into(),
                detail: format!("selector={selector}"),
                ip: client.ip.clone(),
                method: "POST".into(),
                path: "/api/auth/refresh".into(),
                resource: "auth".into(),
                resource_id: user_id.to_string(),
                status: 401,
                success: false,
                user_agent: client.user_agent.clone(),
                user_id,
                username,
            },
        )
        .await;

        return Err(AppError::unauthorized("检测到异常登录，已强制退出，请重新登录"));
    }

    let user = user_repo::find_user_by_id(&state.pool, row.user_id)
        .await?
        .ok_or_else(|| AppError::unauthorized("用户不存在"))?;
    if user.status != 1 {
        return Err(AppError::forbidden("账号已被禁用，请联系管理员"));
    }

    // ---- 轮换 ----
    let (raw_new, new_selector, new_hash) = new_refresh_token();
    security_repo::insert_refresh_token(
        &state.pool,
        &new_selector,
        &new_hash,
        user.id,
        &days_from_now(state.config.refresh_ttl_days),
        &client.ip,
        &client.user_agent,
    )
    .await?;
    security_repo::mark_replaced(&state.pool, selector, &new_selector).await?;

    let (access_token, _jti, _) =
        state
            .jwt
            .create_access_token(user.id, &user.username, user.token_version)?;

    let cookie = refresh_cookie(
        &raw_new,
        state.config.refresh_ttl_days * 24 * 3600,
        state.config.secure_cookies,
    );
    Ok((
        StatusCode::OK,
        [(SET_COOKIE, cookie)],
        axum::Json(R::ok(access_token)),
    )
        .into_response())
}

/* ============================ 退出 ============================ */

async fn logout(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    headers: HeaderMap,
) -> Response {
    // 1) 通过 refresh cookie 定位用户并吊销其全部会话
    if let Some(raw) = read_cookie(&headers, REFRESH_COOKIE) {
        if let Some((selector, _)) = split_refresh_token(&raw) {
            if let Ok(Some(row)) = security_repo::find_refresh_token(&state.pool, selector).await {
                let _ = security_repo::revoke_all_refresh_tokens(&state.pool, row.user_id).await;
                let _ = user_repo::bump_token_version(&state.pool, row.user_id).await;
            }
        }
    }

    // 2) 若请求带 Bearer accessToken，同样把该用户令牌版本 +1
    if let Some(token) = bearer_token(&headers) {
        if let Ok(claims) = state.jwt.verify_access_token(&token) {
            if let Ok(user_id) = claims.sub.parse::<i64>() {
                let _ = user_repo::bump_token_version(&state.pool, user_id).await;
                let _ = security_repo::revoke_all_refresh_tokens(&state.pool, user_id).await;

                write(
                    &state.pool,
                    AuditEntry {
                        action: "logout".into(),
                        ip: client.ip.clone(),
                        method: "POST".into(),
                        path: "/api/auth/logout".into(),
                        resource: "auth".into(),
                        resource_id: user_id.to_string(),
                        status: 200,
                        success: true,
                        user_agent: client.user_agent.clone(),
                        user_id,
                        username: claims.username.clone(),
                        ..Default::default()
                    },
                )
                .await;
            }
        }
    }

    let cookie = clear_refresh_cookie(state.config.secure_cookies);
    (
        StatusCode::OK,
        [(SET_COOKIE, cookie)],
        axum::Json(R::ok(())),
    )
        .into_response()
}

/* ============================ 权限码 ============================ */

async fn codes(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
) -> Result<Response, AppError> {
    let codes = load_permissions(&state, &current).await?;
    Ok(axum::Json(R::ok(codes)).into_response())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn login_request_shape() {
        let v: LoginRequest =
            serde_json::from_str(r#"{"username":"vben","password":"123456"}"#).unwrap();
        assert_eq!(v.username.as_deref(), Some("vben"));
        assert_eq!(v.password.as_deref(), Some("123456"));
    }

    #[test]
    fn refresh_expiry_is_in_future() {
        let s = days_from_now(7);
        let ts = chrono::DateTime::parse_from_rfc3339(&s).unwrap().timestamp();
        assert!(ts > chrono::Utc::now().timestamp());
    }
}
