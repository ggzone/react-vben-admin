//! 路由装配

pub mod auth;
pub mod menu;
pub mod system;
pub mod user;

use std::sync::Arc;

use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;
use axum::Router;

use crate::security::ClientInfo;
use crate::state::AppState;

/// 把客户端信息（IP / UA）注入请求扩展
///
/// 单独做一层的目的一是让各 handler 不必关心 `ConnectInfo` 的取法，
/// 二是把「是否信任 X-Forwarded-For」这个策略点集中到一处。
pub async fn client_info_layer(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Response {
    let info = ClientInfo::from_request(&req, state.config.trust_proxy);
    req.extensions_mut().insert(info);
    next.run(req).await
}

/// 健康检查（不鉴权，供联调与容器探活）
pub async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "code": 0,
        "data": { "status": "ok" },
        "error": null,
        "message": "ok",
    }))
}

/// `/api` 下的全部业务路由
pub fn api_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", axum::routing::get(health))
        .nest("/auth", auth::router())
        .nest("/user", user::router())
        .nest("/menu", menu::router())
        .nest("/system", system::router())
}
