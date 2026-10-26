//! 菜单与权限码数据访问

use sqlx::SqlitePool;

use super::models::SystemMenu;
use crate::error::AppError;

/// 查询用户角色可见的菜单（不含按钮级权限节点）
pub async fn find_menus_by_user_id(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<SystemMenu>, AppError> {
    let menus = sqlx::query_as::<_, SystemMenu>(
        r#"SELECT m.id, m.pid, m.name, m.path, m.component, m.icon, m.sort,
                  m.status, m.type, m.auth_code, m.meta
           FROM system_menu m
           JOIN system_role_menu rm ON rm.menu_id = m.id
           JOIN system_user_role ur ON ur.role_id = rm.role_id
           WHERE ur.user_id = ? AND m.status = 1 AND m.type != 'button'
           ORDER BY m.sort ASC, m.id ASC"#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(menus)
}

/// 查询用户的按钮级权限码（对应官方 GET /auth/codes）
pub async fn find_access_codes_by_user_id(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<String>, AppError> {
    let codes = sqlx::query_scalar(
        r#"SELECT DISTINCT m.auth_code FROM system_menu m
           JOIN system_role_menu rm ON rm.menu_id = m.id
           JOIN system_user_role ur ON ur.role_id = rm.role_id
           WHERE ur.user_id = ? AND m.type = 'button' AND m.auth_code != ''
           ORDER BY m.auth_code ASC"#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(codes)
}
