//! 安全相关的数据访问 —— refresh token / 登录失败计数 / 权限点
//!
//! 关键安全设计：
//! 1. **refresh token 轮换 + 复用检测**：每次刷新都会把旧令牌标记 `replaced_by`
//!    指向新 selector。若一个**已被替换过**的旧令牌再次出现，说明令牌泄露
//!    （攻击者与合法用户同时持有），立即吊销该用户**全部** refresh token 并把
//!    `token_version` +1，令所有 accessToken 同步失效。
//! 2. **登录失败锁定**：按「用户名」与「IP」双维度分别计数，窗口内达到阈值即锁定。
//!    双维度可同时防「定向爆破一个账号」和「对全站账号做慢速撞库」。

use sqlx::SqlitePool;

use super::models::{LoginAttemptRow, RefreshTokenRow};
use crate::error::AppError;

/* ======================== Refresh Token ======================== */

/// 写入一条 refresh token（只存 verifier 的哈希）
pub async fn insert_refresh_token(
    pool: &SqlitePool,
    selector: &str,
    verifier_hash: &str,
    user_id: i64,
    expires_at: &str,
    ip: &str,
    user_agent: &str,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        r#"INSERT INTO system_refresh_token
             (selector, verifier, user_id, issued_at, expires_at, ip, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(selector)
    .bind(verifier_hash)
    .bind(user_id)
    .bind(now)
    .bind(expires_at)
    .bind(ip)
    .bind(user_agent)
    .execute(pool)
    .await?;
    Ok(())
}

/// 按 selector 查一条 refresh token
pub async fn find_refresh_token(
    pool: &SqlitePool,
    selector: &str,
) -> Result<Option<RefreshTokenRow>, AppError> {
    let row = sqlx::query_as::<_, RefreshTokenRow>(
        r#"SELECT selector, verifier, user_id, issued_at, expires_at, revoked_at, replaced_by
           FROM system_refresh_token WHERE selector = ?"#,
    )
    .bind(selector)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// 轮换：把旧 selector 标记为已被新 selector 替换
pub async fn mark_replaced(
    pool: &SqlitePool,
    old_selector: &str,
    new_selector: &str,
) -> Result<(), AppError> {
    sqlx::query("UPDATE system_refresh_token SET replaced_by = ? WHERE selector = ?")
        .bind(new_selector)
        .bind(old_selector)
        .execute(pool)
        .await?;
    Ok(())
}

/// 吊销某用户的全部 refresh token（复用检测命中 / 退出登录 / 改密码）
pub async fn revoke_all_refresh_tokens(pool: &SqlitePool, user_id: i64) -> Result<u64, AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let result = sqlx::query(
        "UPDATE system_refresh_token SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
    )
    .bind(now)
    .bind(user_id)
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}

/// 吊销单条（按 selector）
pub async fn revoke_refresh_token(pool: &SqlitePool, selector: &str) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("UPDATE system_refresh_token SET revoked_at = ? WHERE selector = ?")
        .bind(now)
        .bind(selector)
        .execute(pool)
        .await?;
    Ok(())
}

/// 清理过期令牌（启动时执行一次，避免表无限增长）
pub async fn purge_expired_refresh_tokens(pool: &SqlitePool) -> Result<u64, AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let result = sqlx::query("DELETE FROM system_refresh_token WHERE expires_at < ?")
        .bind(now)
        .execute(pool)
        .await?;
    Ok(result.rows_affected())
}

/* ======================== 登录失败 / 锁定 ======================== */

/// 读取失败计数行
pub async fn find_login_attempt(
    pool: &SqlitePool,
    scope: &str,
    subject: &str,
) -> Result<Option<LoginAttemptRow>, AppError> {
    let row = sqlx::query_as::<_, LoginAttemptRow>(
        r#"SELECT scope, subject, fail_count, window_started, locked_until
           FROM system_login_attempt WHERE scope = ? AND subject = ?"#,
    )
    .bind(scope)
    .bind(subject)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// 当前是否处于锁定状态；返回剩余锁定秒数
pub async fn lock_remaining_secs(
    pool: &SqlitePool,
    scope: &str,
    subject: &str,
) -> Result<i64, AppError> {
    let Some(row) = find_login_attempt(pool, scope, subject).await? else {
        return Ok(0);
    };
    let Some(until) = row.locked_until else {
        return Ok(0);
    };
    let until = chrono::DateTime::parse_from_rfc3339(&until)
        .map(|t| t.timestamp())
        .unwrap_or(0);
    let remaining = until - chrono::Utc::now().timestamp();
    Ok(if remaining > 0 { remaining } else { 0 })
}

/// 记录一次登录失败；达到阈值则锁定，返回 (当前失败次数, 剩余锁定秒数)
pub async fn register_login_failure(
    pool: &SqlitePool,
    scope: &str,
    subject: &str,
    max_fail: i64,
    window_minutes: i64,
    lock_minutes: i64,
) -> Result<(i64, i64), AppError> {
    let now = chrono::Utc::now();
    let now_ts = now.timestamp();
    let window_secs = window_minutes * 60;

    let existing = find_login_attempt(pool, scope, subject).await?;
    let (count, window_started) = match existing {
        Some(row) => {
            let started = chrono::DateTime::parse_from_rfc3339(&row.window_started)
                .map(|t| t.timestamp())
                .unwrap_or(now_ts);
            // 窗口已过期：重新计数
            if now_ts - started >= window_secs {
                (1_i64, now.to_rfc3339())
            } else {
                (row.fail_count + 1, row.window_started.clone())
            }
        }
        None => (1_i64, now.to_rfc3339()),
    };

    let locked_until = if count >= max_fail {
        Some(
            (now + chrono::Duration::minutes(lock_minutes))
                .to_rfc3339(),
        )
    } else {
        None
    };

    sqlx::query(
        r#"INSERT INTO system_login_attempt (scope, subject, fail_count, window_started, locked_until)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(scope, subject) DO UPDATE SET
             fail_count = excluded.fail_count,
             window_started = excluded.window_started,
             locked_until = excluded.locked_until"#,
    )
    .bind(scope)
    .bind(subject)
    .bind(count)
    .bind(window_started)
    .bind(locked_until)
    .execute(pool)
    .await?;

    let remaining = if count >= max_fail {
        lock_minutes * 60
    } else {
        0
    };
    Ok((count, remaining))
}

/// 登录成功：清空失败计数
pub async fn clear_login_failures(
    pool: &SqlitePool,
    scope: &str,
    subject: &str,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM system_login_attempt WHERE scope = ? AND subject = ?")
        .bind(scope)
        .bind(subject)
        .execute(pool)
        .await?;
    Ok(())
}

/* ======================== 权限点 ======================== */

/// 查询用户持有的全部权限码（菜单按钮码 + 细粒度动作码）
pub async fn find_permissions_by_user_id(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<String>, AppError> {
    let codes = sqlx::query_scalar(
        r#"SELECT DISTINCT m.auth_code AS code FROM system_menu m
             JOIN system_role_menu rm ON rm.menu_id = m.id
             JOIN system_user_role ur ON ur.role_id = rm.role_id
           WHERE ur.user_id = ? AND m.type = 'button' AND m.auth_code != ''
           UNION
           SELECT rp.permission AS code FROM system_role_permission rp
             JOIN system_user_role ur2 ON ur2.role_id = rp.role_id
           WHERE ur2.user_id = ?"#,
    )
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(codes)
}

/// 系统中定义的全部权限码（super 角色短路使用）
pub async fn all_permission_codes(pool: &SqlitePool) -> Result<Vec<String>, AppError> {
    let codes = sqlx::query_scalar(
        r#"SELECT code FROM system_permission
           UNION
           SELECT auth_code AS code FROM system_menu WHERE type = 'button' AND auth_code != ''"#,
    )
    .fetch_all(pool)
    .await?;
    Ok(codes)
}
