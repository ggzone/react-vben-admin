//! 数据模型 —— 与官方 backend-mock 的数据结构 1:1 对齐

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 用户（数据库行）
#[derive(Debug, Clone, FromRow)]
pub struct SystemUser {
    pub id: i64,
    pub username: String,
    /// argon2 密码哈希（不对外返回）
    pub password: String,
    pub real_name: String,
    pub avatar: String,
    pub home_path: String,
    /// 1 启用 0 禁用
    pub status: i64,
}

/// 用户信息（对外返回，与官方 UserInfo 对齐，不含密码）
/// 字段命名为 camelCase，与前端 `@vben/types` UserInfo 完全一致
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub id: i64,
    pub real_name: String,
    pub roles: Vec<String>,
    pub username: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub home_path: String,
}

/// 登录响应数据（官方 login.post.ts 返回 `{ ...user, accessToken }`，前端仅取 accessToken；
/// 出于安全考虑不回传密码字段，前端行为不受影响）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    pub access_token: String,
    #[serde(flatten)]
    pub user: UserInfo,
}

/// 角色（数据库行）
#[derive(Debug, Clone, FromRow)]
pub struct SystemRole {
    pub id: i64,
    pub name: String,
    /// 角色标识：super / admin / user
    pub code: String,
    pub status: i64,
}

/// 菜单（数据库行）
#[derive(Debug, Clone, FromRow)]
pub struct SystemMenu {
    pub id: i64,
    pub pid: i64,
    pub name: String,
    pub path: String,
    pub component: String,
    pub icon: String,
    pub sort: i64,
    pub status: i64,
    /// catalog / menu / button
    #[sqlx(rename = "type")]
    pub menu_type: String,
    /// 按钮级权限标识
    pub auth_code: String,
    /// meta JSON 字符串
    pub meta: String,
}

/// 菜单元信息（官方 MenuRecordRaw.meta 对齐，camelCase）
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub affix_tab: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub badge_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hide_in_menu: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_alive: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub link: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(flatten)]
    pub extra: std::collections::HashMap<String, serde_json::Value>,
}

/// 菜单记录（对外返回，与官方 MenuRecordRaw 对齐）
#[derive(Debug, Clone, Serialize)]
pub struct MenuRecord {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<MenuRecord>,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub component: String,
    pub meta: serde_json::Value,
    pub name: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub path: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub redirect: String,
}
