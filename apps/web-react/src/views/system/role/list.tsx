/**
 * 系统管理 - 角色管理 —— 对齐 playground src/views/system/role/list.vue
 *
 * 布局：查询表单区 + 角色列表表格 + 分页（无部门树，全宽）
 * 交互：
 * - 新增 / 编辑 → 右侧抽屉表单（官方 role/modules/form.vue）
 * - 删除 → loading/success 消息（官方 onDelete）
 * - 状态开关 → 二次确认后 updateRole（官方 onStatusChange）
 *
 * 与官方表单的差异：后端 RoleBody 新增时需要 `code`（唯一），修改时不可改，
 * 因此新增时提供「角色标识」输入，编辑时只读展示。
 */
import * as React from 'react';

import { Plus } from 'lucide-react';

import {
  createRole,
  deleteRole,
  getMenuList,
  getRoleList,
  getRoleMenuIds,
  setRoleMenuIds,
  updateRole,
  type SystemApi,
} from '#/api/system';
import { $t } from '#/locales';
import {
  CheckboxTree,
  FormDrawer,
  FormItem,
  FIELD_CLASS,
  RadioButtons,
  TEXTAREA_CLASS,
  type CheckTreeNode,
} from '#/views/system/components/form';
import { confirmOrThrow, message } from '#/views/system/components/feedback';
import {
  DataTable,
  LinkBtn,
  Pagination,
  PrimaryBtn,
  QueryActions,
  QueryCard,
  QueryItem,
  QUERY_INPUT,
  StatusSwitch,
  SystemPage,
  TableToolbar,
  type TableColumn,
} from '#/views/system/components/table-page';

interface QueryForm {
  id: string;
  name: string;
  remark: string;
  status: string;
}

interface EditForm {
  code: string;
  name: string;
  remark: string;
  status: number;
}

const EMPTY_FORM: EditForm = { code: '', name: '', remark: '', status: 1 };

export default function SystemRole() {
  const [rows, setRows] = React.useState<SystemApi.RoleItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);

  // 查询条件（草稿）
  const [name, setName] = React.useState('');
  const [roleId, setRoleId] = React.useState('');
  const [remark, setRemark] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [collapsed, setCollapsed] = React.useState(false);

  const [query, setQuery] = React.useState<QueryForm>({
    id: '',
    name: '',
    remark: '',
    status: '',
  });

  // 抽屉
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<null | SystemApi.RoleItem>(null);
  const [form, setForm] = React.useState<EditForm>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  // 菜单权限树（官方 loadPermissions：加载一次后缓存）
  const [menuTree, setMenuTree] = React.useState<CheckTreeNode[]>([]);
  const [menusLoading, setMenusLoading] = React.useState(false);
  const [menuIds, setMenuIds] = React.useState<string[]>([]);
  /** 只有成功读取过已有授权才允许保存，避免读取失败时把授权清空 */
  const [menuIdsLoaded, setMenuIdsLoaded] = React.useState(false);

  const fetchData = React.useCallback(() => {
    setLoading(true);
    getRoleList({
      id: query.id,
      name: query.name,
      page,
      pageSize,
      remark: query.remark,
      status: query.status,
    })
      .then((res) => {
        setRows(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, query]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (menuTree.length || menusLoading) {
      return;
    }
    setMenusLoading(true);
    getMenuList()
      .then((list) => {
        const toNodes = (nodes: SystemApi.MenuItem[]): CheckTreeNode[] =>
          nodes.map((n) => ({
            children: n.children?.length ? toNodes(n.children) : undefined,
            label: $t(n.meta?.title ?? n.name),
            value: n.id,
          }));
        setMenuTree(toNodes(list ?? []));
      })
      .catch(() => setMenuTree([]))
      .finally(() => setMenusLoading(false));
  }, [menuTree, menusLoading]);

  /* --------- 状态开关 --------- */
  const onStatusChange = async (row: SystemApi.RoleItem, next: number) => {
    const label = next === 1 ? '启用' : '禁用';
    try {
      await confirmOrThrow(
        `你要将${row.name}的状态切换为 【${label}】 吗？`,
        '切换状态',
      );
      await updateRole(row.id, {
        name: row.name,
        remark: row.remark,
        status: next,
      });
      message.success(`已将 ${row.name} 切换为【${label}】`);
      fetchData();
    } catch (error) {
      if ((error as Error).message !== '已取消') {
        message.error((error as Error).message || '操作失败');
      }
    }
  };

  /* --------- 删除 --------- */
  const onDelete = (row: SystemApi.RoleItem) => {
    const hide = message.loading({
      content: $t('ui.actionMessage.deleting', [row.name]),
      duration: 0,
      key: 'action_process_msg',
    });
    deleteRole(row.id)
      .then(() => {
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [row.name]),
          key: 'action_process_msg',
        });
        fetchData();
      })
      .catch((error) => {
        hide();
        message.error(error?.message || '删除失败');
      });
  };

  /* --------- 新增 / 编辑 --------- */
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setMenuIds([]);
    setMenuIdsLoaded(true);
    setOpen(true);
  };

  const openEdit = (row: SystemApi.RoleItem) => {
    setEditing(row);
    setForm({
      code: row.code ?? '',
      name: row.name ?? '',
      remark: row.remark ?? '',
      status: row.status ?? 1,
    });
    setErrors({});
    setMenuIds([]);
    setMenuIdsLoaded(false);
    setOpen(true);
    // 异步回填已授权菜单
    getRoleMenuIds(row.id)
      .then((ids) => {
        setMenuIds((ids ?? []).map(String));
        setMenuIdsLoaded(true);
      })
      .catch(() => setMenuIdsLoaded(false));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const roleName = form.name.trim();
    if (!roleName) {
      next.name = $t('ui.formRules.required', [$t('system.role.roleName')]);
    } else if (roleName.length < 2 || roleName.length > 30) {
      next.name = '角色名称长度需为 2-30 个字符';
    }
    if (!editing) {
      const code = form.code.trim();
      if (!code) {
        next.code = '请输入角色标识';
      } else if (!/^[A-Za-z0-9_-]+$/.test(code)) {
        next.code = '角色标识只能包含字母、数字、下划线和连字符';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onConfirm = async () => {
    if (!validate()) {
      return;
    }
    setSaving(true);
    try {
      let roleId: string;
      if (editing) {
        await updateRole(editing.id, {
          name: form.name.trim(),
          remark: form.remark,
          status: form.status,
        });
        roleId = editing.id;
        message.success('修改成功');
      } else {
        roleId = String(
          await createRole({
            code: form.code.trim(),
            name: form.name.trim(),
            remark: form.remark,
            status: form.status,
          }),
        );
        message.success('新增成功');
      }
      // 菜单授权：读取失败时跳过保存，避免把已有授权清空
      if (menuIdsLoaded) {
        await setRoleMenuIds(
          roleId,
          menuIds.map((v) => Number(v)).filter((v) => Number.isFinite(v)),
        );
      }
      setOpen(false);
      fetchData();
    } catch (error) {
      message.error((error as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumn[] = [
    {
      align: 'left',
      render: (row) => row.name,
      title: $t('system.role.roleName'),
      width: 180,
    },
    {
      align: 'left',
      render: (row) => (
        <span className="block truncate font-mono text-[rgba(242,242,242,0.65)]">
          {row.code ?? ''}
        </span>
      ),
      title: '角色标识',
      width: 140,
    },
    { render: (row) => row.id, title: $t('system.role.id'), width: 120 },
    {
      render: (row) => (
        <StatusSwitch
          status={row.status ?? 1}
          onChange={(next) => onStatusChange(row, next)}
        />
      ),
      title: $t('system.role.status'),
      width: 100,
    },
    {
      render: (row) => (
        <span className="block max-w-[260px] truncate" title={row.remark}>
          {row.remark}
        </span>
      ),
      title: $t('system.role.remark'),
    },
    {
      render: (row) => row.createTime,
      title: $t('system.role.createTime'),
      width: 200,
    },
    {
      render: (row) => (
        <div className="flex items-center justify-center gap-3">
          <LinkBtn onClick={() => openEdit(row)}>{$t('common.edit')}</LinkBtn>
          <LinkBtn danger onClick={() => onDelete(row)}>
            {$t('common.delete')}
          </LinkBtn>
        </div>
      ),
      title: $t('system.role.operation'),
      width: 130,
    },
  ];

  return (
    <SystemPage>
      <div className="flex h-full flex-col gap-3">
        <QueryCard>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            <QueryItem label={$t('system.role.roleName')}>
              <input
                className={QUERY_INPUT}
                placeholder={$t('ui.placeholder.input')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </QueryItem>
            <QueryItem label={$t('system.role.id')}>
              <input
                className={QUERY_INPUT}
                placeholder={$t('ui.placeholder.input')}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              />
            </QueryItem>
            <QueryItem label={$t('system.role.status')}>
              <select
                className={`${QUERY_INPUT} cursor-pointer`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{$t('ui.placeholder.select')}</option>
                <option value="1">{$t('common.enabled')}</option>
                <option value="0">{$t('common.disabled')}</option>
              </select>
            </QueryItem>
            {!collapsed && (
              <QueryItem label={$t('system.role.remark')}>
                <input
                  className={QUERY_INPUT}
                  placeholder={$t('ui.placeholder.input')}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </QueryItem>
            )}
            <QueryActions
              collapsed={collapsed}
              onCollapse={() => setCollapsed((v) => !v)}
              onReset={() => {
                setName('');
                setRoleId('');
                setRemark('');
                setStatusFilter('');
                setPage(1);
                setQuery({ id: '', name: '', remark: '', status: '' });
              }}
              onSearch={() => {
                setPage(1);
                setQuery({
                  id: roleId,
                  name,
                  remark,
                  status: statusFilter,
                });
              }}
            />
          </div>
        </QueryCard>

        <div className="flex-1 rounded-[10px] bg-[var(--antd-card-bg)] px-3 py-2">
          <TableToolbar title={$t('system.role.list')}>
            <PrimaryBtn onClick={openCreate}>
              <Plus className="size-5" />
              {$t('ui.actionTitle.create', [$t('system.role.name')])}
            </PrimaryBtn>
          </TableToolbar>
          <DataTable columns={columns} rows={loading ? [] : rows} />
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </div>

      <FormDrawer
        confirmLoading={saving}
        open={open}
        title={
          editing
            ? $t('ui.actionTitle.edit', [$t('system.role.name')])
            : $t('ui.actionTitle.create', [$t('system.role.name')])
        }
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
      >
        <div className="flex flex-col">
          <FormItem
            error={errors.name}
            label={$t('system.role.roleName')}
            required
          >
            <input
              className={FIELD_CLASS}
              placeholder={$t('ui.placeholder.input')}
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </FormItem>

          <FormItem error={errors.code} label="角色标识" required={!editing}>
            <input
              className={`${FIELD_CLASS} font-mono`}
              disabled={!!editing}
              placeholder="如 auditor（唯一，创建后不可修改）"
              value={form.code}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, code: e.target.value }))
              }
            />
          </FormItem>

          <FormItem label={$t('system.role.status')}>
            <RadioButtons
              options={[
                { label: $t('common.enabled'), value: 1 },
                { label: $t('common.disabled'), value: 0 },
              ]}
              value={form.status}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
            />
          </FormItem>

          <FormItem label={$t('system.role.remark')}>
            <textarea
              className={TEXTAREA_CLASS}
              placeholder={$t('ui.placeholder.input')}
              rows={2}
              value={form.remark}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, remark: e.target.value }))
              }
            />
          </FormItem>

          <FormItem
            className="items-start"
            label={$t('system.role.setPermissions')}
          >
            {menusLoading ? (
              <div className="flex h-16 items-center justify-center text-sm text-[rgba(242,242,242,0.45)]">
                加载中...
              </div>
            ) : (
              <CheckboxTree
                nodes={menuTree}
                value={menuIds}
                onChange={setMenuIds}
              />
            )}
          </FormItem>
        </div>
      </FormDrawer>
    </SystemPage>
  );
}
