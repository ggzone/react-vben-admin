//! 用户路由 —— 当前登录用户信息

use std::sync::Arc;

use axum::extract::{Extension, Json, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Deserialize;

use crate::auth::CurrentUser;
use crate::db::security_repo;
use crate::db::user_repo;
use crate::error::AppError;
use crate::response::R;
use crate::security::{validate_password_policy, ClientInfo};
use crate::state::AppState;

/// 用户路由（挂在 `/api/user` 下）
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/info", get(info))
        .route("/password", axum::routing::put(change_password))
}

/// GET /api/user/info
async fn info(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
) -> Result<Response, AppError> {
    let user = user_repo::find_user_by_id(&state.pool, current.id)
        .await?
        .ok_or_else(|| AppError::unauthorized("用户不存在"))?;
    let mut info = user_repo::load_user_info(&state.pool, &user).await?;
    // 按钮级权限码：super 短路为全部；其余按角色映射
    info.access_codes = crate::auth::load_permissions(&state, &current).await?;
    Ok(axum::Json(R::ok(info)).into_response())
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub new_password: Option<String>,
    pub old_password: Option<String>,
}

/// PUT /api/user/password —— 修改当前用户密码
///
/// 改密成功后令牌版本 +1，已签发的 accessToken 与其他设备的会话全部失效。
async fn change_password(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<ChangePasswordRequest>,
) -> Result<Response, AppError> {
    let old = body.old_password.unwrap_or_default();
    let new = body.new_password.unwrap_or_default();

    if old.is_empty() || new.is_empty() {
        return Err(AppError::bad_request("原密码与新密码不能为空"));
    }
    // 新密码必须满足强度策略
    validate_password_policy(&new)?;
    if old == new {
        return Err(AppError::bad_request("新密码不能与原密码相同"));
    }

    let user = user_repo::find_user_by_id(&state.pool, current.id)
        .await?
        .ok_or_else(|| AppError::unauthorized("用户不存在"))?;

    if !crate::security::verify_password(&old, &user.password) {
        crate::db::audit::write(
            &state.pool,
            crate::db::audit::AuditEntry {
                action: "change_password".into(),
                detail: "old password mismatch".into(),
                ip: client.ip.clone(),
                method: "PUT".into(),
                path: "/api/user/password".into(),
                resource: "user".into(),
                resource_id: current.id.to_string(),
                status: 403,
                success: false,
                user_agent: client.user_agent.clone(),
                user_id: current.id,
                username: current.username.clone(),
            },
        )
        .await;
        return Err(AppError::forbidden("原密码不正确"));
    }

    let hash = crate::security::hash_password(&new)?;
    user_repo::update_password(&state.pool, current.id, &hash).await?;
    // 吊销其他设备的 refresh token
    let _ = security_repo::revoke_all_refresh_tokens(&state.pool, current.id).await;

    crate::db::audit::write(
        &state.pool,
        crate::db::audit::AuditEntry {
            action: "change_password".into(),
            ip: client.ip.clone(),
            method: "PUT".into(),
            path: "/api/user/password".into(),
            resource: "user".into(),
            resource_id: current.id.to_string(),
            status: 200,
            success: true,
            user_agent: client.user_agent.clone(),
            user_id: current.id,
            username: current.username.clone(),
            ..Default::default()
        },
    )
    .await;

    Ok(axum::Json(R::ok(())).into_response())
}
