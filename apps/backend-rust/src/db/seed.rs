//! 种子数据 —— 与官方 apps/backend-mock 的 mock 数据 1:1 对齐
//!
//! 账号：vben / admin / jack，密码均为 123456（argon2 哈希存储）
//! 菜单：Dashboard + Demos（按角色可见性区分）
//! 权限码：与官方 MOCK_CODES 完全一致

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHasher};
use sqlx::SqlitePool;

use crate::error::AppError;

/// 密码哈希（argon2id，默认参数）
pub fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::internal(format!("failed to hash password: {e}")))?;
    Ok(hash.to_string())
}

/// 校验密码
pub fn verify_password(password: &str, password_hash: &str) -> Result<bool, AppError> {
    use argon2::PasswordVerifier;
    let parsed = argon2::PasswordHash::new(password_hash)
        .map_err(|e| AppError::internal(format!("invalid password hash: {e}")))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

/// 菜单种子节点
struct MenuSeed {
    name: String,
    path: String,
    component: String,
    icon: String,
    sort: i64,
    /// catalog / menu / button
    menu_type: String,
    auth_code: String,
    /// meta JSON 字符串（camelCase，与前端 MenuRecordRaw.meta 对齐）
    meta: String,
    children: Vec<MenuSeed>,
}

/// 官方 mock 的 Dashboard 菜单树
fn dashboard_menus() -> MenuSeed {
    MenuSeed {
        auth_code: String::new(),
        children: vec![
            MenuSeed {
                auth_code: String::new(),
                children: vec![],
                component: "/dashboard/analytics/index".into(),
                icon: String::new(),
                meta: r#"{"affixTab": true, "title": "page.dashboard.analytics"}"#.into(),
                menu_type: "menu".into(),
                name: "Analytics".into(),
                path: "/analytics".into(),
                sort: 1,
            },
            MenuSeed {
                auth_code: String::new(),
                children: vec![],
                component: "/dashboard/workspace/index".into(),
                icon: String::new(),
                meta: r#"{"title": "page.dashboard.workspace"}"#.into(),
                menu_type: "menu".into(),
                name: "Workspace".into(),
                path: "/workspace".into(),
                sort: 2,
            },
        ],
        component: String::new(),
        icon: String::new(),
        meta: r#"{"order": -1, "title": "page.dashboard.title"}"#.into(),
        menu_type: "catalog".into(),
        name: "Dashboard".into(),
        path: "/dashboard".into(),
        sort: -1,
    }
}

/// 官方 mock 的 Demos 菜单树（按角色注入对应可见性节点）
fn demos_menus(role: &str) -> MenuSeed {
    MenuSeed {
        auth_code: String::new(),
        children: vec![
            MenuSeed {
                auth_code: String::new(),
                children: vec![
                    MenuSeed {
                        auth_code: String::new(),
                        children: vec![],
                        component: "/demos/access/index".into(),
                        icon: "mdi:page-previous-outline".into(),
                        meta: r#"{"title": "demos.access.pageAccess"}"#.into(),
                        menu_type: "menu".into(),
                        name: "AccessPageControlDemo".into(),
                        path: "/demos/access/page-control".into(),
                        sort: 1,
                    },
                    MenuSeed {
                        auth_code: String::new(),
                        children: vec![],
                        component: "/demos/access/button-control".into(),
                        icon: "mdi:button-cursor".into(),
                        meta: r#"{"title": "demos.access.buttonControl"}"#.into(),
                        menu_type: "menu".into(),
                        name: "AccessButtonControlDemo".into(),
                        path: "/demos/access/button-control".into(),
                        sort: 2,
                    },
                    MenuSeed {
                        auth_code: String::new(),
                        children: vec![],
                        component: "/demos/access/menu-visible-403".into(),
                        icon: "mdi:button-cursor".into(),
                        meta: r#"{"authority": ["no-body"], "menuVisibleWithForbidden": true, "title": "demos.access.menuVisible403"}"#.into(),
                        menu_type: "menu".into(),
                        name: "AccessMenuVisible403Demo".into(),
                        path: "/demos/access/menu-visible-403".into(),
                        sort: 3,
                    },
                    MenuSeed {
                        auth_code: String::new(),
                        children: vec![],
                        component: format!("/demos/access/{role}-visible"),
                        icon: "mdi:button-cursor".into(),
                        meta: format!(r#"{{"title": "demos.access.{role}Visible"}}"#),
                        menu_type: "menu".into(),
                        name: format!("Access{}VisibleDemo", capitalize(role)),
                        path: format!("/demos/access/{role}-visible"),
                        sort: 4,
                    },
                ],
                component: String::new(),
                icon: "mdi:cloud-key-outline".into(),
                meta: r#"{"title": "demos.access.backendPermissions"}"#.into(),
                menu_type: "catalog".into(),
                name: "AccessDemos".into(),
                path: "/demosaccess".into(),
                sort: 1,
            },
        ],
        component: String::new(),
        icon: "ic:baseline-view-in-ar".into(),
        meta: r#"{"icon": "ic:baseline-view-in-ar", "keepAlive": true, "order": 1000, "title": "demos.title"}"#.into(),
        menu_type: "catalog".into(),
        name: "Demos".into(),
        path: "/demos".into(),
        sort: 1000,
    }
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
        None => String::new(),
    }
}

/// 递归插入菜单，返回根节点 ID
async fn insert_menu(pool: &SqlitePool, menu: &MenuSeed) -> Result<i64, AppError> {
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO system_menu
             (pid, name, path, component, icon, sort, type, auth_code, meta)
           VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING id"#,
    )
    .bind(&menu.name)
    .bind(&menu.path)
    .bind(&menu.component)
    .bind(&menu.icon)
    .bind(menu.sort)
    .bind(&menu.menu_type)
    .bind(&menu.auth_code)
    .bind(&menu.meta)
    .fetch_one(pool)
    .await?;

    for child in &menu.children {
        let child_id: i64 = sqlx::query_scalar(
            r#"INSERT INTO system_menu
                 (pid, name, path, component, icon, sort, type, auth_code, meta)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               RETURNING id"#,
        )
        .bind(id)
        .bind(&child.name)
        .bind(&child.path)
        .bind(&child.component)
        .bind(&child.icon)
        .bind(child.sort)
        .bind(&child.menu_type)
        .bind(&child.auth_code)
        .bind(&child.meta)
        .fetch_one(pool)
        .await?;
        insert_menu_children(pool, child_id, child).await?;
    }
    Ok(id)
}

/// 递归插入子菜单
async fn insert_menu_children(pool: &SqlitePool, parent_id: i64, menu: &MenuSeed) -> Result<(), AppError> {
    for child in &menu.children {
        let child_id: i64 = sqlx::query_scalar(
            r#"INSERT INTO system_menu
                 (pid, name, path, component, icon, sort, type, auth_code, meta)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               RETURNING id"#,
        )
        .bind(parent_id)
        .bind(&child.name)
        .bind(&child.path)
        .bind(&child.component)
        .bind(&child.icon)
        .bind(child.sort)
        .bind(&child.menu_type)
        .bind(&child.auth_code)
        .bind(&child.meta)
        .fetch_one(pool)
        .await?;
        Box::pin(insert_menu_children(pool, child_id, child)).await?;
    }
    Ok(())
}

/// 插入按钮级权限节点（对应官方 MOCK_CODES）
async fn insert_button_codes(pool: &SqlitePool, codes: &[&str]) -> Result<Vec<i64>, AppError> {
    let mut ids = Vec::new();
    for code in codes {
        let id: i64 = sqlx::query_scalar(
            r#"INSERT INTO system_menu
                 (pid, name, path, component, icon, sort, type, auth_code, meta)
               VALUES (0, ?, '', '', '', 0, 'button', ?, ?)
               RETURNING id"#,
        )
        .bind(format!("Button:{code}"))
        .bind(*code)
        .bind(format!(r#"{{"title": "{code}"}}"#))
        .fetch_one(pool)
        .await?;
        ids.push(id);
    }
    Ok(ids)
}

/// 判断是否需要种子化（用户表为空）
pub async fn needs_seed(pool: &SqlitePool) -> Result<bool, AppError> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM system_user")
        .fetch_one(pool)
        .await?;
    Ok(count == 0)
}

/// 执行种子化（幂等：仅在空库时执行）
pub async fn seed(pool: &SqlitePool) -> Result<(), AppError> {
    if !needs_seed(pool).await? {
        tracing::info!("database already seeded, skip");
        return Ok(());
    }

    tracing::info!("seeding database...");

    // ---- 角色 ----
    let super_role_id: i64 = sqlx::query_scalar(
        "INSERT INTO system_role (name, code, remark) VALUES ('超级管理员', 'super', '拥有所有权限') RETURNING id",
    )
    .fetch_one(pool)
    .await?;
    let admin_role_id: i64 = sqlx::query_scalar(
        "INSERT INTO system_role (name, code, remark) VALUES ('管理员', 'admin', '拥有部分权限') RETURNING id",
    )
    .fetch_one(pool)
    .await?;
    let user_role_id: i64 = sqlx::query_scalar(
        "INSERT INTO system_role (name, code, remark) VALUES ('普通用户', 'user', '拥有基础权限') RETURNING id",
    )
    .fetch_one(pool)
    .await?;

    // ---- 用户（密码取自 SEED_PASSWORD，默认与官方 mock 一致的 123456）----
    let seed_password = std::env::var("SEED_PASSWORD").unwrap_or_else(|_| "123456".to_string());
    let password_hash = hash_password(&seed_password)?;
    let users = [
        (0_i64, "vben", "Vben", "", super_role_id),
        (1, "admin", "Admin", "/workspace", admin_role_id),
        (2, "jack", "Jack", "/analytics", user_role_id),
    ];
    for (_index, (id, username, real_name, home_path, role_id)) in users.iter().enumerate() {
        // 性别（官方字典 user_gender）：演示数据按用户名给个固定值，避免列表全是「未设置」
        let gender: i64 = if username.contains("e2e") { 2 } else { 1 };
        let user_id: i64 = sqlx::query_scalar(
            r#"INSERT INTO system_user (username, password, real_name, home_path, status, gender)
               VALUES (?, ?, ?, ?, 1, ?) RETURNING id"#,
        )
        .bind(username)
        .bind(&password_hash)
        .bind(real_name)
        .bind(home_path)
        .bind(gender)
        .fetch_one(pool)
        .await?;
        sqlx::query("INSERT INTO system_user_role (user_id, role_id) VALUES (?, ?)")
            .bind(user_id)
            .bind(role_id)
            .execute(pool)
            .await?;
        // 记录 id 仅供日志
        tracing::debug!(user_id, username, "user created");
        let _ = id;
    }

    // ---- 菜单 ----
    // vben(super) / admin / jack(user) 各自持有自己的菜单树（与官方 mock 一致，
    // 每个角色的菜单是独立副本，角色切换可见性节点）
    let menus_for = |role: &str| vec![dashboard_menus(), demos_menus(role)];

    // 超级管理员：Dashboard + Demos(super)
    let mut super_menu_ids = Vec::new();
    for menu in menus_for("super") {
        super_menu_ids.push(insert_menu(pool, &menu).await?);
    }
    // 管理员：Dashboard + Demos(admin)
    let mut admin_menu_ids = Vec::new();
    for menu in menus_for("admin") {
        admin_menu_ids.push(insert_menu(pool, &menu).await?);
    }
    // 普通用户：Dashboard + Demos(user)
    let mut user_menu_ids = Vec::new();
    for menu in menus_for("user") {
        user_menu_ids.push(insert_menu(pool, &menu).await?);
    }

    // ---- 按钮级权限码（与官方 MOCK_CODES 一致）----
    // super: AC_100100, AC_100110, AC_100120, AC_100010
    // admin: AC_100010, AC_100020, AC_100030
    // user:  AC_1000001, AC_1000002
    let super_codes = ["AC_100100", "AC_100110", "AC_100120", "AC_100010"];
    let admin_codes = ["AC_100010", "AC_100020", "AC_100030"];
    let user_codes = ["AC_1000001", "AC_1000002"];

    let super_code_ids = insert_button_codes(pool, &super_codes).await?;
    let admin_code_ids = insert_button_codes(pool, &admin_codes).await?;
    let user_code_ids = insert_button_codes(pool, &user_codes).await?;

    // ---- 角色-菜单关联 ----
    for menu_id in super_menu_ids.iter().chain(super_code_ids.iter()) {
        sqlx::query("INSERT OR IGNORE INTO system_role_menu (role_id, menu_id) VALUES (?, ?)")
            .bind(super_role_id)
            .bind(menu_id)
            .execute(pool)
            .await?;
    }
    for menu_id in admin_menu_ids.iter().chain(admin_code_ids.iter()) {
        sqlx::query("INSERT OR IGNORE INTO system_role_menu (role_id, menu_id) VALUES (?, ?)")
            .bind(admin_role_id)
            .bind(menu_id)
            .execute(pool)
            .await?;
    }
    for menu_id in user_menu_ids.iter().chain(user_code_ids.iter()) {
        sqlx::query("INSERT OR IGNORE INTO system_role_menu (role_id, menu_id) VALUES (?, ?)")
            .bind(user_role_id)
            .bind(menu_id)
            .execute(pool)
            .await?;
    }

    tracing::info!("database seeded successfully");
    Ok(())
}
