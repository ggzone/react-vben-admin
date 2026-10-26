/**
 * 访问权限 Store —— 与官方 @vben/stores useAccessStore 1:1 对齐
 * 持久化格式与官方 pinia-plugin-persistedstate 一致：
 * key = `${namespace}-core-access`，值为 picked 字段的 JSON
 */
import { create } from 'zustand';

import type { MenuRecordRaw } from '#/types/menu';

export interface AccessState {
  /** 可访问的菜单列表 */
  accessMenus: MenuRecordRaw[];
  /** 权限码 */
  accessCodes: string[];
  /** 登录 accessToken */
  accessToken: null | string;
  /** 是否已经检查过权限 */
  isAccessChecked: boolean;
  /** 登录是否过期 */
  loginExpired: boolean;
  /** 登录 refreshToken */
  refreshToken: null | string;
  /** 设置权限码 */
  setAccessCodes: (codes: string[]) => void;
  /** 设置可访问菜单 */
  setAccessMenus: (menus: MenuRecordRaw[]) => void;
  /** 设置 accessToken */
  setAccessToken: (token: null | string) => void;
  /** 设置权限检查状态 */
  setIsAccessChecked: (isAccessChecked: boolean) => void;
  /** 设置登录过期状态 */
  setLoginExpired: (loginExpired: boolean) => void;
  /** 设置 refreshToken */
  setRefreshToken: (token: null | string) => void;
}

const PERSIST_KEY_SUFFIX = '-core-access';

let namespace = '';

/** 设置命名空间（偏好初始化后调用，与官方 initStores({ namespace }) 对齐），并重新加载持久化状态 */
export function setAccessNamespace(ns: string) {
  namespace = ns;
  const loaded = loadFromStorage();
  useAccessStore.setState({
    accessCodes: loaded.accessCodes ?? [],
    accessToken: loaded.accessToken ?? null,
    refreshToken: loaded.refreshToken ?? null,
  });
}

function getPersistKey() {
  return namespace ? `${namespace}${PERSIST_KEY_SUFFIX}` : null;
}

function loadFromStorage(): Partial<AccessState> {
  const key = getPersistKey();
  if (!key || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      accessCodes: Array.isArray(parsed?.accessCodes) ? parsed.accessCodes : [],
      accessToken:
        typeof parsed?.accessToken === 'string' ? parsed.accessToken : null,
      refreshToken:
        typeof parsed?.refreshToken === 'string' ? parsed.refreshToken : null,
    };
  } catch {
    return {};
  }
}

function persist(state: AccessState) {
  const key = getPersistKey();
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        accessCodes: state.accessCodes,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    );
  } catch {
    // 忽略存储失败（如隐私模式）
  }
}

export const useAccessStore = create<AccessState>()((set, get) => {
  const initial = loadFromStorage();

  const update = (partial: Partial<AccessState>) => {
    set(partial);
    persist(get());
  };

  return {
    ...initial,
    accessCodes: initial.accessCodes ?? [],
    accessMenus: [],
    accessToken: initial.accessToken ?? null,
    isAccessChecked: false,
    loginExpired: false,
    refreshToken: initial.refreshToken ?? null,

    setAccessCodes: (codes: string[]) => update({ accessCodes: codes }),
    setAccessMenus: (accessMenus) => set({ accessMenus }),
    setAccessToken: (token: null | string) => update({ accessToken: token }),
    setIsAccessChecked: (isAccessChecked: boolean) => set({ isAccessChecked }),
    setLoginExpired: (loginExpired: boolean) => set({ loginExpired }),
    setRefreshToken: (token: null | string) => update({ refreshToken: token }),
  };
});
