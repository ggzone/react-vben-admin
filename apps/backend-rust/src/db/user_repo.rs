//! 用户数据访问 —— 所有 SQL 集中于此层
//!
//! 设计说明：
//! - 使用运行时查询（`query_as` + `FromRow`），不依赖编译期数据库，
//!   全新环境 `cargo build` 无需先建库。
//! - 切换数据库时的边界：SQLite 使用 `?` 占位符；Postgres 改为 `$1, $2 ...`，
//!   返回值结构保持不变（FromRow 对两种驱动均适用）。
//! - 所有查询一律参数化，任何用户输入都不拼接进 SQL（防注入）。

use sqlx::SqlitePool;

use super::models::{SystemUser, UserInfo};
use crate::error::AppError;

/// 用户行的完整列清单（与 `SystemUser` 字段一一对应）
const USER_COLUMNS: &str = r#"id, username, password, real_name, avatar, home_path, status,
    gender, dept_id, email, phone, token_version, password_updated_at, last_login_at,
    last_login_ip, created_at"#;

/// 按用户名查询用户
pub async fn find_user_by_username(
    pool: &SqlitePool,
    username: &str,
) -> Result<Option<SystemUser>, AppError> {
    let sql = format!("SELECT {USER_COLUMNS} FROM system_user WHERE username = ?");
    let user = sqlx::query_as::<_, SystemUser>(&sql)
        .bind(username)
        .fetch_optional(pool)
        .await?;
    Ok(user)
}

/// 按 ID 查询用户
pub async fn find_user_by_id(pool: &SqlitePool, id: i64) -> Result<Option<SystemUser>, AppError> {
    let sql = format!("SELECT {USER_COLUMNS} FROM system_user WHERE id = ?");
    let user = sqlx::query_as::<_, SystemUser>(&sql)
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(user)
}

/// 查询用户的角色标识列表（如 ["super"]）
pub async fn find_roles_by_user_id(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<String>, AppError> {
    let roles = sqlx::query_scalar(
        r#"SELECT r.code FROM system_role r
           JOIN system_user_role ur ON ur.role_id = r.id
           WHERE ur.user_id = ? AND r.status = 1"#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(roles)
}

/// 组装 UserInfo（对外结构，camelCase，与前端 `@vben/types` UserInfo 对齐）
pub async fn load_user_info(pool: &SqlitePool, user: &SystemUser) -> Result<UserInfo, AppError> {
    let roles = find_roles_by_user_id(pool, user.id).await?;
    Ok(UserInfo {
        access_codes: Vec::new(),
        avatar: user.avatar.clone(),
        email: user.email.clone(),
        home_path: user.home_path.clone(),
        id: user.id,
        phone: user.phone.clone(),
        real_name: user.real_name.clone(),
        roles,
        username: user.username.clone(),
    })
}

/// 记录登录成功信息（时间 + IP）
pub async fn touch_login(pool: &SqlitePool, user_id: i64, ip: &str) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("UPDATE system_user SET last_login_at = ?, last_login_ip = ? WHERE id = ?")
        .bind(now)
        .bind(ip)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// 令牌版本 +1（令该用户所有已签发 accessToken 立即失效），返回新版本号
pub async fn bump_token_version(pool: &SqlitePool, user_id: i64) -> Result<i64, AppError> {
    let version: i64 = sqlx::query_scalar(
        "UPDATE system_user SET token_version = token_version + 1 WHERE id = ? RETURNING token_version",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    Ok(version)
}

/// 修改密码（同时把令牌版本 +1，强制已登录会话重新认证）
pub async fn update_password(
    pool: &SqlitePool,
    user_id: i64,
    password_hash: &str,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "UPDATE system_user SET password = ?, password_updated_at = ?, token_version = token_version + 1 WHERE id = ?",
    )
    .bind(password_hash)
    .bind(now)
    .bind(user_id)
    .execute(pool)
    .await?;
    Ok(())
}
