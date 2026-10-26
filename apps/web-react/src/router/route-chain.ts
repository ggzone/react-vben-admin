/**
 * 路由链查询 —— 从 AppRoute 树中查找路径的祖先链
 * 用于面包屑（对齐官方 route.matched 的父子链）与标签页元信息
 */
import { allRoutes } from '#/router/dynamic-routes';
import type { AppRoute } from '#/router/types';

/** 在路由树中查找路径，返回从根到目标的链 */
export function findRouteChain(
  path: string,
  routes: AppRoute[] = allRoutes,
): AppRoute[] | null {
  for (const route of routes) {
    if (route.path === path) {
      return [route];
    }
    if (route.children?.length) {
      const chain = findRouteChain(path, route.children);
      if (chain) {
        return [route, ...chain];
      }
    }
  }
  return null;
}

/** 查找单个路由 */
export function findRoute(
  path: string,
  routes: AppRoute[] = allRoutes,
): AppRoute | null {
  const chain = findRouteChain(path, routes);
  return chain ? chain[chain.length - 1] : null;
}
