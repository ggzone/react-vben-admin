/**
 * 系统管理 API —— 对齐 playground src/api/system/*（数据源 backend-mock）
 */
import { requestClient } from '#/api/request';

export namespace SystemApi {
  export interface DeptItem {
    children?: DeptItem[];
    createTime?: string;
    id: string;
    name: string;
    pid: string | number;
    remark?: string;
    status?: number;
  }

  export interface DictItem {
    code?: string;
    createTime?: string;
    id: string;
    label?: string;
    name: string;
    remark?: string;
    sort?: number;
    status?: number;
    value?: string;
  }

  export interface MenuItem {
    authCode?: string;
    children?: MenuItem[];
    component?: string;
    createTime?: string;
    id: string;
    meta?: { icon?: string; title?: string };
    name: string;
    path?: string;
    pid: string | number;
    status?: number;
    type?: string;
  }

  export interface RoleItem {
    createTime?: string;
    id: string;
    name: string;
    remark?: string;
    sort?: number;
    status?: number;
  }

  export interface UserItem {
    createTime?: string;
    deptId?: string;
    id: string;
    name: string;
    remark?: string;
    status?: number;
  }

  export interface PageResult<T> {
    items: T[];
    total: number;
  }
}

/** 查询对象转 query string（requestClient 不内置 params 支持） */
function toQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/** 分页查询用户 */
export function getUserList(params: Record<string, any>) {
  return requestClient.get<SystemApi.PageResult<SystemApi.UserItem>>(
    `/system/user/list${toQuery(params)}`,
  );
}

/** 部门树列表 */
export function getDeptList() {
  return requestClient.get<SystemApi.DeptItem[]>('/system/dept/list');
}

/** 角色列表 */
export function getRoleList(params?: Record<string, any>) {
  return requestClient.get<SystemApi.PageResult<SystemApi.RoleItem>>(
    `/system/role/list${toQuery(params)}`,
  );
}

/** 菜单列表 */
export function getMenuList() {
  return requestClient.get<SystemApi.MenuItem[]>('/system/menu/list');
}

/** 字典类型列表 */
export function getDictList(params?: Record<string, any>) {
  return requestClient.get<SystemApi.PageResult<SystemApi.DictItem>>(
    `/system/dict/list${toQuery(params)}`,
  );
}
