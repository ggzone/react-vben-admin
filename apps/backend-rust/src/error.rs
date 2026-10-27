//! 应用错误类型 —— 统一转换为前端可识别的错误响应

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

/// 应用错误
#[derive(Debug, Clone)]
pub struct AppError {
    /// HTTP 状态码
    pub status: StatusCode,
    /// 人可读错误信息（透传给前端 message）
    pub message: String,
}

impl AppError {
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            status,
        }
    }

    /// 400 参数错误
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, message)
    }

    /// 401 未认证
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, message)
    }

    /// 403 禁止访问（如密码错误）
    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(StatusCode::FORBIDDEN, message)
    }

    /// 404 不存在
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, message)
    }

    /// 409 冲突（用户名/角色名重复等）
    pub fn conflict(message: impl Into<String>) -> Self {
        Self::new(StatusCode::CONFLICT, message)
    }

    /// 429 请求过于频繁
    pub fn too_many_requests(message: impl Into<String>) -> Self {
        Self::new(StatusCode::TOO_MANY_REQUESTS, message)
    }

    /// 500 内部错误
    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, message)
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for AppError {}

/// 错误响应体（与成功响应同构）
fn error_response(status: StatusCode, message: &str) -> Response {
    let body = json!({
        "code": -1,
        "data": null,
        "error": message,
        "message": message,
    });
    (status, Json(body)).into_response()
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // 内部错误不向外泄露细节
        if self.status == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(error = %self.message, "internal server error");
            return error_response(self.status, "Internal Server Error");
        }
        error_response(self.status, &self.message)
    }
}

/// sqlx 错误转换（记录日志，对外返回统一 500）
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::RowNotFound => Self::not_found("Resource not found"),
            _ => Self::internal(err.to_string()),
        }
    }
}

/// JWT 错误转换
impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        use jsonwebtoken::errors::ErrorKind;
        match err.kind() {
            ErrorKind::ExpiredSignature => Self::unauthorized("Token expired"),
            ErrorKind::InvalidToken | ErrorKind::InvalidSignature => {
                Self::unauthorized("Invalid token")
            }
            _ => Self::unauthorized("Authentication failed"),
        }
    }
}
