-- ============================================================================
-- 002_security.sql —— 安全增强 + 系统管理模块
-- 说明：
-- 1. SQLite 的 ALTER TABLE ADD COLUMN 只允许常量默认值，时间类字段统一先给 ''
--    再由应用层写入（ISO-8601）。
-- 2. 所有敏感信息（密码、refresh token）只存哈希，不存明文。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 用户表扩展：部门 / 联系方式 / 令牌版本 / 登录审计 / 密码更新时间
-- ---------------------------------------------------------------------------
ALTER TABLE system_user ADD COLUMN dept_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE system_user ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE system_user ADD COLUMN phone TEXT NOT NULL DEFAULT '';
-- 令牌版本：改密码 / 退出登录 / 检测到 refresh 复用 时 +1，令已签发的 accessToken 立即失效
ALTER TABLE system_user ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE system_user ADD COLUMN password_updated_at TEXT NOT NULL DEFAULT '';
ALTER TABLE system_user ADD COLUMN last_login_at TEXT NOT NULL DEFAULT '';
ALTER TABLE system_user ADD COLUMN last_login_ip TEXT NOT NULL DEFAULT '';

-- ---------------------------------------------------------------------------
-- 部门（树形）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_dept (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pid         INTEGER NOT NULL DEFAULT 0,
    name        TEXT    NOT NULL,
    leader      TEXT    NOT NULL DEFAULT '',
    sort        INTEGER NOT NULL DEFAULT 0,
    status      INTEGER NOT NULL DEFAULT 1,
    remark      TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dept_pid ON system_dept(pid);

-- ---------------------------------------------------------------------------
-- 字典（类型 + 数据项，用 type 区分）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_dict (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL,                 -- dict_type / dict_item
    dict_code   TEXT    NOT NULL DEFAULT '',      -- 所属字典编码（数据项使用）
    name        TEXT    NOT NULL,
    code        TEXT    NOT NULL DEFAULT '',
    value       TEXT    NOT NULL DEFAULT '',
    sort        INTEGER NOT NULL DEFAULT 0,
    status      INTEGER NOT NULL DEFAULT 1,
    remark      TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dict_type ON system_dict(type, dict_code);

-- ---------------------------------------------------------------------------
-- 权限点（细粒度动作码，与菜单的 auth_code 互补）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_permission (
    code        TEXT PRIMARY KEY,                 -- system:user:list
    name        TEXT NOT NULL,
    group_name  TEXT NOT NULL DEFAULT '',         -- user / role / menu / dept / audit
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_role_permission (
    role_id     INTEGER NOT NULL,
    permission  TEXT    NOT NULL,
    PRIMARY KEY (role_id, permission)
);
CREATE INDEX IF NOT EXISTS idx_role_perm_role ON system_role_permission(role_id);

-- ---------------------------------------------------------------------------
-- Refresh Token（selector/verifier 模式：查得到 selector，验得了 verifier 哈希）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_refresh_token (
    selector    TEXT PRIMARY KEY,                 -- 明文 selector（16 hex），仅用于索引
    verifier    TEXT NOT NULL,                    -- verifier 的 argon2 哈希
    user_id     INTEGER NOT NULL,
    issued_at   TEXT NOT NULL,
    expires_at  TEXT NOT NULL,
    revoked_at  TEXT,
    replaced_by TEXT,                             -- 轮换后指向新 selector（用于复用检测）
    ip          TEXT NOT NULL DEFAULT '',
    user_agent  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_rt_user ON system_refresh_token(user_id);

-- ---------------------------------------------------------------------------
-- 登录失败计数（爆破防护）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_login_attempt (
    scope          TEXT NOT NULL,                 -- user / ip
    subject        TEXT NOT NULL,                 -- username 或 ip
    fail_count     INTEGER NOT NULL DEFAULT 0,
    window_started TEXT NOT NULL,
    locked_until   TEXT,
    PRIMARY KEY (scope, subject)
);

-- ---------------------------------------------------------------------------
-- 审计日志
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          TEXT    NOT NULL,
    user_id     INTEGER NOT NULL DEFAULT 0,
    username    TEXT    NOT NULL DEFAULT '',
    action      TEXT    NOT NULL,                 -- login / logout / create / update / delete / deny
    resource    TEXT    NOT NULL DEFAULT '',      -- auth / user / role / menu / dept ...
    resource_id TEXT    NOT NULL DEFAULT '',
    method      TEXT    NOT NULL DEFAULT '',
    path        TEXT    NOT NULL DEFAULT '',
    ip          TEXT    NOT NULL DEFAULT '',
    user_agent  TEXT    NOT NULL DEFAULT '',
    status      INTEGER NOT NULL DEFAULT 0,       -- HTTP 状态码
    success     INTEGER NOT NULL DEFAULT 1,
    detail      TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON system_audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON system_audit_log(username);
