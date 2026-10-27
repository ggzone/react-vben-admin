//! 统一响应体 —— 与前端 api/request.ts 的响应契约 1:1 对齐
//!
//! 前端期望的响应结构（`/api/*`）：
//! ```json
//! { "code": 0, "data": <T>, "error": null, "message": "ok" }
//! ```
//! - `code == 0` 表示成功（`successCode = 0`，`dataField = "data"`）
//! - 失败时 HTTP 状态码为 400/401/403，`code` 为 -1，`message` 为人可读错误信息

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

use crate::error::AppError;

/// 统一响应体
#[derive(Debug, Serialize)]
pub struct R<T> {
    pub code: i32,
    pub data: Option<T>,
    pub error: Option<String>,
    pub message: String,
}

/// 业务成功码（与前端 successCode 对齐）
pub const CODE_SUCCESS: i32 = 0;
/// 业务失败码
pub const CODE_ERROR: i32 = -1;

impl<T> R<T> {
    /// 成功响应
    pub fn ok(data: T) -> Self {
        Self {
            code: CODE_SUCCESS,
            data: Some(data),
            error: None,
            message: "ok".to_string(),
        }
    }

    /// 空数据成功响应
    pub fn ok_empty() -> Self {
        Self {
            code: CODE_SUCCESS,
            data: None,
            error: None,
            message: "ok".to_string(),
        }
    }

    /// 失败响应（携带 HTTP 状态码）
    pub fn err(status: StatusCode, message: impl Into<String>) -> AppError {
        AppError::new(status, message.into())
    }
}

impl<T: Serialize> IntoResponse for R<T> {
    fn into_response(self) -> Response {
        (StatusCode::OK, Json(self)).into_response()
    }
}

/// 空数据成功响应（`data: null`）
pub type REmpty = R<()>;

impl REmpty {
    pub fn null() -> Self {
        Self::ok_empty()
    }
}

/// 分页响应体 —— 与官方 `usePageResponseSuccess` 完全一致：`{ items, total }`
#[derive(Debug, Serialize)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub total: i64,
}

impl<T> Page<T> {
    pub fn new(items: Vec<T>, total: i64) -> Self {
        Self { items, total }
    }
}

/// 分页参数（带安全上限，防止 `pageSize=999999` 拖垮数据库）
#[derive(Debug, serde::Deserialize)]
pub struct PageQuery {
    #[serde(default)]
    pub page: Option<i64>,
    #[serde(default, rename = "pageSize")]
    pub page_size: Option<i64>,
}

/// 每页最大条数
pub const MAX_PAGE_SIZE: i64 = 100;

impl PageQuery {
    /// 归一化后的 (limit, offset)
    pub fn normalize(&self) -> (i64, i64) {
        let page = self.page.unwrap_or(1).max(1);
        let size = self.page_size.unwrap_or(20).clamp(1, MAX_PAGE_SIZE);
        (size, (page - 1) * size)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn page_query_clamps_size_and_offsets() {
        let q = PageQuery {
            page: None,
            page_size: None,
        };
        assert_eq!(q.normalize(), (20, 0));

        let q = PageQuery {
            page: Some(0),
            page_size: Some(0),
        };
        assert_eq!(q.normalize(), (1, 0));

        let q = PageQuery {
            page: Some(3),
            page_size: Some(1_000_000),
        };
        assert_eq!(q.normalize(), (MAX_PAGE_SIZE, 2 * MAX_PAGE_SIZE));
    }
}
