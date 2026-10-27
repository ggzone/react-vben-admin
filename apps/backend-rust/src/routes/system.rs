//! 系统管理路由 —— 用户 / 角色 / 菜单 / 部门 / 字典 / 审计日志
//!
//! 鉴权模型：
//! - 读操作要求 `system:<res>:list`，写操作要求 `system:<res>:create|update|delete`
//! - super 角色直接放行（鉴权在 `auth::ensure_permission` 内短路）
//! - 权限不足时写审计日志（`action=deny`）再返回 403
//! - 内置数据（super/admin/user 角色、id<=3 的账号）不允许删除，防止把自己锁死在门外

use std::sync::Arc;

use axum::extract::{Extension, Json, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, post, put};
use axum::Router;
use serde::Deserialize;

use crate::auth::{ensure_permission, CurrentUser};
use crate::db::admin_repo;
use crate::db::audit::{write, AuditEntry};
use crate::error::AppError;
use crate::response::{Page, PageQuery, R};
use crate::security::{hash_password, validate_password_policy, ClientInfo};
use crate::state::AppState;

/// 系统管理路由（挂在 `/api/system` 下）
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        // 用户
        .route("/user/list", get(user_list))
        .route("/user", post(user_create))
        .route("/user", put(user_update))
        .route("/user", delete(user_delete))
        .route("/user/password", put(user_reset_password))
        // 角色
        .route("/role/list", get(role_list))
        .route("/role", post(role_create))
        .route("/role", put(role_update))
        .route("/role", delete(role_delete))
        .route("/role/menu", get(role_menu_get))
        .route("/role/menu", put(role_menu_put))
        // 菜单
        .route("/menu/list", get(menu_list))
        .route("/menu", post(menu_create))
        .route("/menu", put(menu_update))
        .route("/menu", delete(menu_delete))
        // 部门
        .route("/dept/list", get(dept_list))
        .route("/dept", post(dept_create))
        .route("/dept", put(dept_update))
        .route("/dept", delete(dept_delete))
        // 字典
        .route("/dict/list", get(dict_list))
        .route("/dict", post(dict_create))
        .route("/dict", put(dict_update))
        .route("/dict", delete(dict_delete))
        // 审计日志（仅 super）
        .route("/audit/list", get(audit_list))
}

/// 统一的写操作审计
async fn audit(
    state: &AppState,
    client: &ClientInfo,
    current: &CurrentUser,
    action: &str,
    resource: &str,
    resource_id: &str,
    method: &str,
    path: &str,
    success: bool,
    status: i64,
    detail: &str,
) {
    write(
        &state.pool,
        AuditEntry {
            action: action.into(),
            detail: detail.into(),
            ip: client.ip.clone(),
            method: method.into(),
            path: path.into(),
            resource: resource.into(),
            resource_id: resource_id.into(),
            status,
            success,
            user_agent: client.user_agent.clone(),
            user_id: current.id,
            username: current.username.clone(),
        },
    )
    .await;
}

/// 把字符串 ID 解析成 i64（前端 `SystemApi` 的 id 是 string）
fn parse_id(raw: Option<&String>, field: &str) -> Result<i64, AppError> {
    let raw = raw.ok_or_else(|| AppError::bad_request(format!("{field} 不能为空")))?;
    raw.trim()
        .parse::<i64>()
        .map_err(|_| AppError::bad_request(format!("{field} 不是合法的数字")))
}

/* ============================ 用户 ============================ */

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserListQuery {
    /// 前端传 camelCase（deptId / pageSize / …），必须 rename_all = camelCase，
    /// 否则 deptId 收不到 → 部门树点了不过滤（恒返回全部用户）
    pub dept_id: Option<String>,
    pub id: Option<String>,
    pub name: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub remark: Option<String>,
    pub status: Option<String>,
}

async fn user_list(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
    Query(query): Query<UserListQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &ClientInfo::default(), "system:user:list").await?;

    let dept_id = match query.dept_id.as_deref() {
        Some(v) if !v.trim().is_empty() => Some(parse_id(Some(&v.to_string()), "deptId")?),
        _ => None,
    };
    let id = match query.id.as_deref() {
        Some(v) if !v.trim().is_empty() => Some(parse_id(Some(&v.to_string()), "id")?),
        _ => None,
    };
    let status = match query.status.as_deref() {
        Some(v) if !v.trim().is_empty() => Some(parse_id(Some(&v.to_string()), "status")?),
        _ => None,
    };

    let (items, total) = admin_repo::list_users(
        &state.pool,
        &PageQuery { page: query.page, page_size: query.page_size },
        dept_id,
        id,
        query.name.as_deref().unwrap_or(""),
        query.remark.as_deref().unwrap_or(""),
        status,
    )
    .await?;
    Ok(axum::Json(R::ok(Page::new(items, total))).into_response())
}

#[derive(Debug, Deserialize)]
pub struct UserCreateBody {
    pub dept_id: Option<i64>,
    pub password: Option<String>,
    pub real_name: Option<String>,
    pub status: Option<i64>,
    pub username: Option<String>,
}

async fn user_create(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<UserCreateBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:user:create").await?;

    let username = body.username.unwrap_or_default().trim().to_string();
    let password = body.password.unwrap_or_default();
    if username.is_empty() {
        return Err(AppError::bad_request("用户名不能为空"));
    }
    if username.len() > 64 {
        return Err(AppError::bad_request("用户名过长"));
    }
    validate_password_policy(&password)?;

    let hash = hash_password(&password)?;
    let id = admin_repo::create_user(
        &state.pool,
        &username,
        &hash,
        body.real_name.as_deref().unwrap_or(&username),
        body.dept_id.unwrap_or(0),
        body.status.unwrap_or(1),
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "create",
        "user",
        &id.to_string(),
        "POST",
        "/api/system/user",
        true,
        200,
        &format!("username={username}"),
    )
    .await;
    Ok(axum::Json(R::ok(id)).into_response())
}

#[derive(Debug, Deserialize)]
pub struct UserUpdateBody {
    pub dept_id: Option<i64>,
    pub id: Option<String>,
    pub real_name: Option<String>,
    pub status: Option<i64>,
}

async fn user_update(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<UserUpdateBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:user:update").await?;
    let id = parse_id(body.id.as_ref(), "id")?;
    // 内置演示账号不允许禁用，避免把自己锁在门外
    if id <= 3 && matches!(body.status, Some(0)) {
        return Err(AppError::conflict("内置账号不允许停用"));
    }
    admin_repo::update_user(
        &state.pool,
        id,
        body.real_name.as_deref().unwrap_or(""),
        body.dept_id.unwrap_or(0),
        body.status.unwrap_or(1),
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "update",
        "user",
        &id.to_string(),
        "PUT",
        "/api/system/user",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

#[derive(Debug, Deserialize)]
pub struct IdQuery {
    pub id: Option<String>,
}

async fn user_delete(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Query(query): Query<IdQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:user:delete").await?;
    let id = parse_id(query.id.as_ref(), "id")?;
    if id <= 3 {
        return Err(AppError::conflict("内置账号不允许删除"));
    }
    if id == current.id {
        return Err(AppError::conflict("不能删除当前登录账号"));
    }
    admin_repo::delete_user(&state.pool, id).await?;

    audit(
        &state,
        &client,
        &current,
        "delete",
        "user",
        &id.to_string(),
        "DELETE",
        "/api/system/user",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordBody {
    pub id: Option<String>,
    pub password: Option<String>,
}

/// 管理员重置指定用户密码（重置后该用户已登录会话全部失效）
async fn user_reset_password(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<ResetPasswordBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:user:update").await?;
    let id = parse_id(body.id.as_ref(), "id")?;
    let password = body.password.unwrap_or_default();
    validate_password_policy(&password)?;

    let hash = hash_password(&password)?;
    crate::db::user_repo::update_password(&state.pool, id, &hash).await?;
    let _ = crate::db::security_repo::revoke_all_refresh_tokens(&state.pool, id).await;

    audit(
        &state,
        &client,
        &current,
        "reset_password",
        "user",
        &id.to_string(),
        "PUT",
        "/api/system/user/password",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

/* ============================ 角色 ============================ */

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleListQuery {
    pub name: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

async fn role_list(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
    Query(query): Query<RoleListQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &ClientInfo::default(), "system:role:list").await?;
    let status = match query.status.as_deref() {
        Some(v) if !v.trim().is_empty() => Some(parse_id(Some(&v.to_string()), "status")?),
        _ => None,
    };
    let (items, total) = admin_repo::list_roles(
        &state.pool,
        &PageQuery { page: query.page, page_size: query.page_size },
        query.name.as_deref().unwrap_or(""),
        status,
    )
    .await?;
    Ok(axum::Json(R::ok(Page::new(items, total))).into_response())
}

#[derive(Debug, Deserialize)]
pub struct RoleBody {
    pub code: Option<String>,
    pub id: Option<String>,
    pub name: Option<String>,
    pub remark: Option<String>,
    pub status: Option<i64>,
}

async fn role_create(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<RoleBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:role:create").await?;
    let name = body.name.unwrap_or_default().trim().to_string();
    let code = body.code.unwrap_or_default().trim().to_string();
    if name.is_empty() || code.is_empty() {
        return Err(AppError::bad_request("角色名称与标识不能为空"));
    }
    let id = admin_repo::create_role(
        &state.pool,
        &name,
        &code,
        body.status.unwrap_or(1),
        body.remark.as_deref().unwrap_or(""),
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "create",
        "role",
        &id.to_string(),
        "POST",
        "/api/system/role",
        true,
        200,
        &format!("code={code}"),
    )
    .await;
    Ok(axum::Json(R::ok(id)).into_response())
}

async fn role_update(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<RoleBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:role:update").await?;
    let id = parse_id(body.id.as_ref(), "id")?;
    admin_repo::update_role(
        &state.pool,
        id,
        body.name.as_deref().unwrap_or(""),
        body.status.unwrap_or(1),
        body.remark.as_deref().unwrap_or(""),
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "update",
        "role",
        &id.to_string(),
        "PUT",
        "/api/system/role",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

async fn role_delete(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Query(query): Query<IdQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:role:delete").await?;
    let id = parse_id(query.id.as_ref(), "id")?;
    admin_repo::delete_role(&state.pool, id).await?;

    audit(
        &state,
        &client,
        &current,
        "delete",
        "role",
        &id.to_string(),
        "DELETE",
        "/api/system/role",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

/* ============================ 角色菜单授权 ============================ */

/// 读取角色已授权的菜单 id 集合
async fn role_menu_get(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
    Query(query): Query<IdQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &ClientInfo::default(), "system:role:update").await?;
    let id = parse_id(query.id.as_ref(), "id")?;
    let ids = admin_repo::list_role_menu_ids(&state.pool, id).await?;
    Ok(axum::Json(R::ok(ids)).into_response())
}

#[derive(Debug, Deserialize)]
pub struct RoleMenuBody {
    pub id: Option<String>,
    pub menu_ids: Option<Vec<i64>>,
}

/// 覆盖式保存角色的菜单授权
async fn role_menu_put(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<RoleMenuBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:role:update").await?;
    let id = parse_id(body.id.as_ref(), "id")?;
    let menu_ids = body.menu_ids.unwrap_or_default();
    let inserted = admin_repo::set_role_menus(&state.pool, id, &menu_ids).await?;

    audit(
        &state,
        &client,
        &current,
        "update",
        "role_menu",
        &id.to_string(),
        "PUT",
        "/api/system/role/menu",
        true,
        200,
        &format!("menu_count={}", menu_ids.len()),
    )
    .await;
    Ok(axum::Json(R::ok(inserted)).into_response())
}

/* ============================ 菜单 ============================ */

async fn menu_list(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &ClientInfo::default(), "system:menu:list").await?;
    let items = admin_repo::list_menus(&state.pool).await?;
    Ok(axum::Json(R::ok(items)).into_response())
}

#[derive(Debug, Deserialize)]
pub struct MenuBody {
    pub auth_code: Option<String>,
    pub component: Option<String>,
    pub icon: Option<String>,
    pub id: Option<String>,
    pub meta: Option<serde_json::Value>,
    pub name: Option<String>,
    pub path: Option<String>,
    pub pid: Option<String>,
    pub sort: Option<i64>,
    pub status: Option<i64>,
    pub r#type: Option<String>,
}

async fn menu_create(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<MenuBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:menu:create").await?;
    let name = body.name.unwrap_or_default().trim().to_string();
    if name.is_empty() {
        return Err(AppError::bad_request("菜单名称不能为空"));
    }
    let pid = parse_id(body.pid.as_ref(), "pid").unwrap_or(0);
    let menu_type = body.r#type.unwrap_or_else(|| "menu".to_string());
    let meta = serde_json::to_string(&body.meta.unwrap_or(serde_json::json!({})))
        .unwrap_or_else(|_| "{}".to_string());

    let id = admin_repo::create_menu(
        &state.pool,
        pid,
        &name,
        body.path.as_deref().unwrap_or(""),
        body.component.as_deref().unwrap_or(""),
        body.icon.as_deref().unwrap_or(""),
        body.sort.unwrap_or(0),
        body.status.unwrap_or(1),
        &menu_type,
        body.auth_code.as_deref().unwrap_or(""),
        &meta,
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "create",
        "menu",
        &id.to_string(),
        "POST",
        "/api/system/menu",
        true,
        200,
        &format!("name={name}"),
    )
    .await;
    Ok(axum::Json(R::ok(id)).into_response())
}

async fn menu_update(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<MenuBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:menu:update").await?;
    let id = parse_id(body.id.as_ref(), "id")?;
    let pid = parse_id(body.pid.as_ref(), "pid").unwrap_or(0);
    let meta = serde_json::to_string(&body.meta.unwrap_or(serde_json::json!({})))
        .unwrap_or_else(|_| "{}".to_string());

    admin_repo::update_menu(
        &state.pool,
        id,
        pid,
        body.name.as_deref().unwrap_or(""),
        body.path.as_deref().unwrap_or(""),
        body.component.as_deref().unwrap_or(""),
        body.icon.as_deref().unwrap_or(""),
        body.sort.unwrap_or(0),
        body.status.unwrap_or(1),
        body.r#type.as_deref().unwrap_or("menu"),
        body.auth_code.as_deref().unwrap_or(""),
        &meta,
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "update",
        "menu",
        &id.to_string(),
        "PUT",
        "/api/system/menu",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

async fn menu_delete(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Query(query): Query<IdQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:menu:delete").await?;
    let id = parse_id(query.id.as_ref(), "id")?;
    let removed = admin_repo::delete_menu(&state.pool, id).await?;

    audit(
        &state,
        &client,
        &current,
        "delete",
        "menu",
        &id.to_string(),
        "DELETE",
        "/api/system/menu",
        true,
        200,
        &format!("removed={removed}"),
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

/* ============================ 部门 ============================ */

async fn dept_list(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &ClientInfo::default(), "system:dept:list").await?;
    let items = admin_repo::list_depts(&state.pool).await?;
    Ok(axum::Json(R::ok(items)).into_response())
}

#[derive(Debug, Deserialize)]
pub struct DeptBody {
    pub id: Option<String>,
    pub leader: Option<String>,
    pub name: Option<String>,
    pub pid: Option<String>,
    pub remark: Option<String>,
    pub sort: Option<i64>,
    pub status: Option<i64>,
}

async fn dept_create(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<DeptBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:dept:create").await?;
    let name = body.name.unwrap_or_default().trim().to_string();
    if name.is_empty() {
        return Err(AppError::bad_request("部门名称不能为空"));
    }
    let pid = parse_id(body.pid.as_ref(), "pid").unwrap_or(0);
    let id = admin_repo::create_dept(
        &state.pool,
        pid,
        &name,
        body.leader.as_deref().unwrap_or(""),
        body.sort.unwrap_or(0),
        body.status.unwrap_or(1),
        body.remark.as_deref().unwrap_or(""),
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "create",
        "dept",
        &id.to_string(),
        "POST",
        "/api/system/dept",
        true,
        200,
        &format!("name={name}"),
    )
    .await;
    Ok(axum::Json(R::ok(id)).into_response())
}

async fn dept_update(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<DeptBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:dept:update").await?;
    let id = parse_id(body.id.as_ref(), "id")?;
    let pid = parse_id(body.pid.as_ref(), "pid").unwrap_or(0);
    admin_repo::update_dept(
        &state.pool,
        id,
        pid,
        body.name.as_deref().unwrap_or(""),
        body.leader.as_deref().unwrap_or(""),
        body.sort.unwrap_or(0),
        body.status.unwrap_or(1),
        body.remark.as_deref().unwrap_or(""),
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "update",
        "dept",
        &id.to_string(),
        "PUT",
        "/api/system/dept",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

async fn dept_delete(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Query(query): Query<IdQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:dept:delete").await?;
    let id = parse_id(query.id.as_ref(), "id")?;
    admin_repo::delete_dept(&state.pool, id).await?;

    audit(
        &state,
        &client,
        &current,
        "delete",
        "dept",
        &id.to_string(),
        "DELETE",
        "/api/system/dept",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

/* ============================ 字典 ============================ */

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DictListQuery {
    /// 前端传 dictCode（camelCase），必须 rename_all 才会被识别
    pub dict_code: Option<String>,
    pub name: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

async fn dict_list(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
    Query(query): Query<DictListQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &ClientInfo::default(), "system:dict:list").await?;
    let (items, total) = admin_repo::list_dicts(
        &state.pool,
        &PageQuery { page: query.page, page_size: query.page_size },
        query.name.as_deref().unwrap_or(""),
        query.dict_code.as_deref().unwrap_or(""),
    )
    .await?;
    Ok(axum::Json(R::ok(Page::new(items, total))).into_response())
}

#[derive(Debug, Deserialize)]
pub struct DictBody {
    pub code: Option<String>,
    pub dict_code: Option<String>,
    pub id: Option<String>,
    pub name: Option<String>,
    pub remark: Option<String>,
    pub sort: Option<i64>,
    pub status: Option<i64>,
    pub value: Option<String>,
}

async fn dict_create(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<DictBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:dict:create").await?;
    let name = body.name.unwrap_or_default().trim().to_string();
    if name.is_empty() {
        return Err(AppError::bad_request("字典名称不能为空"));
    }
    let id = admin_repo::create_dict(
        &state.pool,
        body.dict_code.as_deref().unwrap_or(""),
        &name,
        body.code.as_deref().unwrap_or(""),
        body.value.as_deref().unwrap_or(""),
        body.sort.unwrap_or(0),
        body.status.unwrap_or(1),
        body.remark.as_deref().unwrap_or(""),
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "create",
        "dict",
        &id.to_string(),
        "POST",
        "/api/system/dict",
        true,
        200,
        &format!("name={name}"),
    )
    .await;
    Ok(axum::Json(R::ok(id)).into_response())
}

async fn dict_update(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Json(body): Json<DictBody>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:dict:update").await?;
    let id = parse_id(body.id.as_ref(), "id")?;
    admin_repo::update_dict(
        &state.pool,
        id,
        body.name.as_deref().unwrap_or(""),
        body.code.as_deref().unwrap_or(""),
        body.value.as_deref().unwrap_or(""),
        body.sort.unwrap_or(0),
        body.status.unwrap_or(1),
        body.remark.as_deref().unwrap_or(""),
    )
    .await?;

    audit(
        &state,
        &client,
        &current,
        "update",
        "dict",
        &id.to_string(),
        "PUT",
        "/api/system/dict",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

async fn dict_delete(
    State(state): State<Arc<AppState>>,
    Extension(client): Extension<ClientInfo>,
    current: CurrentUser,
    Query(query): Query<IdQuery>,
) -> Result<Response, AppError> {
    ensure_permission(&state, &current, &client, "system:dict:delete").await?;
    let id = parse_id(query.id.as_ref(), "id")?;
    admin_repo::delete_dict(&state.pool, id).await?;

    audit(
        &state,
        &client,
        &current,
        "delete",
        "dict",
        &id.to_string(),
        "DELETE",
        "/api/system/dict",
        true,
        200,
        "",
    )
    .await;
    Ok(axum::Json(R::ok(())).into_response())
}

/* ============================ 审计日志 ============================ */

#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub action: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
    pub success: Option<String>,
}

async fn audit_list(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
    Query(query): Query<AuditQuery>,
) -> Result<Response, AppError> {
    if !current.is_super() {
        return Err(AppError::forbidden("没有权限执行该操作"));
    }
    let success = match query.success.as_deref() {
        Some("1" | "true") => Some(true),
        Some("0" | "false") => Some(false),
        _ => None,
    };
    let (rows, total) = crate::db::audit::list(
        &state.pool,
        &PageQuery { page: query.page, page_size: query.page_size },
        query.keyword.as_deref().unwrap_or(""),
        query.action.as_deref().unwrap_or(""),
        success,
    )
    .await?;
    Ok(axum::Json(R::ok(Page::new(rows, total))).into_response())
}
