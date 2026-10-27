/**
 * 路由类型定义
 */
import type { ComponentType, LazyExoticComponent } from 'react';

export type AppRouteComponent =
  | ComponentType<any>
  | LazyExoticComponent<ComponentType<any>>;

export interface AppRouteMeta {
  /** 菜单可见性所需的权限码（任一命中即可见；未声明表示所有登录用户可见） */
  authority?: string[];
  /** 是否固定标签页 */
  affixTab?: boolean;
  /** 徽标类型 */
  badgeType?: string;
  /** 图标 */
  icon?: string;
  /** 在菜单中隐藏 */
  hideInMenu?: boolean;
  /** 在标签页中隐藏 */
  hideInTab?: boolean;
  /** 在面包屑中隐藏 */
  hideInBreadcrumb?: boolean;
  /** 是否缓存页面 */
  keepAlive?: boolean;
  /** 外链地址 */
  link?: string;
  /** 排序 */
  order?: number;
  /** 标题（i18n key 或文本） */
  title: string;
  [key: string]: unknown;
}

export interface AppRoute {
  children?: AppRoute[];
  /** 懒加载组件 */
  component?: AppRouteComponent;
  meta?: AppRouteMeta;
  /** 路由名称（唯一） */
  name: string;
  path: string;
  redirect?: string;
}

/** 遍历路由树 */
export function traverseRoutes(
  routes: AppRoute[],
  cb: (route: AppRoute) => void,
) {
  for (const route of routes) {
    cb(route);
    if (route.children?.length) {
      traverseRoutes(route.children, cb);
    }
  }
}

/** 获取所有路由名称 */
export function getRouteNames(routes: AppRoute[]): string[] {
  const names: string[] = [];
  traverseRoutes(routes, (route) => {
    if (route.name) names.push(route.name);
  });
  return names;
}
