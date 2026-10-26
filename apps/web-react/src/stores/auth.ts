/**
 * 认证 Store —— 与官方 apps/web-antd/src/store/auth.ts 1:1 对齐
 */
import { create } from 'zustand';

import {
  getAccessCodesApi,
  getUserInfoApi,
  loginApi,
  logoutApi,
} from '#/api/core';
import { LOGIN_PATH } from '#/constants';
import { usePreferencesStore } from '#/preferences/store';
import { useAccessStore } from '#/stores/access';
import { useUserStore } from '#/stores/user';

/** 导航函数引用（由 App 挂载时注入） */
let navigate: ((to: string, options?: { replace?: boolean }) => void) | null =
  null;
let getCurrentPath: (() => string) | null = null;

export function setAuthRouter(
  navigateFn: (to: string, options?: { replace?: boolean }) => void,
  getPathFn: () => string,
) {
  navigate = navigateFn;
  getCurrentPath = getPathFn;
}

interface AuthState {
  loginLoading: boolean;
  /** 是否处于锁屏状态（对齐官方 accessStore.isLocked） */
  isLocked: boolean;
  /** 锁屏密码（对齐官方 accessStore.lockScreenPassword） */
  lockScreenPassword: string;
  authLogin: (
    params: { password?: string; username?: string },
    onSuccess?: () => Promise<void> | void,
  ) => Promise<{ userInfo: null | any }>;
  logout: (redirect?: boolean) => Promise<void>;
  fetchUserInfo: () => Promise<any>;
  /** 锁屏：记录密码并进入锁屏态 */
  lockScreen: (password: string) => void;
  /** 解锁 */
  unlockScreen: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  isLocked: false,
  lockScreenPassword: '',
  lockScreen: (password) =>
    set({ isLocked: true, lockScreenPassword: password }),
  unlockScreen: () => set({ isLocked: false, lockScreenPassword: '' }),
  authLogin: async (params, onSuccess) => {
    const accessStore = useAccessStore.getState();
    const userStore = useUserStore.getState();
    const preferencesStore = usePreferencesStore.getState();

    let userInfo: null | any = null;
    set({ loginLoading: true });
    try {
      const { accessToken } = await loginApi(params);

      if (accessToken) {
        accessStore.setAccessToken(accessToken);

        const [fetchUserInfoResult, accessCodes] = await Promise.all([
          get().fetchUserInfo(),
          getAccessCodesApi(),
        ]);

        userInfo = fetchUserInfoResult;
        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(accessCodes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else if (onSuccess) {
          await onSuccess();
        } else {
          navigate?.(
            userInfo?.homePath ||
              preferencesStore.preferences.app.defaultHomePath,
            { replace: true },
          );
        }
      }
    } finally {
      set({ loginLoading: false });
    }

    return { userInfo };
  },

  fetchUserInfo: async () => {
    const userInfo = await getUserInfoApi();
    useUserStore.getState().setUserInfo(userInfo);
    return userInfo;
  },

  loginLoading: false,

  logout: async (redirect = true) => {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }

    // 重置所有 store（对齐官方 resetAllStores）
    const accessStore = useAccessStore.getState();
    const userStore = useUserStore.getState();
    accessStore.setAccessToken(null);
    accessStore.setAccessCodes([]);
    accessStore.setIsAccessChecked(false);
    accessStore.setLoginExpired(false);
    userStore.setUserInfo(null);

    navigate?.(
      `${LOGIN_PATH}${redirect && getCurrentPath ? `?redirect=${encodeURIComponent(getCurrentPath())}` : ''}`,
      { replace: true },
    );
  },
}));
