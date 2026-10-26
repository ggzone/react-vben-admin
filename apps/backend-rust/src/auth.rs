//! JWT 认证服务 —— 与官方 backend-mock 的 token 载荷结构保持一致
//!
//! 官方 mock 的 accessToken 载荷即用户信息（含 exp），本实现将用户信息
//! 编码进 JWT claims，`/user/info` 等接口从数据库重新加载，保证数据实时性。

use std::sync::Arc;

use axum::async_trait;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::state::AppState;

/// JWT 配置
#[derive(Debug, Clone)]
pub struct JwtConfig {
    /// 签名密钥
    pub secret: String,
    /// 有效期（天）
    pub expire_days: i64,
}

/// Token 中的用户声明
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// 用户 ID
    pub user_id: i64,
    /// 用户名
    pub username: String,
    /// 角色标识列表
    pub roles: Vec<String>,
    /// 过期时间（unix 秒）
    pub exp: i64,
    /// 签发时间（unix 秒）
    pub iat: i64,
}

/// JWT 服务
pub struct JwtService {
    config: JwtConfig,
}

impl JwtService {
    pub fn new(config: JwtConfig) -> Arc<Self> {
        Arc::new(Self { config })
    }

    /// 签发 accessToken
    pub fn create_access_token(
        &self,
        user_id: i64,
        username: &str,
        roles: &[String],
    ) -> Result<String, AppError> {
        let now = chrono::Utc::now().timestamp();
        let claims = Claims {
            exp: now + self.config.expire_days * 24 * 3600,
            iat: now,
            roles: roles.to_vec(),
            user_id,
            username: username.to_string(),
        };
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.config.secret.as_bytes()),
        )
        .map_err(|e| AppError::internal(format!("failed to create token: {e}")))
    }

    /// 校验并解析 accessToken
    pub fn verify_access_token(&self, token: &str) -> Result<Claims, AppError> {
        let mut validation = Validation::default();
        validation.validate_exp = true;
        let data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.config.secret.as_bytes()),
            &validation,
        )?;
        Ok(data.claims)
    }
}

/// 请求提取器：从 `Authorization: Bearer <token>` 解析 Claims
///
/// 与官方 `verifyAccessToken(event)` 行为一致：
/// 缺少或不匹配 Bearer 前缀时返回 401。
pub struct AuthClaims(pub Claims);

#[async_trait]
impl FromRequestParts<Arc<AppState>> for AuthClaims
where
    Arc<AppState>: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        if !auth_header.starts_with("Bearer") {
            return Err(AppError::unauthorized("Unauthorized"));
        }

        let token = auth_header.split_whitespace().nth(1).unwrap_or("");
        if token.is_empty() {
            return Err(AppError::unauthorized("Unauthorized"));
        }

        let claims = state.jwt.verify_access_token(token)?;
        Ok(AuthClaims(claims))
    }
}
