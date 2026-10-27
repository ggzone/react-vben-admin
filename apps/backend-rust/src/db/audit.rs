//! 审计日志 —— 谁、何时、从哪个 IP、对什么资源、做了什么、成功与否
//!
//! 写入失败只记日志不阻断业务：审计是「可观测性」组件，不应成为可用性瓶颈。
//! `detail` 字段在入库前会做脱敏，避免把密码/令牌写进日志。

use sqlx::SqlitePool;

use super::models::AuditLogRow;
use crate::error::AppError;
use crate::response::PageQuery;

/// 一条审计记录
#[derive(Debug, Clone)]
pub struct AuditEntry {
    /// 动作：login / logout / refresh / create / update / delete / deny
    pub action: String,
    /// 附加信息（会被脱敏）
    pub detail: String,
    /// 客户端 IP
    pub ip: String,
    /// HTTP 方法
    pub method: String,
    /// 请求路径
    pub path: String,
    /// 资源类型：auth / user / role / menu / dept / dict
    pub resource: String,
    /// 资源 ID
    pub resource_id: String,
    /// HTTP 状态码
    pub status: i64,
    /// 是否成功
    pub success: bool,
    /// UA
    pub user_agent: String,
    /// 用户 ID（未登录为 0）
    pub user_id: i64,
    /// 用户名（未登录为空）
    pub username: String,
}

impl Default for AuditEntry {
    fn default() -> Self {
        Self {
            action: String::new(),
            detail: String::new(),
            ip: String::new(),
            method: String::new(),
            path: String::new(),
            resource: String::new(),
            resource_id: String::new(),
            status: 200,
            success: true,
            user_agent: String::new(),
            user_id: 0,
            username: String::new(),
        }
    }
}

/// 脱敏：抹掉可能写进 detail 的敏感字段
fn redact(detail: &str) -> String {
    let mut out = detail.to_string();
    for key in [
        "password",
        "oldPassword",
        "newPassword",
        "accessToken",
        "refreshToken",
        "token",
    ] {
        // 极简处理：出现敏感键名时不记录其取值
        if out.to_ascii_lowercase().contains(&key.to_ascii_lowercase()) {
            out = format!("{key}=***");
            break;
        }
    }
    out.chars().take(512).collect()
}

/// 写入一条审计日志
pub async fn write(pool: &SqlitePool, entry: AuditEntry) {
    let ts = chrono::Utc::now().to_rfc3339();
    let result = sqlx::query(
        r#"INSERT INTO system_audit_log
             (ts, user_id, username, action, resource, resource_id, method, path,
              ip, user_agent, status, success, detail)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(ts)
    .bind(entry.user_id)
    .bind(&entry.username)
    .bind(&entry.action)
    .bind(&entry.resource)
    .bind(&entry.resource_id)
    .bind(&entry.method)
    .bind(&entry.path)
    .bind(&entry.ip)
    .bind(&entry.user_agent)
    .bind(entry.status)
    .bind(if entry.success { 1 } else { 0 })
    .bind(redact(&entry.detail))
    .execute(pool)
    .await;

    if let Err(err) = result {
        tracing::warn!(error = %err, "failed to write audit log");
    }
}

/// 分页查询审计日志（仅 super 可见）
pub async fn list(
    pool: &SqlitePool,
    query: &PageQuery,
    keyword: &str,
    action: &str,
    success: Option<bool>,
) -> Result<(Vec<AuditLogRow>, i64), AppError> {
    let (limit, offset) = query.normalize();
    let like = format!("%{keyword}%");

    // 动态条件一律用参数绑定，不拼接
    let action_clause = if action.is_empty() {
        "1=1".to_string()
    } else {
        "action = ?".to_string()
    };
    let success_clause = match success {
        Some(_) => "success = ?".to_string(),
        None => "1=1".to_string(),
    };

    let where_sql = format!(
        "WHERE (username LIKE ? OR action LIKE ? OR resource LIKE ? OR detail LIKE ?) \
         AND {action_clause} AND {success_clause}"
    );

    let list_sql = format!(
        "SELECT id, ts, user_id, username, action, resource, resource_id, method, path, \
         ip, user_agent, status, success, detail FROM system_audit_log {where_sql} \
         ORDER BY id DESC LIMIT ? OFFSET ?"
    );
    let count_sql = format!("SELECT COUNT(*) FROM system_audit_log {where_sql}");

    let mut q = sqlx::query_as::<_, AuditLogRow>(&list_sql)
        .bind(&like)
        .bind(&like)
        .bind(&like)
        .bind(&like);
    if !action.is_empty() {
        q = q.bind(action);
    }
    if let Some(ok) = success {
        q = q.bind(if ok { 1 } else { 0 });
    }
    let rows = q.bind(limit).bind(offset).fetch_all(pool).await?;

    let mut c = sqlx::query_scalar::<_, i64>(&count_sql)
        .bind(&like)
        .bind(&like)
        .bind(&like)
        .bind(&like);
    if !action.is_empty() {
        c = c.bind(action);
    }
    if let Some(ok) = success {
        c = c.bind(if ok { 1 } else { 0 });
    }
    let total = c.fetch_one(pool).await.unwrap_or(0);

    Ok((rows, total))
}
