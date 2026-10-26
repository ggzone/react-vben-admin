//! 用户数据访问 —— 所有 SQL 集中于此层
//!
//! 设计说明：
//! - 使用运行时查询（`query_as` + `FromRow`），不依赖编译期数据库，
//!   全新环境 `cargo build` 无需先建库。
//! - 切换数据库时的边界：SQLite 使用 `?` 占位符；Postgres 改为 `$1, $2 ...`，
//!   返回值结构保持不变（FromRow 对两种驱动均适用）。

use sqlx::SqlitePool;

use super::models::{SystemUser, UserInfo};
use crate::error::AppError;

/// 按用户名查询用户
pub async fn find_user_by_username(
    pool: &SqlitePool,
    username: &str,
) -> Result<Option<SystemUser>, AppError> {
    let user = sqlx::query_as::<_, SystemUser>(
        r#"SELECT id, username, password, real_name, avatar, home_path, status
           FROM system_user WHERE username = ?"#,
    )
    .bind(username)
    .fetch_optional(pool)
    .await?;
    Ok(user)
}

/// 按 ID 查询用户
pub async fn find_user_by_id(pool: &SqlitePool, id: i64) -> Result<Option<SystemUser>, AppError> {
    let user = sqlx::query_as::<_, SystemUser>(
        r#"SELECT id, username, password, real_name, avatar, home_path, status
           FROM system_user WHERE id = ?"#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(user)
}

/// 查询用户的角色标识列表（如 ["super"]）
pub async fn find_roles_by_user_id(pool: &SqlitePool, user_id: i64) -> Result<Vec<String>, AppError> {
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

/// 组装 UserInfo（对外结构）
pub async fn load_user_info(pool: &SqlitePool, user: &SystemUser) -> Result<UserInfo, AppError> {
    let roles = find_roles_by_user_id(pool, user.id).await?;
    Ok(UserInfo {
        home_path: user.home_path.clone(),
        id: user.id,
        real_name: user.real_name.clone(),
        roles,
        username: user.username.clone(),
    })
}
