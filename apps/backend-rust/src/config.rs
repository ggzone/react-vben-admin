//! 应用配置 —— 从环境变量 / .env 加载
//!
//! 安全相关默认值一律取「保守」侧：
//! - 生产环境必须显式设置 `JWT_SECRET`（默认值启动时会告警）
//! - accessToken 默认 2 小时（而非 7 天），配合 refresh token 轮换
//! - 未显式开启 `TRUST_PROXY` 时不采信 `X-Forwarded-For`（防伪造 IP 绕过限流）

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
    /// accessToken 有效期（分钟）
    pub access_ttl_minutes: i64,
    /// refreshToken 有效期（天）
    pub refresh_ttl_days: i64,
    /// JWT 签发者
    pub jwt_issuer: String,
    /// JWT 受众
    pub jwt_audience: String,
    /// Cookie 是否带 Secure（HTTPS 部署时应为 true）
    pub secure_cookies: bool,
    /// 是否信任反向代理的 X-Forwarded-For
    pub trust_proxy: bool,
    /// 登录失败次数上限（窗口内）
    pub login_max_fail: i64,
    /// 登录失败统计窗口（分钟）
    pub login_window_minutes: i64,
    /// 触发上限后的锁定时长（分钟）
    pub lock_minutes: i64,
    /// 跨域允许的来源列表
    pub cors_allowed_origins: Vec<String>,
    /// 可选：静态资源目录（React dist），用于后端直接托管 SPA
    pub serve_static_dir: Option<PathBuf>,
    /// 种子账号初始密码（仅初始化时使用；生产应改为强密码）
    pub seed_password: String,
}

fn env_i64(key: &str, default: i64) -> i64 {
    std::env::var(key)
        .ok()
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(default)
}

fn env_bool(key: &str, default: bool) -> bool {
    std::env::var(key)
        .ok()
        .map(|v| matches!(v.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(default)
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
            access_ttl_minutes: env_i64("JWT_ACCESS_TTL_MINUTES", 120),
            refresh_ttl_days: env_i64("JWT_REFRESH_TTL_DAYS", 7),
            jwt_audience: std::env::var("JWT_AUDIENCE")
                .unwrap_or_else(|_| "vben-admin".to_string()),
            jwt_issuer: std::env::var("JWT_ISSUER")
                .unwrap_or_else(|_| "vben-backend-rust".to_string()),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "vben-admin-rust-dev-secret-change-me".to_string()),
            secure_cookies: env_bool("SECURE_COOKIES", false),
            trust_proxy: env_bool("TRUST_PROXY", false),
            login_max_fail: env_i64("LOGIN_MAX_FAIL", 5),
            login_window_minutes: env_i64("LOGIN_WINDOW_MINUTES", 15),
            lock_minutes: env_i64("LOGIN_LOCK_MINUTES", 15),
            port: std::env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5330),
            seed_password: std::env::var("SEED_PASSWORD")
                .unwrap_or_else(|_| "123456".to_string()),
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

    /// refreshToken 有效期（秒）
    pub fn refresh_ttl_secs(&self) -> i64 {
        self.refresh_ttl_days * 24 * 3600
    }
}
