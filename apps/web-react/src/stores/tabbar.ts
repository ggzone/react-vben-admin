/**
 * 标签栏 Store —— 与官方 @vben/stores useTabbarStore 1:1 对齐
 *
 * React 适配说明：
 * - 导航通过模块级 navigate 引用执行（由 App 挂载时注入）
 * - tabs/visitHistory 持久化到 sessionStorage（对齐官方 persist 配置）
 */
import { create } from 'zustand';

import { createStack, Stack } from '#/lib/stack';
import { usePreferencesStore } from '#/preferences/store';
import { openWindow } from '#/lib/utils';

/** 标签页定义（与官方 TabDefinition 对齐） */
export interface TabDefinition {
  key?: string;
  matched?: Array<{ meta: any; name: string; path: string }>;
  meta: {
    affixTab?: boolean;
    affixTabOrder?: number;
    hideInTab?: boolean;
    keepAlive?: boolean;
    maxNumOfOpenTab?: number;
    newTabTitle?: any;
    title: string;
    [key: string]: any;
  };
  name: string;
  params?: Record<string, string>;
  path: string;
  query?: Record<string, string>;
  fullPath?: string;
}

/** 访问历史记录最大数量 */
const MAX_VISIT_HISTORY = 50;

/** 导航函数引用（由 App 挂载时注入） */
let navigate: ((to: any, options?: { replace?: boolean }) => void) | null =
  null;
let resolveHref: ((to: any) => string) | null = null;
let getCurrentPath: (() => string) | null = null;

export function setTabbarRouter(
  navigateFn: (to: any, options?: { replace?: boolean }) => void,
  resolveFn: (to: any) => string,
  getPathFn: () => string,
) {
  navigate = navigateFn;
  resolveHref = resolveFn;
  getCurrentPath = getPathFn;
}

function isVisitHistory() {
  return usePreferencesStore.getState().preferences.tabbar.visitHistory;
}

function isAffixTab(tab: TabDefinition) {
  return tab?.meta?.affixTab ?? false;
}

function isTabShown(tab: TabDefinition) {
  const matched = tab?.matched ?? [];
  return !tab.meta.hideInTab && matched.every((item) => !item.meta.hideInTab);
}

function getTabKey(tab: any): string {
  const { fullPath, path, meta: { fullPathKey } = {}, query = {} } = tab;
  const pageKey = Array.isArray(query.pageKey)
    ? query.pageKey[0]
    : query.pageKey;
  let rawKey;
  if (pageKey) {
    rawKey = pageKey;
  } else {
    rawKey = fullPathKey === false ? path : (fullPath ?? path);
  }
  try {
    return decodeURIComponent(rawKey);
  } catch {
    return rawKey;
  }
}

function getTabKeyFromTab(tab: TabDefinition): string {
  return tab.key ?? getTabKey(tab);
}

function equalTab(a: TabDefinition, b: TabDefinition) {
  return getTabKeyFromTab(a) === getTabKeyFromTab(b);
}

function cloneTab(route: TabDefinition): TabDefinition {
  if (!route) return route;
  const { matched, meta, ...opt } = route;
  return {
    ...opt,
    matched: matched
      ? matched.map((item) => ({
          meta: item.meta,
          name: item.name,
          path: item.path,
        }))
      : undefined,
    meta: { ...meta, newTabTitle: meta.newTabTitle },
  };
}

interface TabbarState {
  /** 当前打开的标签页列表 */
  tabs: TabDefinition[];
  /** 缓存的标签页 key 集合 */
  cachedTabs: Set<string>;
  /** 需要排除缓存的标签页 */
  excludeCachedTabs: Set<string>;
  /** 拖拽结束索引 */
  dragEndIndex: number;
  /** 标签右键菜单列表 */
  menuList: string[];
  /** 访问历史记录 */
  visitHistory: Stack<string>;
  /** 更新时间 */
  updateTime: number;

  addTab: (routeTab: TabDefinition) => TabDefinition;
  closeTab: (tab: TabDefinition) => Promise<void>;
  closeTabByKey: (key: string) => Promise<void>;
  closeAllTabs: () => Promise<void>;
  closeLeftTabs: (tab: TabDefinition) => Promise<void>;
  closeRightTabs: (tab: TabDefinition) => Promise<void>;
  closeOtherTabs: (tab: TabDefinition) => Promise<void>;
  getAffixTabs: () => TabDefinition[];
  getTabByKey: (key: string) => TabDefinition | undefined;
  getTabs: () => TabDefinition[];
  openTabInNewWindow: (tab: TabDefinition) => Promise<void>;
  toggleTabPin: (tab: TabDefinition) => Promise<void>;
  refresh: () => Promise<void>;
  refreshByName: (name: string) => Promise<void>;
  setAffixTabs: (tabs: any[]) => void;
  sortTabs: (oldIndex: number, newIndex: number) => Promise<void>;
  updateCacheTabs: () => void;
}

// ---- sessionStorage 持久化（对齐官方）----
const STORAGE_KEY = 'core-tabbar';

function loadPersisted(): {
  tabs: TabDefinition[];
  visitHistory: Stack<string>;
} {
  if (typeof sessionStorage === 'undefined') {
    return {
      tabs: [],
      visitHistory: createStack<string>(true, MAX_VISIT_HISTORY),
    };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        tabs: [],
        visitHistory: createStack<string>(true, MAX_VISIT_HISTORY),
      };
    const parsed = JSON.parse(raw);
    return {
      tabs: Array.isArray(parsed?.tabs) ? parsed.tabs : [],
      visitHistory: parsed?.visitHistory
        ? Stack.fromJSON<string>(parsed.visitHistory)
        : createStack<string>(true, MAX_VISIT_HISTORY),
    };
  } catch {
    return {
      tabs: [],
      visitHistory: createStack<string>(true, MAX_VISIT_HISTORY),
    };
  }
}

function persist(state: TabbarState) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tabs: state.tabs, visitHistory: state.visitHistory }),
    );
  } catch {
    // 忽略
  }
}

export const useTabbarStore = create<TabbarState>()((set, get) => {
  const initial = loadPersisted();
  const save = () => persist(get());

  const goToTab = async (tab: TabDefinition) => {
    const { params, path, query } = tab;
    // 对齐官方 _goToTab 的 router.replace({ params, path, query })：
    // vue-router 对象签名转为 react-router 的 { pathname, search }
    const search =
      query && Object.keys(query).length > 0
        ? `?${new URLSearchParams(query).toString()}`
        : '';
    const pathname = path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) =>
      params && key in params ? params[key] : `:${key}`,
    );
    navigate?.({ pathname, search }, { replace: true });
  };

  const goToDefaultTab = async () => {
    const tabs = get().getTabs();
    if (tabs.length <= 0) return;
    const firstTab = tabs[0];
    if (firstTab) await goToTab(firstTab);
  };

  return {
    addTab: (routeTab) => {
      let tab = cloneTab(routeTab);
      if (!tab.key) {
        tab.key = getTabKey(routeTab);
      }
      if (!isTabShown(tab)) {
        return tab;
      }

      const tabs = [...get().tabs];
      const tabIndex = tabs.findIndex((item) => equalTab(item, tab));

      if (tabIndex === -1) {
        const maxCount =
          usePreferencesStore.getState().preferences.tabbar.maxCount;
        const maxNumOfOpenTab = (routeTab?.meta?.maxNumOfOpenTab ??
          -1) as number;
        if (
          maxNumOfOpenTab > 0 &&
          tabs.filter((t) => t.name === routeTab.name).length >= maxNumOfOpenTab
        ) {
          const index = tabs.findIndex((item) => item.name === routeTab.name);
          index !== -1 && tabs.splice(index, 1);
        } else if (maxCount > 0 && tabs.length >= maxCount) {
          const index = tabs.findIndex(
            (item) =>
              !Reflect.has(item.meta, 'affixTab') || !item.meta.affixTab,
          );
          index !== -1 && tabs.splice(index, 1);
        }
        tabs.push(tab);
      } else {
        const currentTab = tabs[tabIndex];
        const mergedTab = {
          ...currentTab,
          ...tab,
          meta: { ...currentTab?.meta, ...tab.meta },
        };
        if (currentTab) {
          const curMeta = currentTab.meta;
          if (Reflect.has(curMeta, 'affixTab'))
            mergedTab.meta.affixTab = curMeta.affixTab;
          if (Reflect.has(curMeta, 'newTabTitle'))
            mergedTab.meta.newTabTitle = curMeta.newTabTitle;
        }
        tab = mergedTab;
        tabs.splice(tabIndex, 1, mergedTab);
      }
      set({ tabs });
      get().updateCacheTabs();
      if (isVisitHistory()) {
        get().visitHistory.push(tab.key as string);
        save();
      }
      return tab;
    },

    cachedTabs: new Set<string>(),
    closeAllTabs: async () => {
      const newTabs = get().tabs.filter((tab) => isAffixTab(tab));
      set({ tabs: newTabs.length > 0 ? newTabs : get().tabs.slice(0, 1) });
      if (isVisitHistory()) {
        get().visitHistory.retain(
          get().tabs.map((item) => getTabKeyFromTab(item)),
        );
      }
      await goToDefaultTab();
      get().updateCacheTabs();
      save();
    },

    closeLeftTabs: async (tab) => {
      const index = get().tabs.findIndex((item) => equalTab(item, tab));
      if (index < 1) return;
      const leftTabs = get().tabs.slice(0, index);
      const keys: string[] = [];
      for (const item of leftTabs) {
        if (!isAffixTab(item)) keys.push(item.key as string);
      }
      await bulkCloseByKeys(keys);
    },

    closeOtherTabs: async (tab) => {
      const keys: string[] = [];
      for (const item of get().tabs) {
        const key = getTabKeyFromTab(item);
        if (key !== getTabKeyFromTab(tab)) {
          if (!isAffixTab(item)) keys.push(item.key as string);
        }
      }
      await bulkCloseByKeys(keys);
    },

    closeRightTabs: async (tab) => {
      const index = get().tabs.findIndex((item) => equalTab(item, tab));
      if (index !== -1 && index < get().tabs.length - 1) {
        const rightTabs = get().tabs.slice(index + 1);
        const keys: string[] = [];
        for (const item of rightTabs) {
          if (!isAffixTab(item)) keys.push(item.key as string);
        }
        await bulkCloseByKeys(keys);
      }
    },

    closeTab: async (tab) => {
      const currentTabKey = getCurrentPath
        ? getTabKey({ fullPath: getCurrentPath(), path: getCurrentPath() })
        : '';
      if (currentTabKey !== getTabKeyFromTab(tab)) {
        set({ tabs: get().tabs.filter((item) => !equalTab(item, tab)) });
        get().updateCacheTabs();
        if (isVisitHistory()) {
          get().visitHistory.remove(getTabKeyFromTab(tab));
          save();
        }
        return;
      }
      if (get().getTabs().length <= 1) {
        console.error('Failed to close the tab; only one tab remains open.');
        return;
      }
      if (isVisitHistory()) {
        get().visitHistory.remove(currentTabKey);
        set({ tabs: get().tabs.filter((item) => !equalTab(item, tab)) });

        let previousTab: TabDefinition | undefined;
        let previousTabKey: string | undefined;
        while (true) {
          previousTabKey = get().visitHistory.pop();
          if (!previousTabKey) break;
          previousTab = get().getTabByKey(previousTabKey);
          if (previousTab) break;
        }
        if (previousTab) {
          await goToTab(previousTab);
        } else {
          await goToDefaultTab();
        }
        save();
        return;
      }
      const index = get()
        .getTabs()
        .findIndex((item) => getTabKeyFromTab(item) === currentTabKey);
      const before = get().getTabs()[index - 1];
      const after = get().getTabs()[index + 1];
      if (after) {
        set({ tabs: get().tabs.filter((item) => !equalTab(item, tab)) });
        await goToTab(after);
      } else if (before) {
        set({ tabs: get().tabs.filter((item) => !equalTab(item, tab)) });
        await goToTab(before);
      }
      get().updateCacheTabs();
      save();
    },

    closeTabByKey: async (key) => {
      const originKey = decodeURIComponent(key);
      const index = get().tabs.findIndex(
        (item) => getTabKeyFromTab(item) === originKey,
      );
      if (index === -1) return;
      const tab = get().tabs[index];
      if (tab) await get().closeTab(tab);
    },

    dragEndIndex: 0,
    excludeCachedTabs: new Set<string>(),

    /** 对齐官方 getters.affixTabs：固定标签按 affixTabOrder 排序 */
    getAffixTabs: () =>
      get()
        .tabs.filter((tab) => isAffixTab(tab))
        .sort(
          (a, b) =>
            ((a.meta?.affixTabOrder ?? 0) as number) -
            ((b.meta?.affixTabOrder ?? 0) as number),
        ),

    getTabByKey: (key) =>
      get()
        .getTabs()
        .find((item) => getTabKeyFromTab(item) === key),

    /** 对齐官方 getters.getTabs：固定标签在前，普通标签随后 */
    getTabs: () => {
      const normalTabs = get().tabs.filter((tab) => !isAffixTab(tab));
      return [...get().getAffixTabs(), ...normalTabs].filter(Boolean);
    },

    menuList: [
      'close',
      'affix',
      'maximize',
      'reload',
      'open-in-new-window',
      'close-left',
      'close-right',
      'close-other',
      'close-all',
    ],

    openTabInNewWindow: async (tab) => {
      const href = resolveHref
        ? resolveHref(tab.fullPath || tab.path)
        : tab.fullPath || tab.path;
      openWindow(new URL(href, location.href).href, { target: '_blank' });
    },

    refresh: async () => {
      const currentPath = getCurrentPath ? getCurrentPath() : '';
      // 通过 key 变化触发页面重渲染（React 适配：刷新当前路由）
      set({ updateTime: Date.now() });
      // 短暂延迟后再次更新，确保触发重渲染
      await new Promise((resolve) => setTimeout(resolve, 200));
      set({ updateTime: Date.now() });
      void currentPath;
    },

    refreshByName: async (_name: string) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    },

    setAffixTabs: (tabs) => {
      for (const tab of tabs) {
        tab.meta.affixTab = true;
        get().addTab({
          key: getTabKey(tab),
          meta: tab.meta,
          name: tab.name,
          path: tab.path,
        });
      }
    },

    sortTabs: async (oldIndex, newIndex) => {
      const tabs = [...get().tabs];
      const currentTab = tabs[oldIndex];
      if (!currentTab) return;
      tabs.splice(oldIndex, 1);
      tabs.splice(newIndex, 0, currentTab);
      set({ tabs, dragEndIndex: get().dragEndIndex + 1 });
      save();
    },

    tabs: initial.tabs,

    toggleTabPin: async (tab) => {
      const affixTab = tab?.meta?.affixTab ?? false;
      if (affixTab) {
        await unpinTab(tab);
      } else {
        await pinTab(tab);
      }
    },

    updateCacheTabs: () => {
      const cacheMap = new Set<string>();
      for (const tab of get().tabs) {
        const keepAlive = tab.meta?.keepAlive;
        if (!keepAlive) continue;
        (tab.matched || []).forEach((t, i) => {
          if (i > 0) cacheMap.add(t.name);
        });
        cacheMap.add(tab.name);
      }
      set({ cachedTabs: cacheMap });
    },

    updateTime: initial.visitHistory ? Date.now() : Date.now(),
    visitHistory: initial.visitHistory,
  };

  // ---- 内部辅助 ----
  async function bulkCloseByKeys(keys: string[]) {
    const keySet = new Set(keys);
    set({
      tabs: get().tabs.filter((item) => !keySet.has(getTabKeyFromTab(item))),
    });
    if (isVisitHistory()) {
      get().visitHistory.remove(...keys);
    }
    get().updateCacheTabs();
    save();
  }

  async function pinTab(tab: TabDefinition) {
    const index = get().tabs.findIndex((item) => equalTab(item, tab));
    if (index === -1) return;
    const oldTab = get().tabs[index];
    tab.meta.affixTab = true;
    tab.meta.title = oldTab?.meta?.title as string;
    const tabs = [...get().tabs];
    tabs.splice(index, 1, tab);
    set({ tabs });
    const affixTabs = tabs.filter((t) => isAffixTab(t));
    const newIndex = affixTabs.findIndex((item) => equalTab(item, tab));
    await get().sortTabs(index, newIndex);
  }

  async function unpinTab(tab: TabDefinition) {
    const index = get().tabs.findIndex((item) => equalTab(item, tab));
    if (index === -1) return;
    const oldTab = get().tabs[index];
    tab.meta.affixTab = false;
    tab.meta.title = oldTab?.meta?.title as string;
    const tabs = [...get().tabs];
    tabs.splice(index, 1, tab);
    set({ tabs });
    const affixTabs = tabs.filter((t) => isAffixTab(t));
    const newIndex = affixTabs.length;
    await get().sortTabs(index, newIndex);
  }
});

export { getTabKey };
