/**
 * 用户信息 Store —— 与官方 @vben/stores useUserStore 1:1 对齐
 */
import { create } from 'zustand';

import type { UserInfo } from '#/api/core/user';

interface UserState {
  userInfo: UserInfo | null;
  userRoles: string[];
  setUserInfo: (userInfo: UserInfo | null) => void;
  setUserRoles: (roles: string[]) => void;
}

export const useUserStore = create<UserState>()((set) => ({
  setUserInfo: (userInfo) =>
    set({
      userInfo,
      userRoles: userInfo?.roles ?? [],
    }),
  setUserRoles: (userRoles) => set({ userRoles }),
  userInfo: null,
  userRoles: [],
}));
