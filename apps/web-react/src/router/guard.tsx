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

import { getAccessCodesApi } from '#/api/core/auth';
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
  const accessCodes = useAccessStore((state) => state.accessCodes);
  const setAccessCodes = useAccessStore((state) => state.setAccessCodes);
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

        // frontend 模式：根据路由树（含分组层级）生成菜单，并按权限码过滤
        // （authority 任一命中即可见）
        //
        // 权限码来源按优先级取，缺一不可：
        // 1. /user/info 返回体里的 accessCodes —— rust 后端会下发（本项目
        //    React 版固定对接 rust，见 vite.config.ts 的 VITE_API_TARGET），
        //    是「当前账号」最权威的一条，命中后同时写回 store（纠正过期旧码）
        // 2. accessStore.accessCodes —— 登录时由 /auth/codes 写入并持久化，
        //    刷新页面后依然有效（后端未下发字段时兜底）
        // 3. 兜底再拉一次 /auth/codes
        //
        // 历史缺陷：这里原来只读 `info.accessCodes` 且不做兜底，
        // 一旦该字段缺失 → 权限码为空数组 → 所有声明 authority 的菜单
        // （系统管理四个子页）被整体过滤，目录因「子项为空」也被移除，
        // 表现为「系统管理菜单消失」。
        // 注意：内置 vite-mock 的 /auth/codes 只返回 AC_* 演示码、不含
        // system:*:list，因此纯 mock 模式下系统管理菜单本就不可见 —— 属于预期，
        // 该模式仅用于无后端时看静态页面。
        let codes: string[] = [];
        const fromInfo = (info as any)?.accessCodes;
        if (Array.isArray(fromInfo) && fromInfo.length > 0) {
          codes = fromInfo;
          setAccessCodes(codes);
        } else if (accessCodes.length > 0) {
          codes = accessCodes;
        } else {
          try {
            codes = await getAccessCodesApi();
            if (!cancelled && codes.length > 0) setAccessCodes(codes);
          } catch {
            codes = [];
          }
        }
        if (cancelled) return;

        const menus = generateMenus(allRoutes, {}, codes);
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
    accessCodes,
    accessToken,
    fetchUserInfo,
    isAccessChecked,
    setAccessCodes,
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
