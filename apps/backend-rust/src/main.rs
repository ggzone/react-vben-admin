//! Vben Admin React 版 Rust 后端
//!
//! 技术栈：axum + sqlx(SQLite) + jsonwebtoken + Argon2
//! 设计原则：**安全优先**，所有接口默认鉴权，敏感信息只存哈希，关键动作全部留痕。
//!
//! 启动流程：加载配置 → 建库迁表 → 灌种子 → 装配路由 → 监听

mod auth;
mod config;
mod db;
mod error;
mod response;
mod routes;
mod security;
mod state;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::middleware::from_fn_with_state;
use axum::Router;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::auth::JwtService;
use crate::config::AppConfig;
use crate::security::RateLimiter;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // ---- 配置 ----
    let _ = dotenvy::dotenv();
    let config = Arc::new(AppConfig::from_env());

    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,vben_backend_rust=debug".into()),
        )
        .init();

    if config.jwt_secret.contains("change-me") || config.jwt_secret.len() < 32 {
        tracing::warn!(
            "JWT_SECRET 仍是默认值或过短（<32 字符），生产环境必须通过环境变量设置一个足够长的随机密钥"
        );
    }

    // ---- 数据库 ----
    let pool = init_database(&config).await?;

    // ---- 种子 ----
    db::seed::seed(&pool).await?;
    db::seed_security::seed(&pool).await?;
    // 启动时清一次过期 refresh token，避免表无限增长
    let purged = db::security_repo::purge_expired_refresh_tokens(&pool)
        .await
        .unwrap_or(0);
    if purged > 0 {
        tracing::info!(purged, "purged expired refresh tokens");
    }

    // ---- JWT ----
    let jwt = JwtService::new(crate::auth::JwtConfig {
        access_ttl_minutes: config.access_ttl_minutes,
        audience: config.jwt_audience.clone(),
        issuer: config.jwt_issuer.clone(),
        secret: config.jwt_secret.clone(),
    });

    let state = Arc::new(AppState::new(
        pool,
        jwt,
        config.clone(),
        Arc::new(RateLimiter::new()),
    ));

    // ---- 路由 ----
    let api = routes::api_router()
        .layer(from_fn_with_state(state.clone(), routes::client_info_layer))
        .layer(TraceLayer::new_for_http());

    let mut app = Router::new()
        .nest("/api", api)
        .layer(axum::middleware::from_fn(crate::security::security_headers));

    // 可选：直接托管前端 dist（生产部署用；开发态由 vite dev server 提供）
    if let Some(dir) = &config.serve_static_dir {
        if dir.exists() {
            tracing::info!(dir = %dir.display(), "serving static files");
            app = app.fallback_service(
                tower_http::services::ServeDir::new(dir)
                    .fallback(tower_http::services::ServeFile::new(dir.join("index.html"))),
            );
        } else {
            tracing::warn!(dir = %dir.display(), "SERVE_STATIC_DIR 不存在，已忽略");
        }
    }

    // ---- CORS：仅放行显式配置的来源，不用 any() ----
    let origins = config
        .cors_allowed_origins
        .iter()
        .filter_map(|o| o.parse().ok())
        .collect::<Vec<axum::http::HeaderValue>>();
    let cors = if origins.is_empty() {
        CorsLayer::new().allow_origin(AllowOrigin::exact(
            "http://localhost:5667".parse().unwrap(),
        ))
    } else {
        CorsLayer::new().allow_origin(AllowOrigin::list(origins))
    }
    .allow_credentials(true)
    .allow_headers([
        axum::http::header::AUTHORIZATION,
        axum::http::header::CONTENT_TYPE,
        axum::http::header::ACCEPT,
        axum::http::header::HeaderName::from_static("accept-language"),
    ])
    .allow_methods([
        axum::http::Method::GET,
        axum::http::Method::POST,
        axum::http::Method::PUT,
        axum::http::Method::DELETE,
        axum::http::Method::OPTIONS,
    ]);

    let app = app.layer(cors);

    // 把 Arc<AppState> 固化进路由，得到 Router<()>（axum 只在 Router<()> 上提供
    // into_make_service_with_connect_info，而 ConnectInfo 是取客户端 IP 的前提）
    let app = app.with_state(state);

    let addr: SocketAddr = config.bind_addr().parse()?;
    tracing::info!("backend listening on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

/// 建库 + 执行 migrations
async fn init_database(config: &AppConfig) -> anyhow::Result<sqlx::SqlitePool> {
    // SQLite 的父目录需提前建好（sqlx 只会创建文件，不会创建目录）
    if config.is_sqlite() {
        if let Some(path) = config
            .database_url
            .strip_prefix("sqlite:")
            .and_then(|s| s.split('?').next())
        {
            if let Some(parent) = std::path::Path::new(path).parent() {
                if !parent.as_os_str().is_empty() {
                    std::fs::create_dir_all(parent)?;
                }
            }
        }
    }

    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("database migrated");
    Ok(pool)
}
