//! 数据访问层（repository）—— 所有 SQL 集中在这一层
//!
//! 设计说明：
//! - 使用运行时查询（`query_as` + `FromRow`），不依赖编译期数据库，
//!   全新环境 `cargo build` 无需先建库。
//! - 切换数据库时的边界：SQLite 使用 `?` 占位符；Postgres 改为 `$1, $2 ...`，
//!   返回值结构保持不变（FromRow 对两种驱动均适用）。

pub mod admin_repo;
pub mod audit;
pub mod menu_repo;
pub mod models;
pub mod security_repo;
pub mod seed;
pub mod seed_security;
pub mod user_repo;
