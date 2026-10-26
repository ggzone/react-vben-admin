/**
 * 动态路由集合 —— 由路由模块聚合，供路由树与菜单生成共用
 */
import dashboardRoutes from '#/router/modules/dashboard';
import demosRoutes from '#/router/modules/demos';
import systemRoutes from '#/router/modules/system';
import vbenRoutes from '#/router/modules/vben';
import type { AppRoute } from '#/router/types';

/** 打平动态路由（去掉分组层，分组由 AppRoute 树保留给菜单/面包屑使用） */
function flattenRoutes(routes: AppRoute[]): AppRoute[] {
  const result: AppRoute[] = [];
  for (const route of routes) {
    if (route.children?.length) {
      result.push(...flattenRoutes(route.children));
    } else {
      result.push(route);
    }
  }
  return result;
}

/** 全部动态路由（Dashboard/Demos/System/Vben 模块） */
export const allRoutes: AppRoute[] = [
  ...dashboardRoutes,
  ...demosRoutes,
  ...systemRoutes,
  ...vbenRoutes,
];

/** 打平后的动态路由（用于 react-router 路由树） */
export const dynamicRoutes: AppRoute[] = flattenRoutes(allRoutes);
