/**
 * 菜单接口 —— 与官方 apps/web-antd/src/api/core/menu.ts 1:1 对齐
 */
import { requestClient } from '#/api/request';

/** 菜单记录（后端返回的树形结构） */
export interface MenuRecordRaw {
  children?: MenuRecordRaw[];
  component?: string;
  meta: Record<string, any>;
  name: string;
  path?: string;
  redirect?: string;
}

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  return requestClient.get<MenuRecordRaw[]>('/menu/all');
}
