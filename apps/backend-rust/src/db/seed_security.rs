//! 安全与系统管理模块的种子数据
//!
//! 与业务种子（seed.rs）分开，便于单独重跑。执行时机：001/002 迁移之后、
//! 业务种子之后（依赖已存在的角色 ID）。
//!
//! 内容：
//! 1. 细粒度权限点（`system:*`）+ 角色授权：super 全量、admin 读写不含审计、
//!    user 只读
//! 2. 部门树、字典数据、系统管理菜单（React 端存在的四个页面）

use sqlx::SqlitePool;

use crate::error::AppError;

/// 权限点定义：`(code, name, group)`
const PERMISSIONS: &[(&str, &str, &str)] = &[
    ("system:user:list", "用户查询", "user"),
    ("system:user:create", "用户新建", "user"),
    ("system:user:update", "用户编辑", "user"),
    ("system:user:delete", "用户删除", "user"),
    ("system:role:list", "角色查询", "role"),
    ("system:role:create", "角色新建", "role"),
    ("system:role:update", "角色编辑", "role"),
    ("system:role:delete", "角色删除", "role"),
    ("system:menu:list", "菜单查询", "menu"),
    ("system:menu:create", "菜单新建", "menu"),
    ("system:menu:update", "菜单编辑", "menu"),
    ("system:menu:delete", "菜单删除", "menu"),
    ("system:dept:list", "部门查询", "dept"),
    ("system:dept:create", "部门新建", "dept"),
    ("system:dept:update", "部门编辑", "dept"),
    ("system:dept:delete", "部门删除", "dept"),
    ("system:dict:list", "字典查询", "dict"),
    ("system:dict:create", "字典新建", "dict"),
    ("system:dict:update", "字典编辑", "dict"),
    ("system:dict:delete", "字典删除", "dict"),
    ("system:audit:list", "审计日志查询", "audit"),
];

/// 管理员可持有的权限（不含审计日志）
fn admin_permissions() -> Vec<&'static str> {
    PERMISSIONS
        .iter()
        .filter(|(code, _, _)| !code.starts_with("system:audit"))
        .map(|(code, _, _)| *code)
        .collect()
}

/// 普通用户：**不授予任何系统管理权限**
///
/// 历史实现给普通角色塞了全部 `*:list`，等于让最低权账号能枚举用户/角色/菜单/部门/字典，
/// 属于典型的权限过度授予（OWASP A01）。系统管理是后台运维面，与普通业务用户无关，
/// 这里返回空集；真正需要只读后台的场景请显式新建角色并在后台勾选。
fn user_permissions() -> Vec<&'static str> {
    Vec::new()
}

/// 部门种子：`(name, pid_name_or_empty, leader, sort)`
const DEPTS: &[(&str, &str, &str, i64)] = &[
    ("Vben 科技", "", "Vben", 1),
    ("研发中心", "Vben 科技", "Jack", 1),
    ("前端组", "研发中心", "Tom", 1),
    ("后端组", "研发中心", "Lucy", 2),
    ("市场中心", "Vben 科技", "Anna", 2),
];

/// 字典种子：`(dict_code, name, code, value, sort)`
const DICTS: &[(&str, &str, &str, &str, i64)] = &[
    ("user_status", "启用", "1", "1", 1),
    ("user_status", "停用", "0", "0", 2),
    ("menu_type", "目录", "catalog", "catalog", 1),
    ("menu_type", "菜单", "menu", "menu", 2),
    ("menu_type", "按钮", "button", "button", 3),
];

/// 系统管理菜单种子：`(name, path, component, icon, sort, type, auth_code, meta_json, parent_index)`
/// `parent_index` 为 `usize::MAX` 表示顶层
const SYSTEM_MENUS: &[(
    &str,
    &str,
    &str,
    &str,
    i64,
    &str,
    &str,
    &str,
    usize,
)] = &[
    (
        "System",
        "/system",
        "",
        "carbon:settings",
        900,
        "catalog",
        "",
        r#"{"order": 900, "title": "system.title"}"#,
        usize::MAX,
    ),
    (
        "SystemUser",
        "/system/user",
        "/system/user/list",
        "carbon:user",
        1,
        "menu",
        "system:user:list",
        r#"{"title": "system.user.title"}"#,
        0,
    ),
    (
        "SystemRole",
        "/system/role",
        "/system/role/list",
        "carbon:user-role",
        2,
        "menu",
        "system:role:list",
        r#"{"title": "system.role.title"}"#,
        0,
    ),
    (
        "SystemMenu",
        "/system/menu",
        "/system/menu/list",
        "carbon:menu",
        3,
        "menu",
        "system:menu:list",
        r#"{"title": "system.menu.title"}"#,
        0,
    ),
    (
        "SystemDept",
        "/system/dept",
        "/system/dept/list",
        "carbon:tree-view",
        4,
        "menu",
        "system:dept:list",
        r#"{"title": "system.dept.title"}"#,
        0,
    ),
];

/// 执行安全相关种子化（幂等）
pub async fn seed(pool: &SqlitePool) -> Result<(), AppError> {
    seed_permissions(pool).await?;
    seed_depts(pool).await?;
    seed_dicts(pool).await?;
    seed_system_menus(pool).await?;
    Ok(())
}

/* ============================ 权限点 ============================ */

async fn seed_permissions(pool: &SqlitePool) -> Result<(), AppError> {
    for (code, name, group) in PERMISSIONS {
        sqlx::query(
            r#"INSERT INTO system_permission (code, name, group_name) VALUES (?, ?, ?)
               ON CONFLICT(code) DO UPDATE SET name = excluded.name"#,
        )
        .bind(*code)
        .bind(*name)
        .bind(*group)
        .execute(pool)
        .await?;
    }

    // 角色授权：super 全量
    let super_id: Option<i64> = sqlx::query_scalar("SELECT id FROM system_role WHERE code = 'super'")
        .fetch_optional(pool)
        .await?;
    let admin_id: Option<i64> = sqlx::query_scalar("SELECT id FROM system_role WHERE code = 'admin'")
        .fetch_optional(pool)
        .await?;
    let user_id: Option<i64> = sqlx::query_scalar("SELECT id FROM system_role WHERE code = 'user'")
        .fetch_optional(pool)
        .await?;

    if let Some(role_id) = super_id {
        for (code, _, _) in PERMISSIONS {
            sqlx::query(
                "INSERT OR IGNORE INTO system_role_permission (role_id, permission) VALUES (?, ?)",
            )
            .bind(role_id)
            .bind(*code)
            .execute(pool)
            .await?;
        }
    }
    if let Some(role_id) = admin_id {
        for code in admin_permissions() {
            sqlx::query(
                "INSERT OR IGNORE INTO system_role_permission (role_id, permission) VALUES (?, ?)",
            )
            .bind(role_id)
            .bind(code)
            .execute(pool)
            .await?;
        }
    }
    if let Some(role_id) = user_id {
        for code in user_permissions() {
            sqlx::query(
                "INSERT OR IGNORE INTO system_role_permission (role_id, permission) VALUES (?, ?)",
            )
            .bind(role_id)
            .bind(code)
            .execute(pool)
            .await?;
        }
    }
    Ok(())
}

/* ============================ 部门 ============================ */

async fn seed_depts(pool: &SqlitePool) -> Result<(), AppError> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM system_dept")
        .fetch_one(pool)
        .await?;
    if count > 0 {
        return Ok(());
    }

    // 按序插入，父节点先行
    let mut id_by_name: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for (name, parent, leader, sort) in DEPTS {
        let pid = if parent.is_empty() {
            0
        } else {
            id_by_name.get(*parent).copied().unwrap_or(0)
        };
        let id: i64 = sqlx::query_scalar(
            "INSERT INTO system_dept (pid, name, leader, sort, status) VALUES (?, ?, ?, ?, 1) RETURNING id",
        )
        .bind(pid)
        .bind(*name)
        .bind(*leader)
        .bind(*sort)
        .fetch_one(pool)
        .await?;
        id_by_name.insert((*name).to_string(), id);
    }

    // 把种子账号挂到对应部门（vben→研发中心，admin→市场中心，jack→前端组）
    let mapping: &[(&str, &str)] = &[
        ("vben", "研发中心"),
        ("admin", "市场中心"),
        ("jack", "前端组"),
    ];
    for (username, dept_name) in mapping {
        if let Some(dept_id) = id_by_name.get(*dept_name) {
            sqlx::query("UPDATE system_user SET dept_id = ? WHERE username = ?")
                .bind(*dept_id)
                .bind(*username)
                .execute(pool)
                .await?;
        }
    }
    Ok(())
}

/* ============================ 字典 ============================ */

async fn seed_dicts(pool: &SqlitePool) -> Result<(), AppError> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM system_dict")
        .fetch_one(pool)
        .await?;
    if count > 0 {
        return Ok(());
    }
    for (dict_code, name, code, value, sort) in DICTS {
        sqlx::query(
            r#"INSERT INTO system_dict (type, dict_code, name, code, value, sort, status)
               VALUES ('dict_item', ?, ?, ?, ?, ?, 1)"#,
        )
        .bind(*dict_code)
        .bind(*name)
        .bind(*code)
        .bind(*value)
        .bind(*sort)
        .execute(pool)
        .await?;
    }
    Ok(())
}

/* ============================ 系统管理菜单 ============================ */

async fn seed_system_menus(pool: &SqlitePool) -> Result<(), AppError> {
    // 已存在同名根节点则跳过（幂等）
    let exists: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM system_menu WHERE name = 'System'")
            .fetch_one(pool)
            .await?;
    if exists > 0 {
        return Ok(());
    }

    let mut inserted: Vec<i64> = Vec::new();
    for (name, path, component, icon, sort, menu_type, auth_code, meta, parent_index) in
        SYSTEM_MENUS
    {
        let pid = if *parent_index == usize::MAX {
            0
        } else {
            inserted.get(*parent_index).copied().unwrap_or(0)
        };
        let id: i64 = sqlx::query_scalar(
            r#"INSERT INTO system_menu (pid, name, path, component, icon, sort, status, type, auth_code, meta)
               VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?) RETURNING id"#,
        )
        .bind(pid)
        .bind(*name)
        .bind(*path)
        .bind(*component)
        .bind(*icon)
        .bind(*sort)
        .bind(*menu_type)
        .bind(*auth_code)
        .bind(*meta)
        .fetch_one(pool)
        .await?;
        inserted.push(id);
    }

    // 授权给 super / admin / user 三个角色（user 只给「用户管理」只读入口，
    // 与官方 mock 的「不同角色看到不同菜单」行为保持一致）
    let super_id: Option<i64> = sqlx::query_scalar("SELECT id FROM system_role WHERE code = 'super'")
        .fetch_optional(pool)
        .await?;
    let admin_id: Option<i64> = sqlx::query_scalar("SELECT id FROM system_role WHERE code = 'admin'")
        .fetch_optional(pool)
        .await?;
    let user_id: Option<i64> = sqlx::query_scalar("SELECT id FROM system_role WHERE code = 'user'")
        .fetch_optional(pool)
        .await?;

    for (index, menu_id) in inserted.iter().enumerate() {
        if let Some(role_id) = super_id {
            sqlx::query("INSERT OR IGNORE INTO system_role_menu (role_id, menu_id) VALUES (?, ?)")
                .bind(role_id)
                .bind(*menu_id)
                .execute(pool)
                .await?;
        }
        if let Some(role_id) = admin_id {
            sqlx::query("INSERT OR IGNORE INTO system_role_menu (role_id, menu_id) VALUES (?, ?)")
                .bind(role_id)
                .bind(*menu_id)
                .execute(pool)
                .await?;
        }
        // 普通用户：不授予任何系统管理菜单
        //
        // 官方 mock 会让 user 角色也能看到「系统管理 > 用户管理」入口，但后端并不校验权限，
        // 于是低权账号能直接读到全量用户数据。这里按最小权限收紧：菜单可见性必须与
        // 权限码一致，否则「看得见但点开 403」既是信息泄露也是糟糕体验。
        let _ = (&user_id, index);
    }
    Ok(())
}
