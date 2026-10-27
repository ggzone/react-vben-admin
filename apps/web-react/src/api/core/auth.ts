/**
 * 认证接口 —— 与官方 apps/web-antd/src/api/core/auth.ts 1:1 对齐
 */
import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/**
 * 刷新accessToken
 *
 * 对齐官方 apps/web-antd/src/api/core/auth.ts：必须走 baseRequestClient（无鉴权拦截器）。
 * 用 requestClient 会让 refresh 自身的 401 再次进入 handleUnauthorized，
 * 命中 isRefreshing 后把请求挂进队列永久等待，外层 await 永不返回 → 登录态失效时页面白屏卡死。
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post('/auth/logout', {
    withCredentials: true,
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/auth/codes');
}
