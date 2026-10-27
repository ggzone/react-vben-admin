/**
 * 请求客户端 —— 与官方 @vben/request RequestClient 行为对齐（fetch 实现）
 *
 * 拦截器行为与官方 preset-interceptors.ts 一致：
 * 1. 请求拦截器：注入 Authorization（Bearer token）与 Accept-Language
 * 2. 响应拦截器：code === 0 时解包 data 字段返回；否则抛出错误（message 透传）
 * 3. 401 时按官方 authenticateResponseInterceptor 逻辑刷新 token 并重试
 */

interface RequestConfig extends RequestInit {
  /** 请求地址（完整 URL） */
  url: string;
}

class RequestClient {
  private baseURL: string;
  private requestInterceptors: Array<
    (config: RequestConfig) => Promise<RequestConfig>
  > = [];
  private responseInterceptors: Array<{
    fulfilled?: (response: Response) => Promise<Response> | Response;
    rejected?: (error: any) => Promise<Response>;
  }> = [];

  /** 是否正在刷新 token */
  isRefreshing = false;
  /** 刷新 token 期间的请求队列 */
  refreshTokenQueue: Array<(token: string) => void> = [];

  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  addRequestInterceptor(
    interceptor: (config: RequestConfig) => Promise<RequestConfig>,
  ) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: {
    fulfilled?: (response: Response) => Promise<Response> | Response;
    rejected?: (error: any) => Promise<Response>;
  }) {
    this.responseInterceptors.push(interceptor);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config: RequestInit = {},
  ): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    let requestConfig: RequestConfig = {
      ...config,
      method,
      url: fullUrl,
    };

    // 请求拦截器
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }

    const headers: Record<string, string> = {
      ...((requestConfig.headers as Record<string, string>) ?? {}),
    };

    let body: string | undefined;
    if (data !== undefined && method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    let response = await fetch(requestConfig.url, {
      ...requestConfig,
      body,
      headers,
    });

    // 响应拦截器
    for (const interceptor of this.responseInterceptors) {
      try {
        if (interceptor.fulfilled) {
          response = await interceptor.fulfilled(response);
        }
      } catch (error) {
        if (interceptor.rejected) {
          response = await interceptor.rejected(error);
        } else {
          throw error;
        }
      }
    }

    // 401 刷新 token 重试逻辑（对齐官方 authenticateResponseInterceptor）
    // 例外：refresh 接口自身不参与刷新重试 —— 官方 refreshTokenApi 走未挂该拦截器的
    // baseRequestClient，而这里 401 处理写在 RequestClient.request() 内部、对所有实例生效。
    // 若不放行，refresh 的 401 会再次进入 handleUnauthorized，命中 isRefreshing 分支后
    // 把请求挂进队列永久等待，外层 await 永不返回（登录态失效时表现为白屏卡死）。
    const isRefreshRequest = requestConfig.url.includes('/auth/refresh');
    if (response.status === 401 && !isRefreshRequest) {
      const retried = await this.handleUnauthorized(
        requestConfig,
        headers,
        body,
      );
      if (retried) {
        response = retried;
      }
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        (json as any)?.message ??
          `Request failed with status ${response.status}`,
      );
    }

    // 解包 data 字段（code === 0 时返回 data；否则抛出业务错误）
    const envelope = json as { code: number; data: T; message: string };
    if (envelope.code === 0) {
      return envelope.data;
    }
    throw new Error(envelope.message || 'Request failed');
  }

  /** 401 处理：刷新 token 后重放请求 */
  private async handleUnauthorized(
    requestConfig: RequestConfig,
    headers: Record<string, string>,
    body?: string,
  ): Promise<null | Response> {
    // 动态引入避免循环依赖
    const { refreshTokenApi } = await import('#/api/core/auth');
    const { useAccessStore } = await import('#/stores/access');
    const accessStore = useAccessStore.getState();

    const formatToken = (token: null | string) =>
      token ? `Bearer ${token}` : null;

    if (this.isRefreshing) {
      return new Promise<null | Response>((resolve) => {
        this.refreshTokenQueue.push(async (newToken: string) => {
          const auth = formatToken(newToken);
          const retryHeaders = { ...headers };
          if (auth) {
            retryHeaders.Authorization = auth;
          }
          const retry = await fetch(requestConfig.url, {
            ...requestConfig,
            body,
            headers: retryHeaders,
          });
          resolve(retry);
        });
      });
    }

    this.isRefreshing = true;
    try {
      // refreshTokenApi 返回已解包的 token 字符串（requestClient 响应拦截已取 data）；
      // 兼容 { data: token } 包裹形态（对齐官方 baseRequestClient 未解包形态）
      const resp = (await refreshTokenApi()) as any;
      const newToken = typeof resp === 'string' ? resp : (resp?.data ?? '');
      accessStore.setAccessToken(newToken);
      this.refreshTokenQueue.forEach((cb) => cb(newToken));
      this.refreshTokenQueue = [];

      const auth = formatToken(newToken);
      const retryHeaders = { ...headers };
      if (auth) {
        retryHeaders.Authorization = auth;
      }
      return await fetch(requestConfig.url, {
        ...requestConfig,
        body,
        headers: retryHeaders,
      });
    } catch (refreshError) {
      this.refreshTokenQueue.forEach((cb) => cb(''));
      this.refreshTokenQueue = [];

      // 对齐官方 authenticateResponseInterceptor 的 doReAuthenticate：
      // refresh 失败即认定凭证已失效，必须清空本地 token。
      // 不清理会形成死循环：AuthGuard 见 token 非空 → 拉 user/info 又 401 → 跳登录页，
      // 而登录页外层的 LoggedInRedirect 见 token 仍在 → 又弹回受保护路由，
      // 最终页面白屏卡死、既进不去也到不了登录页。
      accessStore.setAccessToken(null);
      accessStore.setIsAccessChecked(false);
      accessStore.setAccessCodes([]);

      console.error('Refresh token failed, please login again.');
      throw refreshError;
    } finally {
      this.isRefreshing = false;
    }
  }

  get<T>(url: string, config?: RequestInit) {
    return this.request<T>('GET', url, undefined, config);
  }

  post<T>(url: string, data?: unknown, config?: RequestInit) {
    return this.request<T>('POST', url, data, config);
  }

  put<T>(url: string, data?: unknown, config?: RequestInit) {
    return this.request<T>('PUT', url, data, config);
  }

  delete<T>(url: string, config?: RequestInit) {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

/** 基础请求客户端（不带业务拦截器） */
export const baseRequestClient = new RequestClient('/api');

/** 业务请求客户端 */
export const requestClient = new RequestClient('/api');

// ---- 与官方 request.ts 对齐的拦截器装配 ----

// 请求头处理：Authorization + Accept-Language
requestClient.addRequestInterceptor(async (config) => {
  const [{ useAccessStore }, { usePreferencesStore }] = await Promise.all([
    import('#/stores/access'),
    import('#/preferences/store'),
  ]);
  const accessStore = useAccessStore.getState();
  const preferences = usePreferencesStore.getState().preferences;

  config.headers = {
    ...((config.headers as Record<string, string>) ?? {}),
    'Accept-Language': preferences.app.locale,
  };
  const token = accessStore.accessToken;
  if (token) {
    (config.headers as Record<string, string>).Authorization =
      `Bearer ${token}`;
  }
  return config;
});

export { RequestClient };
