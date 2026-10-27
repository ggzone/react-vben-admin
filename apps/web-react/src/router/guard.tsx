/**
 * 路由守卫 —— 与官方 apps/web-antd/src/router/guard.ts 行为 1:1 对齐
 *
 * 官方逻辑：
 * 1. coreRouteNames（/auth 等核心路由）不拦截 —— 由 react-router 路由树天然隔离
 * 2. 无 accessToken → 跳转登录页（携带 redirect）
 * 3. isAccessChecked → 已生成过菜单/路由，直接放行
 * 4. 未检查 → 拉取用户信息，生成菜单，保存后放行
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { LOGIN_PATH } from '#/constants';
import { usePreferencesStore } from '#/preferences/store';
import { useAccessStore } from '#/stores/access';
import { useAuthStore } from '#/stores/auth';
import { useUserStore } from '#/stores/user';
import { allRoutes } from '#/router/dynamic-routes';
import { generateMenus } from '#/router/access';

export function AuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const accessToken = useAccessStore((state) => state.accessToken);
  const isAccessChecked = useAccessStore((state) => state.isAccessChecked);
  const preferences = usePreferencesStore((state) => state.preferences);

  const userInfo = useUserStore((state) => state.userInfo);
  const fetchUserInfo = useAuthStore((state) => state.fetchUserInfo);
  const setAccessMenus = useAccessStore((state) => state.setAccessMenus);
  const setIsAccessChecked = useAccessStore(
    (state) => state.setIsAccessChecked,
  );

  const [checkFailed, setCheckFailed] = useState(false);

  // 未检查 → 拉取用户信息并生成菜单（对齐官方 generateAccess）
  // 注意：hooks 必须无条件执行，置于所有条件返回之前（否则 isAccessChecked 翻转时
  // 会少渲染一个 hook，触发 React "Rendered fewer hooks than expected"）
  useEffect(() => {
    if (!accessToken || isAccessChecked) return;
    let cancelled = false;

    async function checkAccess() {
      try {
        const info = userInfo || (await fetchUserInfo());
        if (cancelled) return;

        // frontend 模式：根据路由树（含分组层级）生成菜单，
        // 并按后端 /user/info 下发的 accessCodes 过滤（authority 任一命中即可见）
        const menus = generateMenus(allRoutes, {}, (info as any)?.accessCodes ?? []);
        setAccessMenus(menus);
        setIsAccessChecked(true);
      } catch {
        if (!cancelled) {
          setCheckFailed(true);
        }
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    fetchUserInfo,
    isAccessChecked,
    setIsAccessChecked,
    setAccessMenus,
    userInfo,
  ]);

  // 无 token → 登录页（对齐官方：默认首页不携带 redirect）
  if (!accessToken) {
    const isDefaultHome = location.pathname === preferences.app.defaultHomePath;
    const redirect = isDefaultHome
      ? ''
      : encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        replace
        to={redirect ? `${LOGIN_PATH}?redirect=${redirect}` : LOGIN_PATH}
      />
    );
  }

  // 已检查过权限 → 直接渲染
  if (isAccessChecked) {
    return <>{children}</>;
  }

  // 检查失败（token 失效等）→ 回登录页
  if (checkFailed) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate replace to={`${LOGIN_PATH}?redirect=${redirect}`} />;
  }

  // 检查中 → 渲染空（官方为 loading 状态）
  return null;
}

/**
 * 已登录访问 auth 页面（登录/注册等）→ 重定向走
 * 对齐官方 guard.ts:55-61：
 * to.path === LOGIN_PATH && accessToken
 *   → redirect query || userInfo.homePath || defaultHomePath
 */
export function LoggedInRedirect({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const accessToken = useAccessStore((state) => state.accessToken);
  const userInfo = useUserStore((state) => state.userInfo);
  const preferences = usePreferencesStore((state) => state.preferences);

  if (!accessToken) {
    return <>{children}</>;
  }

  const redirect = searchParams.get('redirect');
  const target = redirect
    ? decodeURIComponent(redirect)
    : userInfo?.homePath || preferences.app.defaultHomePath;
  return <Navigate replace to={target} />;
}
