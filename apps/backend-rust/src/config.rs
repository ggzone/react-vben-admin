//! 应用配置 —— 从环境变量 / .env 加载

use std::path::PathBuf;

/// 应用配置
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// 监听地址
    pub host: String,
    /// 监听端口
    pub port: u16,
    /// 数据库连接串（默认 SQLite，可切换 Postgres）
    pub database_url: String,
    /// JWT 密钥
    pub jwt_secret: String,
    /// accessToken 有效期（天）
    pub jwt_access_expire_days: i64,
    /// 跨域允许的来源列表
    pub cors_allowed_origins: Vec<String>,
    /// 可选：静态资源目录（React dist），用于后端直接托管 SPA
    pub serve_static_dir: Option<PathBuf>,
}

impl AppConfig {
    /// 从环境变量加载配置（.env 由 dotenvy 提前加载）
    pub fn from_env() -> Self {
        let cors_allowed_origins = std::env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:5667".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let serve_static_dir = std::env::var("SERVE_STATIC_DIR")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .map(PathBuf::from);

        Self {
            cors_allowed_origins,
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite:./data/vben.db?mode=rwc".to_string()),
            host: std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            jwt_access_expire_days: std::env::var("JWT_ACCESS_EXPIRE_DAYS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(7),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "vben-admin-rust-secret-change-me".to_string()),
            port: std::env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5320),
            serve_static_dir,
        }
    }

    /// 监听地址（host:port）
    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    /// 是否使用 SQLite
    pub fn is_sqlite(&self) -> bool {
        self.database_url.starts_with("sqlite:")
    }
}
