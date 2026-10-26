-- Vben Admin Rust 后端 —— 初始表结构（SQLite）
-- 说明：
-- 1. 所有 SQL 集中在 migrations/ 与 repository 层，后续切换 Postgres 时
--    只需调整连接串、sqlx feature 与占位符（? -> $1），表结构保持一致。
-- 2. 时间字段统一使用 TEXT（ISO-8601），SQLite/Postgres 均兼容。

-- 用户表
CREATE TABLE IF NOT EXISTS system_user (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,                 -- argon2 哈希
    real_name   TEXT    NOT NULL DEFAULT '',
    avatar      TEXT    NOT NULL DEFAULT '',
    home_path   TEXT    NOT NULL DEFAULT '',
    status      INTEGER NOT NULL DEFAULT 1,        -- 1 启用 0 禁用
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 角色表
CREATE TABLE IF NOT EXISTS system_role (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    code        TEXT    NOT NULL UNIQUE,           -- super / admin / user
    status      INTEGER NOT NULL DEFAULT 1,
    remark      TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 用户-角色关联
CREATE TABLE IF NOT EXISTS system_user_role (
    user_id     INTEGER NOT NULL,
    role_id     INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- 菜单表（目录/菜单/按钮统一树形结构）
CREATE TABLE IF NOT EXISTS system_menu (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pid         INTEGER NOT NULL DEFAULT 0,
    name        TEXT    NOT NULL,
    path        TEXT    NOT NULL DEFAULT '',
    component   TEXT    NOT NULL DEFAULT '',
    icon        TEXT    NOT NULL DEFAULT '',
    sort        INTEGER NOT NULL DEFAULT 0,
    status      INTEGER NOT NULL DEFAULT 1,
    type        TEXT    NOT NULL DEFAULT 'menu',   -- catalog / menu / button
    auth_code   TEXT    NOT NULL DEFAULT '',       -- 按钮级权限标识
    meta        TEXT    NOT NULL DEFAULT '{}',     -- JSON（title/affixTab/order 等）
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 角色-菜单关联（含按钮级权限）
CREATE TABLE IF NOT EXISTS system_role_menu (
    role_id     INTEGER NOT NULL,
    menu_id     INTEGER NOT NULL,
    PRIMARY KEY (role_id, menu_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_role_user   ON system_user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_role_menu_role   ON system_role_menu(role_id);
CREATE INDEX IF NOT EXISTS idx_menu_pid         ON system_menu(pid);
