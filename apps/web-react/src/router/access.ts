/**
 * 菜单生成 —— 与官方 @vben/utils generateMenus 1:1 对齐
 * 根据路由配置生成侧边栏菜单数据
 */
import { filterTree, mapTree, sortTree } from '#/lib/tree';
import type { AppRoute } from '#/router/types';
import type { MenuRecordRaw } from '#/types/menu';

/**
 * 根据 routes 生成菜单列表
 * @param routes - 路由配置列表
 * @param pathMap - 路由 name → 实际 path 的映射（用于嵌套路由的最终路径）
 */
export function generateMenus(
  routes: AppRoute[],
  pathMap: Record<string, string> = {},
): MenuRecordRaw[] {
  let menus = mapTree<AppRoute, MenuRecordRaw>(routes, (route) => {
    const path = pathMap[route.name] ?? route.path ?? '';

    const meta = (route.meta ?? {}) as any;
    const { name: routeName, redirect, children = [] } = route;
    const {
      activeIcon,
      badge,
      badgeType,
      badgeVariants,
      hideChildrenInMenu = false,
      icon,
      link,
      order,
      title = '',
      query,
    } = meta as any;

    // 确保菜单名称不为空
    const name = (title || routeName || '') as string;

    // 处理子菜单
    const resultChildren = hideChildrenInMenu
      ? []
      : ((children as MenuRecordRaw[]) ?? []);

    // 确定最终路径
    const resultPath = hideChildrenInMenu ? redirect || path : link || path;

    return {
      activeIcon,
      badge,
      badgeType,
      badgeVariants,
      children: resultChildren,
      icon,
      name,
      order,
      path: resultPath,
      query,
      show: !meta.hideInMenu,
    };
  });

  // 对菜单进行排序
  menus = sortTree(menus, (a, b) => (a?.order ?? 999) - (b?.order ?? 999));

  // 过滤掉隐藏的菜单项
  return filterTree(menus, (menu) => !!menu.show);
}
