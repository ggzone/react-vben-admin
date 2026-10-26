/**
 * Vite Mock 中间件 —— 与官方 apps/backend-mock 接口行为 1:1 对齐
 * 在 dev/preview 服务器内直接提供 /api/* 接口，无需启动外部 mock 服务
 */
import type { Connect, Plugin, ViteDevServer } from 'vite';

import { createHmac } from 'node:crypto';

import { MOCK_CODES, MOCK_MENUS, MOCK_USERS } from './mock-data';

/**
 * 与 apps/backend-mock 一致的 access token 签发（HS256 + access_token_secret）
 *
 * 必须真签名：系统管理接口通过 vite proxy 转发到 backend-mock(5320)，
 * 那边用 jwt.verify 校验，假 base64 token 会 401，触发刷新链路把 token 清空。
 */
const ACCESS_TOKEN_SECRET = 'access_token_secret';

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

/** 简单的 base64 token（模拟 JWT，仅本地开发使用） */
function generateAccessToken(user: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 }),
  );
  const signature = createHmac('sha256', ACCESS_TOKEN_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyAccessToken(authHeader?: string): null | Record<string, any> {
  if (!authHeader?.startsWith('Bearer')) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  // JWT 结构：header.payload.signature，仅解码 payload 段
  // （对齐官方 jwt-utils.ts 的 jwt.verify 行为）
  const tokenParts = parts[1]?.split('.') ?? [];
  if (tokenParts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(tokenParts[1] as string));
    // exp 为秒级时间戳（与 backend-mock jsonwebtoken 一致）
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function responseSuccess<T>(data: T) {
  return { code: 0, data, error: null, message: 'ok' };
}

function responseError(message: string) {
  return { code: -1, data: null, error: message, message };
}

function sendJson(res: any, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

async function readJsonBody(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function mockMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/')) {
      next();
      return;
    }

    const path = url.split('?')[0].replace(/^\/api/, '');
    const method = (req.method ?? 'GET').toUpperCase();

    // 系统管理接口交给 vite proxy 转发 backend-mock（与 playground 同一数据源）
    if (path.startsWith('/system/')) {
      next();
      return;
    }

    // 登录
    if (path === '/auth/login' && method === 'POST') {
      const { password, username } = await readJsonBody(req);
      if (!password || !username) {
        sendJson(res, responseError('Username and password are required'), 400);
        return;
      }
      const findUser = MOCK_USERS.find(
        (item) => item.username === username && item.password === password,
      );
      if (!findUser) {
        sendJson(res, responseError('Username or password is incorrect.'), 403);
        return;
      }
      sendJson(res, responseSuccess({ ...findUser, accessToken: generateAccessToken(findUser) }));
      return;
    }

    // 刷新 token
    if (path === '/auth/refresh' && method === 'POST') {
      sendJson(res, responseSuccess(generateAccessToken(MOCK_USERS[0])));
      return;
    }

    // 退出登录
    if (path === '/auth/logout' && method === 'POST') {
      sendJson(res, responseSuccess(null));
      return;
    }

    // 以下接口需要鉴权
    const userinfo = verifyAccessToken(req.headers.authorization);

    // 权限码
    if (path === '/auth/codes' && method === 'GET') {
      if (!userinfo) {
        sendJson(res, responseError('Unauthorized'), 401);
        return;
      }
      const codes = MOCK_CODES.find((item) => item.username === userinfo.username)?.codes ?? [];
      sendJson(res, responseSuccess(codes));
      return;
    }

    // 用户信息
    if (path === '/user/info' && method === 'GET') {
      if (!userinfo) {
        sendJson(res, responseError('Unauthorized'), 401);
        return;
      }
      sendJson(res, responseSuccess(userinfo));
      return;
    }

    // 全部菜单
    if (path === '/menu/all' && method === 'GET') {
      if (!userinfo) {
        sendJson(res, responseError('Unauthorized'), 401);
        return;
      }
      const menus = MOCK_MENUS.find((item) => item.username === userinfo.username)?.menus ?? [];
      sendJson(res, responseSuccess(menus));
      return;
    }

    sendJson(res, responseError('Not Found'), 404);
  };
}

export function viteMockPlugin(): Plugin {
  return {
    configureServer(server: ViteDevServer) {
      server.middlewares.use(mockMiddleware());
    },
    configurePreviewServer(server: ViteDevServer) {
      server.middlewares.use(mockMiddleware());
    },
    name: 'vben-mock',
  };
}
