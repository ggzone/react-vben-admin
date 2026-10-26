/**
 * 用户接口 —— 与官方 apps/web-antd/src/api/core/user.ts 1:1 对齐
 */
import { requestClient } from '#/api/request';

/** 用户信息（与后端 UserInfo 结构一致，camelCase） */
export interface UserInfo {
  avatar?: string;
  homePath?: string;
  id: number;
  realName: string;
  roles: string[];
  username: string;
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/user/info');
}
