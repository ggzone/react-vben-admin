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
