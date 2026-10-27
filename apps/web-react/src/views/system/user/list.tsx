/**
 * 系统管理 - 用户管理 —— 对齐 playground src/views/system/user/list.vue
 *
 * 布局：左侧部门树面板（搜索 + 树）+ 右侧（查询表单区 + 用户列表表格 + 分页）
 * 交互（与官方逐条对应）：
 * - 部门树点击 → 选中并立即按该部门重新查询（官方 selectDept → gridApi.query）
 * - 部门树搜索 → 过滤（官方 searchDept）
 * - 新增 / 编辑 → 右侧抽屉表单（官方 form.vue + useVbenDrawer）
 * - 删除 → 二次确认 + loading/success 消息（官方 onDelete）
 * - 状态开关 → 二次确认后调 updateUser(id, { status })（官方 onStatusChange）
 *
 * 与官方表单的差异：后端 UserBody 只接受 username/password/real_name/dept_id/status，
 * 不落 remark，因此表单不提供备注输入（避免“填了不生效”），查询区的备注查询保留。
 */
import * as React from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';

import {
  createUser,
  deleteUser,
  getDeptList,
  getUserList,
  updateUser,
  type SystemApi,
} from '#/api/system';
import { $t } from '#/locales';
import {
  FormDrawer,
  FormItem,
  FIELD_CLASS,
  RadioButtons,
  TreeSelect,
  type TreeOption,
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

/* ---------------- 部门树 ---------------- */

function TreeItem({
  depth,
  node,
  onSelect,
  selectedId,
  expandedIds,
  toggleExpand,
}: {
  depth: number;
  expandedIds: Set<string>;
  node: SystemApi.DeptItem;
  onSelect: (id: string) => void;
  selectedId: string;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = !!node.children?.length;
  const expanded = expandedIds.has(node.id);
  const selected = selectedId === node.id;
  return (
    <div>
      <div
        className={`flex h-[30px] cursor-pointer items-center gap-1 rounded-md px-2 text-sm text-[var(--antd-text)] hover:bg-[rgba(255,255,255,0.06)] ${
          selected ? 'bg-[rgba(3,94,199,0.25)]' : ''
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) {
            toggleExpand(node.id);
          }
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-[rgba(242,242,242,0.6)]" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-[rgba(242,242,242,0.6)]" />
          )
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              depth={depth + 1}
              expandedIds={expandedIds}
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeptTree({
  depts,
  onSelect,
  selectedId,
}: {
  depts: SystemApi.DeptItem[];
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  const [keyword, setKeyword] = React.useState('');
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  // 默认展开前两层（对齐官方 Tree default-expanded-level=2）
  React.useEffect(() => {
    const ids: string[] = [];
    const walk = (nodes: SystemApi.DeptItem[], level: number) => {
      if (level >= 2) return;
      for (const n of nodes) {
        if (n.children?.length) {
          ids.push(n.id);
          walk(n.children, level + 1);
        }
      }
    };
    walk(depts, 0);
    setExpandedIds(new Set(ids));
  }, [depts]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = React.useMemo(() => {
    if (!keyword.trim()) return depts;
    const kw = keyword.toLowerCase();
    const walk = (nodes: SystemApi.DeptItem[]): SystemApi.DeptItem[] =>
      nodes
        .map((node) => {
          const children = node.children ? walk(node.children) : [];
          if (node.name.toLowerCase().includes(kw) || children.length > 0) {
            return {
              ...node,
              children: children.length ? children : node.children,
            };
          }
          return null;
        })
        .filter(Boolean) as SystemApi.DeptItem[];
    return walk(depts);
  }, [depts, keyword]);

  return (
    <div className="flex w-[190px] shrink-0 flex-col rounded-[10px] bg-[var(--antd-card-bg)] p-3">
      <div className="relative">
        <input
          className={QUERY_INPUT}
          placeholder={$t('system.user.placeholder')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Search className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-[rgba(242,242,242,0.4)]" />
      </div>
      <div className="mt-2 flex-1 overflow-y-auto">
        {filtered.map((node) => (
          <TreeItem
            depth={0}
            expandedIds={expandedIds}
            key={node.id}
            node={node}
            selectedId={selectedId}
            onSelect={onSelect}
            toggleExpand={toggleExpand}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- 部门下拉选项 ---------------- */

function toTreeOptions(nodes: SystemApi.DeptItem[]): TreeOption[] {
  return nodes.map((n) => ({
    children: n.children?.length ? toTreeOptions(n.children) : undefined,
    label: n.name,
    value: n.id,
  }));
}

function collectDeptNames(
  nodes: SystemApi.DeptItem[],
  out: Record<string, string> = {},
): Record<string, string> {
  for (const n of nodes) {
    out[n.id] = n.name;
    if (n.children?.length) {
      collectDeptNames(n.children, out);
    }
  }
  return out;
}

/* ---------------- 用户管理页 ---------------- */

interface QueryForm {
  deptId: string;
  id: string;
  name: string;
  remark: string;
  status: string;
}

interface EditForm {
  deptId: string;
  password: string;
  realName: string;
  status: number;
  username: string;
}

const EMPTY_FORM: EditForm = {
  deptId: '',
  password: '',
  realName: '',
  status: 1,
  username: '',
};

export default function SystemUser() {
  const [rows, setRows] = React.useState<SystemApi.UserItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);

  const [depts, setDepts] = React.useState<SystemApi.DeptItem[]>([]);
  const [deptNames, setDeptNames] = React.useState<Record<string, string>>({});

  // 查询条件（草稿）
  const [name, setName] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [remark, setRemark] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [collapsed, setCollapsed] = React.useState(false);

  // 已提交的查询条件
  const [query, setQuery] = React.useState<QueryForm>({
    deptId: '',
    id: '',
    name: '',
    remark: '',
    status: '',
  });

  // 抽屉表单
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<null | SystemApi.UserItem>(null);
  const [form, setForm] = React.useState<EditForm>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const fetchData = React.useCallback(() => {
    setLoading(true);
    getUserList({
      deptId: query.deptId,
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

  const loadDepts = React.useCallback(() => {
    getDeptList()
      .then((data) => {
        setDepts(data ?? []);
        setDeptNames(collectDeptNames(data ?? []));
      })
      .catch(() => setDepts([]));
  }, []);

  React.useEffect(() => {
    loadDepts();
  }, [loadDepts]);

  /* --------- 状态开关（官方 onStatusChange） --------- */
  const onStatusChange = async (row: SystemApi.UserItem, next: number) => {
    const label = next === 1 ? '启用' : '禁用';
    try {
      await confirmOrThrow(
        `你要将${row.name}的状态切换为 【${label}】 吗？`,
        '切换状态',
      );
      await updateUser(row.id, {
        deptId: row.deptId,
        realName: row.name,
        status: next,
      });
      message.success(`已将 ${row.name} 切换为【${label}】`);
      fetchData();
    } catch (error) {
      // 取消或接口报错：不动开关状态，仅提示失败原因
      if ((error as Error).message !== '已取消') {
        message.error((error as Error).message || '操作失败');
      }
    }
  };

  /* --------- 删除（官方 onDelete） --------- */
  const onDelete = (row: SystemApi.UserItem) => {
    const hide = message.loading({
      content: $t('ui.actionMessage.deleting', [row.name]),
      duration: 0,
      key: 'action_process_msg',
    });
    deleteUser(row.id)
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
    setOpen(true);
  };

  const openEdit = (row: SystemApi.UserItem) => {
    setEditing(row);
    setForm({
      deptId: row.deptId ?? '',
      password: '',
      realName: row.name ?? '',
      status: row.status ?? 1,
      username: (row as any).username ?? '',
    });
    setErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!editing) {
      const username = form.username.trim();
      if (!username) {
        next.username = $t('ui.formRules.required', [$t('system.user.name')]);
      } else if (username.length > 64) {
        next.username = $t('ui.formRules.maxLength', [
          $t('system.user.name'),
          64,
        ]);
      }
      const pwd = form.password;
      if (!pwd) {
        next.password = '请输入密码';
      } else if (pwd.length < 8 || pwd.length > 72) {
        next.password = '密码长度需为 8-72 位';
      } else if (!(/[a-zA-Z]/.test(pwd) && /\d/.test(pwd))) {
        next.password = '密码必须同时包含字母和数字';
      }
    }
    if (!form.realName.trim()) {
      next.realName = $t('ui.formRules.required', [$t('system.user.userName')]);
    }
    if (!form.deptId) {
      next.deptId = $t('ui.formRules.selectRequired', [$t('system.user.dept')]);
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
      if (editing) {
        await updateUser(editing.id, {
          deptId: form.deptId,
          realName: form.realName.trim(),
          status: form.status,
        });
        message.success('修改成功');
      } else {
        await createUser({
          deptId: form.deptId,
          password: form.password,
          realName: form.realName.trim(),
          status: form.status,
          username: form.username.trim(),
        });
        message.success('新增成功');
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
      render: (row) => (
        <span className="block truncate">{(row as any).username ?? ''}</span>
      ),
      title: $t('system.user.name'),
      width: 160,
    },
    {
      align: 'left',
      render: (row) => <span className="block truncate">{row.name}</span>,
      title: $t('system.user.userName'),
      width: 160,
    },
    {
      align: 'left',
      render: (row) => (
        <span className="block truncate">
          {deptNames[row.deptId ?? ''] ?? ''}
        </span>
      ),
      title: $t('system.user.dept'),
      width: 140,
    },
    {
      render: (row) => (
        <StatusSwitch
          status={row.status ?? 1}
          onChange={(next) => onStatusChange(row, next)}
        />
      ),
      title: $t('system.user.status'),
      width: 100,
    },
    {
      render: (row) => (
        <span className="block max-w-[220px] truncate" title={row.remark}>
          {row.remark}
        </span>
      ),
      title: $t('system.user.remark'),
    },
    {
      render: (row) => row.createTime,
      title: $t('system.user.createTime'),
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
      title: $t('system.user.operation'),
      width: 130,
    },
  ];

  const deptOptions = React.useMemo(() => toTreeOptions(depts), [depts]);

  return (
    <SystemPage>
      <div className="flex h-full gap-2">
        <DeptTree
          depts={depts}
          selectedId={query.deptId}
          onSelect={(id) => {
            // 对齐官方 selectDept：选中即查询
            setPage(1);
            setQuery((prev) => ({ ...prev, deptId: id }));
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <QueryCard>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
              <QueryItem label={$t('system.user.name')}>
                <input
                  className={QUERY_INPUT}
                  placeholder={$t('ui.placeholder.input')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </QueryItem>
              <QueryItem label={$t('system.user.id')}>
                <input
                  className={QUERY_INPUT}
                  placeholder={$t('ui.placeholder.input')}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </QueryItem>
              <QueryItem label={$t('system.user.status')}>
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
                <QueryItem label={$t('system.user.remark')}>
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
                  setUserId('');
                  setRemark('');
                  setStatusFilter('');
                  setPage(1);
                  setQuery({
                    deptId: '',
                    id: '',
                    name: '',
                    remark: '',
                    status: '',
                  });
                }}
                onSearch={() => {
                  setPage(1);
                  setQuery((prev) => ({
                    ...prev,
                    id: userId,
                    name,
                    remark,
                    status: statusFilter,
                  }));
                }}
              />
            </div>
          </QueryCard>

          <div className="flex-1 rounded-[10px] bg-[var(--antd-card-bg)] px-3 py-2">
            <TableToolbar title={$t('system.user.list')}>
              <PrimaryBtn onClick={openCreate}>
                <Plus className="size-5" />
                {$t('ui.actionTitle.create', [$t('system.user.name')])}
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
      </div>

      <FormDrawer
        confirmLoading={saving}
        open={open}
        title={
          editing
            ? $t('ui.actionTitle.edit', [$t('system.user.name')])
            : $t('ui.actionTitle.create', [$t('system.user.name')])
        }
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
      >
        <div className="flex flex-col">
          <FormItem
            error={errors.username}
            label={$t('system.user.name')}
            required={!editing}
          >
            <input
              className={FIELD_CLASS}
              disabled={!!editing}
              placeholder={$t('ui.placeholder.input')}
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
            />
          </FormItem>

          {!editing && (
            <FormItem error={errors.password} label="密码" required>
              <input
                className={FIELD_CLASS}
                placeholder="8-72 位，需同时包含字母和数字"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </FormItem>
          )}

          <FormItem
            error={errors.realName}
            label={$t('system.user.userName')}
            required
          >
            <input
              className={FIELD_CLASS}
              placeholder={$t('ui.placeholder.input')}
              value={form.realName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, realName: e.target.value }))
              }
            />
          </FormItem>

          <FormItem
            error={errors.deptId}
            label={$t('system.user.dept')}
            required
          >
            <TreeSelect
              options={deptOptions}
              placeholder={$t('ui.placeholder.select')}
              value={form.deptId}
              onChange={(v) => setForm((prev) => ({ ...prev, deptId: v }))}
            />
          </FormItem>

          <FormItem label={$t('system.user.status')}>
            <RadioButtons
              options={[
                { label: $t('common.enabled'), value: 1 },
                { label: $t('common.disabled'), value: 0 },
              ]}
              value={form.status}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
            />
          </FormItem>
        </div>
      </FormDrawer>
    </SystemPage>
  );
}
