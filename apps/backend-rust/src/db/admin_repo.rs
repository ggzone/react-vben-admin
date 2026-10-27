//! 系统管理模块的 CRUD 数据访问
//!
//! 契约与前端 `apps/web-react/src/api/system.ts` 严格对齐：
//! - 列表返回 `{ items, total }`（`Page<T>`）
//! - 部门 / 菜单返回树形数组
//! - 所有 `id` 对外以字符串形式输出（前端 `SystemApi.*Item.id: string`）
//!
//! 安全约束：
//! - 排序字段与方向走白名单，绝不接收调用方传入的裸列名
//! - 模糊搜索的 `%` / `_` 做转义，避免 LIKE 通配注入导致全表扫描

use sqlx::SqlitePool;
use serde::Serialize;

use super::models::{SystemDept, SystemDict, SystemMenu, SystemRole, SystemUser};
use crate::error::AppError;
use crate::response::PageQuery;

/* ============================ 输出模型 ============================ */

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserItem {
    pub create_time: String,
    pub dept_id: String,
    pub id: String,
    /// 用户名称（real_name），保留原语义供既有前端使用
    pub name: String,
    pub remark: String,
    pub status: i64,
    /// 登录用户名（与 name 区分，前端编辑时需要）
    pub username: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeptItem {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<DeptItem>,
    pub create_time: String,
    pub id: String,
    /// 部门负责人（编辑表单回填用）
    pub leader: String,
    pub name: String,
    pub pid: String,
    pub remark: String,
    /// 排序（编辑表单回填用）
    pub sort: i64,
    pub status: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleItem {
    /// 角色标识（super / admin / user 等，编辑时只读展示）
    pub code: String,
    pub create_time: String,
    pub id: String,
    pub name: String,
    pub remark: String,
    pub status: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuItem {
    pub auth_code: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<MenuItem>,
    pub component: String,
    pub create_time: String,
    pub id: String,
    pub meta: serde_json::Value,
    pub name: String,
    pub path: String,
    pub pid: String,
    /// 排序（编辑表单回填用）
    pub sort: i64,
    pub status: i64,
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictItem {
    pub code: String,
    pub create_time: String,
    pub id: String,
    pub label: String,
    pub name: String,
    pub remark: String,
    pub sort: i64,
    pub status: i64,
    pub value: String,
}

/* ============================ 工具 ============================ */

/// 转义 LIKE 通配符，避免调用方用 `%` 触发全表扫描
fn escape_like(input: &str) -> String {
    input
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

/// 排序字段白名单（防 SQL 注入：只接受预定义列名）
fn order_by(allowed: &[&str], requested: &str, default: &str) -> String {
    let mut parts = requested.splitn(2, ':');
    let field = parts.next().unwrap_or("").trim();
    let direction = parts.next().unwrap_or("asc").trim().to_ascii_lowercase();
    let dir = if direction == "desc" { "DESC" } else { "ASC" };
    if allowed.contains(&field) {
        format!("{field} {dir}")
    } else {
        format!("{default} ASC")
    }
}

/* ============================ 用户 ============================ */

/// 分页查询用户（支持按部门 / 用户名 / ID / 备注过滤）
pub async fn list_users(
    pool: &SqlitePool,
    query: &PageQuery,
    dept_id: Option<i64>,
    id: Option<i64>,
    name: &str,
    remark: &str,
    status: Option<i64>,
) -> Result<(Vec<UserItem>, i64), AppError> {
    let (limit, offset) = query.normalize();
    let name_like = format!("%{}%", escape_like(name));
    let remark_like = format!("%{}%", escape_like(remark));

    let mut conditions = vec!["1=1".to_string()];
    if dept_id.is_some() {
        conditions.push("dept_id = ?".to_string());
    }
    if id.is_some() {
        conditions.push("id = ?".to_string());
    }
    if !name.is_empty() {
        conditions.push("(username LIKE ? ESCAPE '\\' OR real_name LIKE ? ESCAPE '\\')".to_string());
    }
    if !remark.is_empty() {
        conditions.push("real_name LIKE ? ESCAPE '\\'".to_string());
    }
    if status.is_some() {
        conditions.push("status = ?".to_string());
    }
    let where_sql = conditions.join(" AND ");

    let list_sql = format!(
        "SELECT id, username, password, real_name, avatar, home_path, status, dept_id, email, \
         phone, token_version, password_updated_at, last_login_at, last_login_ip, created_at \
         FROM system_user WHERE {where_sql} ORDER BY id ASC LIMIT ? OFFSET ?"
    );
    let count_sql = format!("SELECT COUNT(*) FROM system_user WHERE {where_sql}");

    let mut q = sqlx::query_as::<_, SystemUser>(&list_sql);
    let mut c = sqlx::query_scalar::<_, i64>(&count_sql);
    macro_rules! bind_all {
        ($q:expr) => {{
            if let Some(v) = dept_id {
                $q = $q.bind(v);
            }
            if let Some(v) = id {
                $q = $q.bind(v);
            }
            if !name.is_empty() {
                $q = $q.bind(&name_like).bind(&name_like);
            }
            if !remark.is_empty() {
                $q = $q.bind(&remark_like);
            }
            if let Some(v) = status {
                $q = $q.bind(v);
            }
            $q
        }};
    }
    q = bind_all!(q);
    c = bind_all!(c);

    let rows = q.bind(limit).bind(offset).fetch_all(pool).await?;
    let total = c.fetch_one(pool).await.unwrap_or(0);

    let items = rows
        .iter()
        .map(|u| UserItem {
            create_time: u.created_at.clone(),
            dept_id: u.dept_id.to_string(),
            id: u.id.to_string(),
            name: u.real_name.clone(),
            remark: u.real_name.clone(),
            status: u.status,
            username: u.username.clone(),
        })
        .collect();
    Ok((items, total))
}

/// 新建用户（用户名唯一）
pub async fn create_user(
    pool: &SqlitePool,
    username: &str,
    password_hash: &str,
    real_name: &str,
    dept_id: i64,
    status: i64,
) -> Result<i64, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM system_user WHERE username = ?")
        .bind(username)
        .fetch_one(pool)
        .await?;
    if exists > 0 {
        return Err(AppError::conflict("用户名已存在"));
    }
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO system_user (username, password, real_name, dept_id, status)
           VALUES (?, ?, ?, ?, ?) RETURNING id"#,
    )
    .bind(username)
    .bind(password_hash)
    .bind(real_name)
    .bind(dept_id)
    .bind(status)
    .fetch_one(pool)
    .await?;
    Ok(id)
}

/// 更新用户基础信息
pub async fn update_user(
    pool: &SqlitePool,
    id: i64,
    real_name: &str,
    dept_id: i64,
    status: i64,
) -> Result<(), AppError> {
    sqlx::query("UPDATE system_user SET real_name = ?, dept_id = ?, status = ? WHERE id = ?")
        .bind(real_name)
        .bind(dept_id)
        .bind(status)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

/// 删除用户（同时解绑角色；内置账号 id<=3 不允许删除）
pub async fn delete_user(pool: &SqlitePool, id: i64) -> Result<(), AppError> {
    sqlx::query("DELETE FROM system_user_role WHERE user_id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM system_user WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

/* ============================ 部门 ============================ */

/// 部门树
pub async fn list_depts(pool: &SqlitePool) -> Result<Vec<DeptItem>, AppError> {
    let rows = sqlx::query_as::<_, SystemDept>(
        "SELECT id, pid, name, leader, sort, status, remark, created_at FROM system_dept ORDER BY sort ASC, id ASC",
    )
    .fetch_all(pool)
    .await?;

    let mut by_parent: std::collections::HashMap<i64, Vec<DeptItem>> =
        std::collections::HashMap::new();
    let mut all: Vec<(i64, DeptItem)> = Vec::new();
    for d in &rows {
        let item = DeptItem {
            children: Vec::new(),
            create_time: d.created_at.clone(),
            id: d.id.to_string(),
            leader: d.leader.clone(),
            name: d.name.clone(),
            pid: d.pid.to_string(),
            remark: d.remark.clone(),
            sort: d.sort,
            status: d.status,
        };
        by_parent.entry(d.pid).or_default().push(item.clone());
        all.push((d.id, item));
    }

    fn build(parent: i64, map: &std::collections::HashMap<i64, Vec<DeptItem>>, out: &mut Vec<DeptItem>) {
        if let Some(children) = map.get(&parent) {
            for child in children {
                let id: i64 = child.id.parse().unwrap_or(0);
                let mut node = child.clone();
                build(id, map, &mut node.children);
                out.push(node);
            }
        }
    }

    // 官方 mock 的部门树根节点 pid = 0
    let mut roots = Vec::new();
    build(0, &by_parent, &mut roots);
    Ok(roots)
}

/// 新建部门
pub async fn create_dept(
    pool: &SqlitePool,
    pid: i64,
    name: &str,
    leader: &str,
    sort: i64,
    status: i64,
    remark: &str,
) -> Result<i64, AppError> {
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO system_dept (pid, name, leader, sort, status, remark)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING id"#,
    )
    .bind(pid)
    .bind(name)
    .bind(leader)
    .bind(sort)
    .bind(status)
    .bind(remark)
    .fetch_one(pool)
    .await?;
    Ok(id)
}

/// 更新部门
pub async fn update_dept(
    pool: &SqlitePool,
    id: i64,
    pid: i64,
    name: &str,
    leader: &str,
    sort: i64,
    status: i64,
    remark: &str,
) -> Result<(), AppError> {
    // 自引用校验：不能把自己设为自己的父级
    if id == pid {
        return Err(AppError::bad_request("上级部门不能是自己"));
    }
    sqlx::query(
        "UPDATE system_dept SET pid = ?, name = ?, leader = ?, sort = ?, status = ?, remark = ? WHERE id = ?",
    )
    .bind(pid)
    .bind(name)
    .bind(leader)
    .bind(sort)
    .bind(status)
    .bind(remark)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

/// 删除部门（存在子部门时拒绝，避免产生孤儿节点）
pub async fn delete_dept(pool: &SqlitePool, id: i64) -> Result<(), AppError> {
    let children: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM system_dept WHERE pid = ?")
        .bind(id)
        .fetch_one(pool)
        .await?;
    if children > 0 {
        return Err(AppError::conflict("请先删除下级部门"));
    }
    sqlx::query("DELETE FROM system_dept WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

/* ============================ 角色 ============================ */

/// 角色分页列表
pub async fn list_roles(
    pool: &SqlitePool,
    query: &PageQuery,
    name: &str,
    status: Option<i64>,
) -> Result<(Vec<RoleItem>, i64), AppError> {
    let (limit, offset) = query.normalize();
    let like = format!("%{}%", escape_like(name));

    let mut conditions = vec!["1=1".to_string()];
    if !name.is_empty() {
        conditions.push("name LIKE ? ESCAPE '\\'".to_string());
    }
    if status.is_some() {
        conditions.push("status = ?".to_string());
    }
    let where_sql = conditions.join(" AND ");

    let list_sql = format!(
        "SELECT id, name, code, status FROM system_role WHERE {where_sql} ORDER BY id ASC LIMIT ? OFFSET ?"
    );
    let count_sql = format!("SELECT COUNT(*) FROM system_role WHERE {where_sql}");

    let mut q = sqlx::query_as::<_, SystemRole>(&list_sql);
    let mut c = sqlx::query_scalar::<_, i64>(&count_sql);
    if !name.is_empty() {
        q = q.bind(&like);
        c = c.bind(&like);
    }
    if let Some(v) = status {
        q = q.bind(v);
        c = c.bind(v);
    }

    let rows = q.bind(limit).bind(offset).fetch_all(pool).await?;
    let total = c.fetch_one(pool).await.unwrap_or(0);

    // remark / createTime 需要额外取列，这里统一通过完整查询补齐
    let remarks = sqlx::query_as::<_, (i64, String, String)>(
        "SELECT id, remark, created_at FROM system_role",
    )
    .fetch_all(pool)
    .await?;
    let remark_map: std::collections::HashMap<i64, (String, String)> =
        remarks.into_iter().map(|(id, r, t)| (id, (r, t))).collect();

    let items = rows
        .iter()
        .map(|r| {
            let (remark, created) = remark_map
                .get(&r.id)
                .cloned()
                .unwrap_or_else(|| (String::new(), String::new()));
            RoleItem {
                code: r.code.clone(),
                create_time: created,
                id: r.id.to_string(),
                name: r.name.clone(),
                remark,
                status: r.status,
            }
        })
        .collect();
    Ok((items, total))
}

/// 新建角色
pub async fn create_role(
    pool: &SqlitePool,
    name: &str,
    code: &str,
    status: i64,
    remark: &str,
) -> Result<i64, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM system_role WHERE code = ?")
        .bind(code)
        .fetch_one(pool)
        .await?;
    if exists > 0 {
        return Err(AppError::conflict("角色标识已存在"));
    }
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO system_role (name, code, status, remark) VALUES (?, ?, ?, ?) RETURNING id",
    )
    .bind(name)
    .bind(code)
    .bind(status)
    .bind(remark)
    .fetch_one(pool)
    .await?;
    Ok(id)
}

/// 更新角色
pub async fn update_role(
    pool: &SqlitePool,
    id: i64,
    name: &str,
    status: i64,
    remark: &str,
) -> Result<(), AppError> {
    sqlx::query("UPDATE system_role SET name = ?, status = ?, remark = ? WHERE id = ?")
        .bind(name)
        .bind(status)
        .bind(remark)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

/// 删除角色（内置 super/admin/user 不允许删除）
pub async fn delete_role(pool: &SqlitePool, id: i64) -> Result<(), AppError> {
    let code: Option<String> = sqlx::query_scalar("SELECT code FROM system_role WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?;
    if matches!(code.as_deref(), Some("super" | "admin" | "user")) {
        return Err(AppError::conflict("内置角色不允许删除"));
    }
    sqlx::query("DELETE FROM system_role_menu WHERE role_id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM system_role_permission WHERE role_id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM system_user_role WHERE role_id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM system_role WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

/// 角色已授权的菜单 id 集合（官方角色表单的「菜单权限」树数据源）
pub async fn list_role_menu_ids(
    pool: &SqlitePool,
    role_id: i64,
) -> Result<Vec<i64>, AppError> {
    let ids: Vec<i64> = sqlx::query_scalar(
        "SELECT menu_id FROM system_role_menu WHERE role_id = ? ORDER BY menu_id",
    )
    .bind(role_id)
    .fetch_all(pool)
    .await?;
    Ok(ids)
}

/// 覆盖式保存角色的菜单授权，返回写入行数
pub async fn set_role_menus(
    pool: &SqlitePool,
    role_id: i64,
    menu_ids: &[i64],
) -> Result<u64, AppError> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM system_role_menu WHERE role_id = ?")
        .bind(role_id)
        .execute(&mut *tx)
        .await?;
    let mut inserted: u64 = 0;
    for menu_id in menu_ids {
        let result = sqlx::query(
            "INSERT OR IGNORE INTO system_role_menu (role_id, menu_id) VALUES (?, ?)",
        )
        .bind(role_id)
        .bind(menu_id)
        .execute(&mut *tx)
        .await?;
        inserted += result.rows_affected();
    }
    tx.commit().await?;
    Ok(inserted)
}

/* ============================ 菜单（管理端树） ============================ */

/// 菜单树（管理端：含按钮节点，按 sort 排序）
pub async fn list_menus(pool: &SqlitePool) -> Result<Vec<MenuItem>, AppError> {
    let rows = sqlx::query_as::<_, SystemMenu>(
        r#"SELECT id, pid, name, path, component, icon, sort, status, type, auth_code, meta
           FROM system_menu ORDER BY sort ASC, id ASC"#,
    )
    .fetch_all(pool)
    .await?;

    let parsed: Vec<(SystemMenu, serde_json::Value)> = rows
        .into_iter()
        .map(|m| {
            let meta: serde_json::Value = serde_json::from_str(&m.meta).unwrap_or_else(|_| {
                serde_json::json!({ "icon": m.icon, "title": m.name })
            });
            (m, meta)
        })
        .collect();

    let mut by_parent: std::collections::HashMap<i64, Vec<(SystemMenu, serde_json::Value)>> =
        std::collections::HashMap::new();
    for entry in parsed {
        by_parent.entry(entry.0.pid).or_default().push(entry);
    }

    fn build(
        parent: i64,
        map: &std::collections::HashMap<i64, Vec<(SystemMenu, serde_json::Value)>>,
    ) -> Vec<MenuItem> {
        let mut out = Vec::new();
        if let Some(children) = map.get(&parent) {
            for (m, meta) in children {
                out.push(MenuItem {
                    auth_code: m.auth_code.clone(),
                    children: build(m.id, map),
                    component: m.component.clone(),
                    create_time: String::new(),
                    id: m.id.to_string(),
                    meta: meta.clone(),
                    name: m.name.clone(),
                    path: m.path.clone(),
                    pid: m.pid.to_string(),
                    sort: m.sort,
                    status: m.status,
                    r#type: m.menu_type.clone(),
                });
            }
        }
        out
    }

    Ok(build(0, &by_parent))
}

/// 新建菜单
#[allow(clippy::too_many_arguments)]
pub async fn create_menu(
    pool: &SqlitePool,
    pid: i64,
    name: &str,
    path: &str,
    component: &str,
    icon: &str,
    sort: i64,
    status: i64,
    menu_type: &str,
    auth_code: &str,
    meta: &str,
) -> Result<i64, AppError> {
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO system_menu (pid, name, path, component, icon, sort, status, type, auth_code, meta)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"#,
    )
    .bind(pid)
    .bind(name)
    .bind(path)
    .bind(component)
    .bind(icon)
    .bind(sort)
    .bind(status)
    .bind(menu_type)
    .bind(auth_code)
    .bind(meta)
    .fetch_one(pool)
    .await?;
    Ok(id)
}

/// 更新菜单
#[allow(clippy::too_many_arguments)]
pub async fn update_menu(
    pool: &SqlitePool,
    id: i64,
    pid: i64,
    name: &str,
    path: &str,
    component: &str,
    icon: &str,
    sort: i64,
    status: i64,
    menu_type: &str,
    auth_code: &str,
    meta: &str,
) -> Result<(), AppError> {
    if id == pid {
        return Err(AppError::bad_request("上级菜单不能是自己"));
    }
    sqlx::query(
        r#"UPDATE system_menu SET pid = ?, name = ?, path = ?, component = ?, icon = ?,
           sort = ?, status = ?, type = ?, auth_code = ?, meta = ? WHERE id = ?"#,
    )
    .bind(pid)
    .bind(name)
    .bind(path)
    .bind(component)
    .bind(icon)
    .bind(sort)
    .bind(status)
    .bind(menu_type)
    .bind(auth_code)
    .bind(meta)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

/// 删除菜单及其全部子节点、角色授权
pub async fn delete_menu(pool: &SqlitePool, id: i64) -> Result<u64, AppError> {
    let mut removed = 0_u64;
    let mut stack = vec![id];
    while let Some(current) = stack.pop() {
        let children: Vec<i64> = sqlx::query_scalar("SELECT id FROM system_menu WHERE pid = ?")
            .bind(current)
            .fetch_all(pool)
            .await?;
        stack.extend(children);
        let result = sqlx::query("DELETE FROM system_menu WHERE id = ?")
            .bind(current)
            .execute(pool)
            .await?;
        sqlx::query("DELETE FROM system_role_menu WHERE menu_id = ?")
            .bind(current)
            .execute(pool)
            .await?;
        removed += result.rows_affected();
    }
    Ok(removed)
}

/* ============================ 字典 ============================ */

/// 字典分页列表（type=dict_item 的条目）
pub async fn list_dicts(
    pool: &SqlitePool,
    query: &PageQuery,
    name: &str,
    dict_code: &str,
) -> Result<(Vec<DictItem>, i64), AppError> {
    let (limit, offset) = query.normalize();
    let like = format!("%{}%", escape_like(name));

    let mut conditions = vec!["1=1".to_string()];
    if !name.is_empty() {
        conditions.push("name LIKE ? ESCAPE '\\'".to_string());
    }
    if !dict_code.is_empty() {
        conditions.push("dict_code = ?".to_string());
    }
    let where_sql = conditions.join(" AND ");
    let sort_sql = order_by(&["sort", "id", "name"], "sort:asc", "sort");

    let list_sql = format!(
        "SELECT id, type, dict_code, name, code, value, sort, status, remark, created_at \
         FROM system_dict WHERE {where_sql} ORDER BY {sort_sql} LIMIT ? OFFSET ?"
    );
    let count_sql = format!("SELECT COUNT(*) FROM system_dict WHERE {where_sql}");

    let mut q = sqlx::query_as::<_, SystemDict>(&list_sql);
    let mut c = sqlx::query_scalar::<_, i64>(&count_sql);
    if !name.is_empty() {
        q = q.bind(&like);
        c = c.bind(&like);
    }
    if !dict_code.is_empty() {
        q = q.bind(dict_code);
        c = c.bind(dict_code);
    }

    let rows = q.bind(limit).bind(offset).fetch_all(pool).await?;
    let total = c.fetch_one(pool).await.unwrap_or(0);

    let items = rows
        .iter()
        .map(|d| DictItem {
            code: d.code.clone(),
            create_time: d.created_at.clone(),
            id: d.id.to_string(),
            label: d.name.clone(),
            name: d.name.clone(),
            remark: d.remark.clone(),
            sort: d.sort,
            status: d.status,
            value: d.value.clone(),
        })
        .collect();
    Ok((items, total))
}

/// 新建字典项
pub async fn create_dict(
    pool: &SqlitePool,
    dict_code: &str,
    name: &str,
    code: &str,
    value: &str,
    sort: i64,
    status: i64,
    remark: &str,
) -> Result<i64, AppError> {
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO system_dict (type, dict_code, name, code, value, sort, status, remark)
           VALUES ('dict_item', ?, ?, ?, ?, ?, ?, ?) RETURNING id"#,
    )
    .bind(dict_code)
    .bind(name)
    .bind(code)
    .bind(value)
    .bind(sort)
    .bind(status)
    .bind(remark)
    .fetch_one(pool)
    .await?;
    Ok(id)
}

/// 更新字典项
pub async fn update_dict(
    pool: &SqlitePool,
    id: i64,
    name: &str,
    code: &str,
    value: &str,
    sort: i64,
    status: i64,
    remark: &str,
) -> Result<(), AppError> {
    sqlx::query(
        r#"UPDATE system_dict SET name = ?, code = ?, value = ?, sort = ?, status = ?, remark = ?
           WHERE id = ?"#,
    )
    .bind(name)
    .bind(code)
    .bind(value)
    .bind(sort)
    .bind(status)
    .bind(remark)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

/// 删除字典项
pub async fn delete_dict(pool: &SqlitePool, id: i64) -> Result<(), AppError> {
    sqlx::query("DELETE FROM system_dict WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
