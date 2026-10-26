/**
 * 标签栏逻辑 Hook —— 与官方 basic/tabbar/use-tabbar.ts 1:1 对齐
 * 负责：当前 tab 高亮、路由变化自动加 tab、固定 tab 初始化、右键菜单生成
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  ArrowLeftToLine,
  ArrowRightLeft,
  ArrowRightToLine,
  ExternalLink,
  FoldHorizontal,
  Fullscreen,
  Minimize2,
  Pin,
  PinOff,
  RotateCw,
  X,
} from 'lucide-react';

import { $t } from '#/locales';
import { filterTree } from '#/lib/tree';
import { dynamicRoutes } from '#/router/dynamic-routes';
import { findRouteChain } from '#/router/route-chain';
import { getTabKey, useTabbarStore, type TabDefinition } from '#/stores/tabbar';

export interface ContextMenuItem {
  disabled?: boolean;
  handler: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  key: string;
  separator?: boolean;
  text: string;
}

export function useTabbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = useTabbarStore((state) => state.tabs);
  const updateTime = useTabbarStore((state) => state.updateTime);
  const addTab = useTabbarStore((state) => state.addTab);
  const closeTabByKey = useTabbarStore((state) => state.closeTabByKey);
  const sortTabs = useTabbarStore((state) => state.sortTabs);
  const toggleTabPin = useTabbarStore((state) => state.toggleTabPin);
  const refresh = useTabbarStore((state) => state.refresh);
  const menuList = useTabbarStore((state) => state.menuList);

  /** 当前激活的 tab key */
  const currentActive = useMemo(
    () =>
      getTabKey({
        fullPath: location.pathname + location.search,
        path: location.pathname,
      }),
    [location.pathname, location.search],
  );

  /** 初始化固定标签页（对齐官方 initAffixTabs：从路由树筛选 affixTab） */
  useEffect(() => {
    const affixTabs = filterTree(
      dynamicRoutes,
      (route) => !!(route.meta as any)?.affixTab,
    );
    useTabbarStore.getState().setAffixTabs(affixTabs);
  }, []);

  /** 路由变化自动添加 tab（对齐官方 watch route.fullPath → addTab） */
  useEffect(() => {
    const pathname = location.pathname;
    const search = location.search;
    // 从 AppRoute 树中查找当前路由链，取最后一级的 meta（对齐官方 route.matched 末级 meta）
    const chain = findRouteChain(pathname) ?? [];
    const last = chain[chain.length - 1];
    const meta = (last?.meta ?? {}) as any;
    addTab({
      fullPath: pathname + search,
      matched: chain.map((item) => ({
        meta: (item.meta ?? {}) as any,
        name: item.name,
        path: item.path,
      })),
      meta: { ...meta, title: meta.title ?? pathname },
      name: last?.name ?? pathname,
      path: pathname,
    } as TabDefinition);
  }, [location.pathname, location.search, addTab]);

  const handleClick = useCallback(
    (key: string) => {
      const tab = useTabbarStore.getState().getTabByKey(key);
      if (tab) navigate(tab.fullPath || tab.path);
    },
    [navigate],
  );

  const handleClose = useCallback(
    async (key: string) => {
      await closeTabByKey(key);
    },
    [closeTabByKey],
  );

  const handleSortTabs = useCallback(
    async (oldIndex: number, newIndex: number) => {
      await sortTabs(oldIndex, newIndex);
    },
    [sortTabs],
  );

  /** 生成右键菜单（对齐官方 createContextMenus） */
  const createContextMenus = useCallback(
    (tab: TabDefinition | undefined): ContextMenuItem[] => {
      if (!tab) return [];
      const tabs = useTabbarStore.getState().tabs;
      const index = tabs.findIndex(
        (item) => (item.key ?? item.path) === (tab.key ?? tab.path),
      );
      const affixTab = tab?.meta?.affixTab ?? false;
      const isFirst = index === 0;
      const isLast = index === tabs.length - 1;
      const closeDisabled = isFirst && isLast;

      const menus: ContextMenuItem[] = [
        {
          disabled: closeDisabled,
          handler: async () => {
            await closeTabByKey(tab.key ?? '');
          },
          icon: X,
          key: 'close',
          text: $t('preferences.tabbar.contextMenu.close'),
        },
        {
          handler: async () => {
            await toggleTabPin(tab);
          },
          icon: affixTab ? PinOff : Pin,
          key: 'affix',
          text: affixTab
            ? $t('preferences.tabbar.contextMenu.unpin')
            : $t('preferences.tabbar.contextMenu.pin'),
        },
        {
          handler: async () => {
            await refresh();
          },
          icon: RotateCw,
          key: 'reload',
          text: $t('preferences.tabbar.contextMenu.reload'),
        },
        {
          handler: async () => {
            useTabbarStore.getState().openTabInNewWindow(tab);
          },
          icon: ExternalLink,
          key: 'open-in-new-window',
          separator: true,
          text: $t('preferences.tabbar.contextMenu.openInNewWindow'),
        },
        {
          disabled: isFirst,
          handler: async () => {
            await useTabbarStore.getState().closeLeftTabs(tab);
          },
          icon: ArrowLeftToLine,
          key: 'close-left',
          text: $t('preferences.tabbar.contextMenu.closeLeft'),
        },
        {
          disabled: isLast,
          handler: async () => {
            await useTabbarStore.getState().closeRightTabs(tab);
          },
          icon: ArrowRightToLine,
          key: 'close-right',
          separator: true,
          text: $t('preferences.tabbar.contextMenu.closeRight'),
        },
        {
          disabled: closeDisabled,
          handler: async () => {
            await useTabbarStore.getState().closeOtherTabs(tab);
          },
          icon: FoldHorizontal,
          key: 'close-other',
          text: $t('preferences.tabbar.contextMenu.closeOther'),
        },
        {
          disabled: closeDisabled,
          handler: async () => {
            await useTabbarStore.getState().closeAllTabs();
          },
          icon: ArrowRightLeft,
          key: 'close-all',
          text: $t('preferences.tabbar.contextMenu.closeAll'),
        },
      ];

      return menus.filter((item) => menuList.includes(item.key));
    },
    [closeTabByKey, menuList, refresh, toggleTabPin],
  );

  // updateTime 变化触发重渲染（官方 watch updateTime）
  void updateTime;

  return {
    createContextMenus,
    currentActive,
    currentTabs: tabs,
    handleClick,
    handleClose,
    handleSortTabs,
  };
}

export default useTabbar;
