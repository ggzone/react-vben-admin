/**
 * 系统管理 API —— 对齐 playground src/api/system/*（数据源 backend-mock）
 */
import { requestClient } from '#/api/request';

export namespace SystemApi {
  /** 菜单/路由元信息（后端按 JSON 原样存取，字段较多） */
  export interface MenuMeta {
    activeIcon?: string;
    affixTab?: boolean;
    badge?: string;
    badgeType?: string;
    badgeVariants?: string;
    hideChildrenInMenu?: boolean;
    hideInBreadcrumb?: boolean;
    hideInMenu?: boolean;
    hideInTab?: boolean;
    icon?: string;
    iframeSrc?: string;
    keepAlive?: boolean;
    link?: string;
    title?: string;
    [key: string]: any;
  }

  export interface DeptItem {
    children?: DeptItem[];
    createTime?: string;
    id: string;
    /** 负责人（后端新增返回，编辑表单回填） */
    leader?: string;
    name: string;
    pid: string | number;
    remark?: string;
    /** 排序（后端新增返回，编辑表单回填） */
    sort?: number;
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
    meta?: MenuMeta;
    name: string;
    path?: string;
    pid: string | number;
    /** 排序（后端新增返回，编辑表单回填） */
    sort?: number;
    status?: number;
    type?: string;
  }

  export interface RoleItem {
    /** 角色标识（创建后不可修改） */
    code?: string;
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
    /** 性别：0 未设置 / 1 男 / 2 女（官方字典 user_gender） */
    gender?: number;
    id: string;
    /** 用户名称（后端 real_name） */
    name: string;
    remark?: string;
    status?: number;
    /** 登录用户名（后端新增返回，编辑时需要） */
    username?: string;
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

/* ============================ 写操作 ============================ */

/**
 * 注意：后端 `*Body` 结构体没有 `serde(rename_all = "camelCase")`
 * （只有响应体 Item 有），所以请求体必须用 snake_case 字段。
 * 而列表/详情返回的是 camelCase，两者不一致，这里统一在 API 层做映射，
 * 页面层始终使用 camelCase，与 `SystemApi.UserItem` 等类型保持一致。
 */

/** 新增用户（后端必填：username、password；gender 0 未设置/1 男/2 女） */
export function createUser(payload: {
  deptId?: string | number;
  gender?: number;
  password: string;
  realName?: string;
  status?: number;
  username: string;
}) {
  return requestClient.post<number>('/system/user', {
    dept_id: payload.deptId ? Number(payload.deptId) : 0,
    gender: payload.gender ?? 0,
    password: payload.password,
    real_name: payload.realName ?? '',
    status: payload.status ?? 1,
    username: payload.username,
  });
}

/** 修改用户（可改姓名、部门、状态、性别；用户名不可改） */
export function updateUser(
  id: string,
  payload: {
    deptId?: string | number;
    gender?: number;
    realName?: string;
    status?: number;
  },
) {
  return requestClient.put('/system/user', {
    dept_id: payload.deptId ? Number(payload.deptId) : 0,
    gender: payload.gender ?? 0,
    id,
    real_name: payload.realName ?? '',
    status: payload.status ?? 1,
  });
}

/** 删除用户 */
export function deleteUser(id: string) {
  return requestClient.delete(`/system/user${toQuery({ id })}`);
}

/** 重置指定用户密码 */
export function resetUserPassword(id: string, password: string) {
  return requestClient.put('/system/user/password', { id, password });
}

/** 新增角色（后端必填：name、code） */
export function createRole(payload: {
  code: string;
  name: string;
  remark?: string;
  status?: number;
}) {
  return requestClient.post<number>('/system/role', {
    code: payload.code,
    name: payload.name,
    remark: payload.remark ?? '',
    status: payload.status ?? 1,
  });
}

/** 修改角色（code 不可改） */
export function updateRole(
  id: string,
  payload: { name: string; remark?: string; status?: number },
) {
  return requestClient.put('/system/role', {
    id,
    name: payload.name,
    remark: payload.remark ?? '',
    status: payload.status ?? 1,
  });
}

/** 删除角色 */
export function deleteRole(id: string) {
  return requestClient.delete(`/system/role${toQuery({ id })}`);
}

/** 角色已授权的菜单 id 集合（官方角色表单「菜单权限」树的数据源） */
export function getRoleMenuIds(id: string) {
  return requestClient.get<number[]>(`/system/role/menu${toQuery({ id })}`);
}

/** 覆盖式保存角色的菜单授权，返回写入行数 */
export function setRoleMenuIds(id: string, menuIds: number[]) {
  return requestClient.put<number>('/system/role/menu', {
    id,
    menu_ids: menuIds,
  });
}

/** 菜单表单数据（meta 原样透传给后端，组件内保存的是嵌套对象） */
export interface MenuPayload {
  authCode?: string;
  component?: string;
  id?: string;
  meta?: Record<string, any>;
  name: string;
  path?: string;
  pid?: number | string;
  sort?: number;
  status?: number;
  type?: string;
}

function toMenuBody(payload: MenuPayload) {
  return {
    auth_code: payload.authCode ?? '',
    component: payload.component ?? '',
    icon: payload.meta?.icon ?? '',
    ...(payload.id ? { id: payload.id } : {}),
    meta: payload.meta ?? {},
    name: payload.name,
    path: payload.path ?? '',
    pid: payload.pid ? String(payload.pid) : '0',
    sort: payload.sort ?? 0,
    status: payload.status ?? 1,
    type: payload.type ?? 'menu',
  };
}

/** 新增菜单 */
export function createMenu(payload: MenuPayload) {
  return requestClient.post<number>('/system/menu', toMenuBody(payload));
}

/** 修改菜单 */
export function updateMenu(id: string, payload: MenuPayload) {
  return requestClient.put('/system/menu', toMenuBody({ ...payload, id }));
}

/** 删除菜单 */
export function deleteMenu(id: string) {
  return requestClient.delete(`/system/menu${toQuery({ id })}`);
}

/** 新增部门 */
export function createDept(payload: {
  leader?: string;
  name: string;
  pid?: number | string;
  remark?: string;
  sort?: number;
  status?: number;
}) {
  return requestClient.post<number>('/system/dept', {
    leader: payload.leader ?? '',
    name: payload.name,
    pid: payload.pid ? String(payload.pid) : '0',
    remark: payload.remark ?? '',
    sort: payload.sort ?? 0,
    status: payload.status ?? 1,
  });
}

/** 修改部门 */
export function updateDept(
  id: string,
  payload: {
    leader?: string;
    name: string;
    pid?: number | string;
    remark?: string;
    sort?: number;
    status?: number;
  },
) {
  return requestClient.put('/system/dept', {
    id,
    leader: payload.leader ?? '',
    name: payload.name,
    pid: payload.pid ? String(payload.pid) : '0',
    remark: payload.remark ?? '',
    sort: payload.sort ?? 0,
    status: payload.status ?? 1,
  });
}

/** 删除部门 */
export function deleteDept(id: string) {
  return requestClient.delete(`/system/dept${toQuery({ id })}`);
}
