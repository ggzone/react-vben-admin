/**
 * 路由系统 —— react-router-dom v7
 *
 * 与官方 vue-router 结构的对应关系：
 * - 官方 Root(BasicLayout) → 此处 '/' 路由（BasicLayout + AuthGuard）
 * - 官方 Authentication(AuthPageLayout) → 此处 '/auth' 路由
 * - 官方动态路由（Dashboard/Demos/VbenProject 分组）→ 打平挂到 BasicLayout 下，
 *   分组信息保留在 AppRoute 树中用于菜单与面包屑生成（绝对路径由 AppRoute.path 提供）
 */
import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom';

import { AuthGuard, LoggedInRedirect } from '#/router/guard';
import { coreRoutes, fallbackNotFoundRoute } from '#/router/core';
import { dynamicRoutes } from '#/router/dynamic-routes';
import { defaultPreferences } from '#/preferences/config';
import type { AppRoute } from '#/router/types';

/** 懒加载包装 */
function lazyElement(component: AppRoute['component']) {
  if (!component) return undefined;
  const Component = component as React.LazyExoticComponent<
    React.ComponentType<any>
  >;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}

/** 查找布局路由 */
function findLayoutRoute(routes: AppRoute[], name: string) {
  return routes.find((route) => route.name === name);
}

const basicLayoutRoute = findLayoutRoute(coreRoutes, 'Root');
const authLayoutRoute = findLayoutRoute(coreRoutes, 'Authentication');

const BasicLayout = basicLayoutRoute?.component as React.LazyExoticComponent<
  React.ComponentType<any>
>;
const AuthPageLayout = authLayoutRoute?.component as React.LazyExoticComponent<
  React.ComponentType<any>
>;

/** 组装 react-router 路由树 */
const routeObjects: RouteObject[] = [
  {
    children: [
      { element: <Navigate replace to="/auth/login" />, index: true },
      ...(authLayoutRoute?.children?.map((route) => ({
        // 对齐官方 guard.ts：已登录访问 auth 页面 → 重定向到 redirect/homePath
        element: (
          <LoggedInRedirect>{lazyElement(route.component)}</LoggedInRedirect>
        ),
        path: route.path,
      })) ?? []),
    ],
    element: (
      <Suspense fallback={null}>
        <AuthPageLayout />
      </Suspense>
    ),
    path: '/auth',
  },
  {
    children: [
      {
        element: (
          <Navigate replace to={defaultPreferences.app.defaultHomePath} />
        ),
        index: true,
      },
      ...dynamicRoutes.map((route) => ({
        element: lazyElement(route.component),
        path: route.path.replace(/^\//, ''),
      })),
    ],
    element: (
      <Suspense fallback={null}>
        <AuthGuard>
          <BasicLayout />
        </AuthGuard>
      </Suspense>
    ),
    path: '/',
  },
  {
    element: lazyElement(fallbackNotFoundRoute.component),
    path: '*',
  },
];

export const router = createBrowserRouter(routeObjects);
