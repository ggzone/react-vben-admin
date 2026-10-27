//! 应用状态 —— 全局共享的数据库连接池、JWT 服务与限流器

use std::sync::Arc;

use sqlx::SqlitePool;

use crate::auth::JwtService;
use crate::config::AppConfig;
use crate::security::RateLimiter;

/// 应用全局状态
#[derive(Clone)]
pub struct AppState {
    /// 数据库连接池
    ///
    /// 当前为 SQLite；后续切换 Postgres 时仅需将此类型换成
    /// `sqlx::PgPool`（SQL 集中在 repository 层，便于替换）。
    pub pool: SqlitePool,
    /// JWT 服务
    pub jwt: Arc<JwtService>,
    /// 应用配置
    pub config: Arc<AppConfig>,
    /// 进程内限流器（认证类接口的爆破防护）
    pub limiter: Arc<RateLimiter>,
}

impl AppState {
    pub fn new(
        pool: SqlitePool,
        jwt: Arc<JwtService>,
        config: Arc<AppConfig>,
        limiter: Arc<RateLimiter>,
    ) -> Self {
        Self {
            config,
            jwt,
            limiter,
            pool,
        }
    }
}
