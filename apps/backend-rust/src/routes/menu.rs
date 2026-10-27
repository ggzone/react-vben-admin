//! 菜单路由 —— 当前登录用户可见的菜单树

use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;

use crate::auth::CurrentUser;
use crate::db::menu_repo;
use crate::db::models::{MenuRecord, SystemMenu};
use crate::error::AppError;
use crate::response::R;
use crate::state::AppState;

/// 菜单路由（挂在 `/api/menu` 下）
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/all", get(all_menus))
}

/// GET /api/menu/all
async fn all_menus(
    State(state): State<Arc<AppState>>,
    current: CurrentUser,
) -> Result<Response, AppError> {
    let flat = menu_repo::find_menus_by_user_id(&state.pool, current.id).await?;
    Ok(axum::Json(R::ok(build_tree(&flat))).into_response())
}

/// 把扁平菜单列表组装成树（与官方 MOCK_MENUS 的嵌套结构一致）
pub fn build_tree(flat: &[SystemMenu]) -> Vec<MenuRecord> {
    let mut children_of: std::collections::HashMap<i64, Vec<&SystemMenu>> =
        std::collections::HashMap::new();
    for menu in flat {
        children_of.entry(menu.pid).or_default().push(menu);
    }

    fn walk(
        parent: i64,
        map: &std::collections::HashMap<i64, Vec<&SystemMenu>>,
    ) -> Vec<MenuRecord> {
        let mut out = Vec::new();
        if let Some(list) = map.get(&parent) {
            for menu in list {
                let meta: serde_json::Value =
                    serde_json::from_str(&menu.meta).unwrap_or_else(|_| {
                        serde_json::json!({ "icon": menu.icon, "title": menu.name })
                    });
                // 目录节点：把 redirect 指向第一个子菜单，保证点开有默认落地页
                let redirect = if menu.menu_type == "catalog" {
                    map.get(&menu.id)
                        .and_then(|c| c.first())
                        .map(|c| c.path.clone())
                        .unwrap_or_default()
                } else {
                    String::new()
                };
                out.push(MenuRecord {
                    children: walk(menu.id, map),
                    component: menu.component.clone(),
                    meta,
                    name: menu.name.clone(),
                    path: menu.path.clone(),
                    redirect,
                });
            }
        }
        out
    }

    walk(0, &children_of)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn menu(id: i64, pid: i64, name: &str, path: &str, t: &str) -> SystemMenu {
        SystemMenu {
            auth_code: String::new(),
            component: String::new(),
            icon: String::new(),
            id,
            menu_type: t.into(),
            meta: "{}".into(),
            name: name.into(),
            path: path.into(),
            pid,
            sort: 0,
            status: 1,
        }
    }

    #[test]
    fn builds_nested_tree_and_redirect() {
        let flat = vec![
            menu(1, 0, "System", "/system", "catalog"),
            menu(2, 1, "SystemUser", "/system/user", "menu"),
            menu(3, 1, "SystemRole", "/system/role", "menu"),
        ];
        let tree = build_tree(&flat);
        assert_eq!(tree.len(), 1);
        assert_eq!(tree[0].name, "System");
        assert_eq!(tree[0].redirect, "/system/user");
        assert_eq!(tree[0].children.len(), 2);
    }
}
