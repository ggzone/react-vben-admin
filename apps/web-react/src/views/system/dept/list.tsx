/**
 * 系统管理 - 部门管理 —— 对齐 playground src/views/system/dept/list.vue
 *
 * 布局：树形表格（无查询表单、无分页），工具栏 + 新增部门按钮
 * 交互：
 * - 新增 / 新增下级 / 编辑 → 居中弹窗表单（官方用 useVbenModal，非抽屉）
 * - 删除 → loading/success 消息；有子节点时按钮置灰（官方 options.delete.disabled）
 *
 * 说明：后端 DeptBody 除 name/pid/status/remark 外还要求 leader、sort（update 会整行覆盖），
 * 因此表单补充这两项，并由 list 接口回填，避免编辑时把原值清空。
 */
import * as React from 'react';

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

import {
  createDept,
  deleteDept,
  getDeptList,
  updateDept,
  type SystemApi,
} from '#/api/system';
import { $t } from '#/locales';
import {
  antdButtonText,
  BTN_DANGER,
  FIELD_CLASS,
  FormDrawer,
  FormItem,
  RadioButtons,
  TextArea,
  TreeSelect,
  type TreeOption,
} from '#/views/system/components/form';
import { message } from '#/views/system/components/feedback';
import { StatusTag, SystemPage } from '#/views/system/components/table-page';

interface EditForm {
  name: string;
  pid: string;
  remark: string;
  status: number;
}

const EMPTY_FORM: EditForm = {
  name: '',
  pid: '',
  remark: '',
  status: 1,
};

/** 行数据 → 表单值（顶层节点 pid=0 归一成空串，避免下拉回填出不存在的选项） */
function formFromRow(row: null | SystemApi.DeptItem): EditForm {
  if (!row) {
    return { ...EMPTY_FORM };
  }
  return {
    name: row.name ?? '',
    pid: String(row.pid) === '0' ? '' : String(row.pid),
    remark: row.remark ?? '',
    status: row.status ?? 1,
  };
}

function toTreeOptions(nodes: SystemApi.DeptItem[]): TreeOption[] {
  return nodes.map((n) => ({
    children: n.children?.length ? toTreeOptions(n.children) : undefined,
    label: n.name,
    value: n.id,
  }));
}

export default function SystemDept() {
  const [rows, setRows] = React.useState<SystemApi.DeptItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  // 对齐官方 vxe 默认行为：初始全折叠，只显示顶层节点
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<null | SystemApi.DeptItem>(null);
  const [form, setForm] = React.useState<EditForm>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    getDeptList()
      .then((data) => {
        const list = data ?? [];
        setRows(list);
        const ids: string[] = [];
        const walk = (nodes: SystemApi.DeptItem[]) => {
          for (const n of nodes) {
            if (n.children?.length) {
              ids.push(n.id);
              walk(n.children);
            }
          }
        };
        walk(list);
        setCollapsed(new Set(ids));
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /** 展平为可见行（带树层级） */
  const flat = React.useMemo(() => {
    const out: {
      depth: number;
      hasChildren: boolean;
      row: SystemApi.DeptItem;
    }[] = [];
    const walk = (nodes: SystemApi.DeptItem[], depth: number) => {
      for (const node of nodes) {
        const hasChildren = !!node.children?.length;
        out.push({ depth, hasChildren, row: node });
        if (hasChildren && !collapsed.has(node.id)) {
          walk(node.children!, depth + 1);
        }
      }
    };
    walk(rows, 0);
    return out;
  }, [rows, collapsed]);

  /* --------- 删除 --------- */
  const onDelete = (row: SystemApi.DeptItem) => {
    const hide = message.loading({
      content: $t('ui.actionMessage.deleting', [row.name]),
      duration: 0,
      key: 'action_process_msg',
    });
    deleteDept(row.id)
      .then(() => {
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [row.name]),
          key: 'action_process_msg',
        });
        load();
      })
      .catch((error) => {
        hide();
        message.error(error?.message || '删除失败');
      });
  };

  /* --------- 新增 / 新增下级 / 编辑 --------- */
  const openCreate = (pid = '') => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, pid });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (row: SystemApi.DeptItem) => {
    setEditing(row);
    setForm(formFromRow(row));
    setErrors({});
    setOpen(true);
  };

  /** 重置：对齐官方 formApi.resetForm() + setValues(formData)——回到打开时的值 */
  const onReset = () => {
    setForm(editing ? formFromRow(editing) : { ...EMPTY_FORM, pid: form.pid });
    setErrors({});
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const deptName = form.name.trim();
    if (!deptName) {
      next.name = $t('ui.formRules.required', [$t('system.dept.deptName')]);
    } else if (deptName.length < 2 || deptName.length > 20) {
      next.name = $t('ui.formRules.minLength', [$t('system.dept.deptName'), 2]);
    }
    if (form.remark.length > 50) {
      next.remark = $t('ui.formRules.maxLength', [
        $t('system.dept.remark'),
        50,
      ]);
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
      const payload = {
        // 官方表单没有 leader/sort，但后端 update 是整行覆盖，
        // 这里透传原值避免编辑一次就把这两列清空。
        leader: editing?.leader ?? '',
        name: form.name.trim(),
        pid: form.pid,
        remark: form.remark,
        sort: editing?.sort ?? 0,
        status: form.status,
      };
      if (editing) {
        await updateDept(editing.id, payload);
        message.success('修改成功');
      } else {
        await createDept(payload);
        message.success('新增成功');
      }
      setOpen(false);
      load();
    } catch (error) {
      message.error((error as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  /** 上级部门下拉：编辑时排除自身及其子树，避免形成环 */
  const parentOptions = React.useMemo(() => {
    if (!editing) {
      return toTreeOptions(rows);
    }
    const excluded = new Set<string>();
    const mark = (node: SystemApi.DeptItem) => {
      excluded.add(node.id);
      node.children?.forEach(mark);
    };
    const find = (nodes: SystemApi.DeptItem[]): SystemApi.DeptItem | null => {
      for (const n of nodes) {
        if (n.id === editing.id) return n;
        const hit = n.children ? find(n.children) : null;
        if (hit) return hit;
      }
      return null;
    };
    const self = find(rows);
    if (self) mark(self);
    const prune = (nodes: SystemApi.DeptItem[]): TreeOption[] =>
      nodes
        .filter((n) => !excluded.has(n.id))
        .map((n) => ({
          children: n.children?.length ? prune(n.children) : undefined,
          label: n.name,
          value: n.id,
        }));
    return prune(rows);
  }, [rows, editing]);

  const OpLink = ({
    children,
    danger,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button
      className={`text-sm leading-[22px] ${
        disabled
          ? 'cursor-not-allowed text-[rgba(242,242,242,0.25)]'
          : danger
            ? 'cursor-pointer text-[var(--antd-danger)] hover:opacity-80'
            : 'cursor-pointer text-[var(--antd-primary)] hover:opacity-80'
      }`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );

  const columns: {
    align?: 'center' | 'left' | 'right';
    render: (item: (typeof flat)[number]) => React.ReactNode;
    title: string;
    width?: number;
  }[] = [
    {
      align: 'left',
      render: ({ depth, hasChildren, row }) => (
        <div
          className="flex items-center gap-1"
          style={{ paddingLeft: `${depth * 20}px` }}
        >
          {hasChildren ? (
            <button
              aria-label="expand"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-[rgba(242,242,242,0.6)] hover:text-[var(--antd-text)]"
              type="button"
              onClick={() => toggle(row.id)}
            >
              {collapsed.has(row.id) ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}
          <span className="truncate">{row.name}</span>
        </div>
      ),
      title: $t('system.dept.deptName'),
      width: 220,
    },
    {
      render: ({ row }) => <StatusTag status={row.status ?? 1} />,
      title: $t('system.dept.status'),
      width: 100,
    },
    {
      render: ({ row }) => row.createTime,
      title: $t('system.dept.createTime'),
      width: 180,
    },
    {
      render: ({ row }) => (
        <span className="block max-w-[260px] truncate" title={row.remark}>
          {row.remark}
        </span>
      ),
      title: $t('system.dept.remark'),
    },
    {
      align: 'right',
      render: ({ hasChildren, row }) => (
        <div className="flex items-center justify-end gap-3">
          <OpLink onClick={() => openCreate(row.id)}>新增下级</OpLink>
          <OpLink onClick={() => openEdit(row)}>{$t('common.edit')}</OpLink>
          <OpLink
            danger
            disabled={hasChildren}
            onClick={() => !hasChildren && onDelete(row)}
          >
            {$t('common.delete')}
          </OpLink>
        </div>
      ),
      title: $t('system.dept.operation'),
      width: 200,
    },
  ];

  return (
    <SystemPage>
      <div className="flex h-full flex-col">
        <div className="flex-1 rounded-[10px] bg-[var(--antd-card-bg)] px-3 py-2">
          <div className="flex items-center justify-between px-2 pb-[17px]">
            <div className="text-[15px] leading-[32px] font-semibold text-[var(--antd-text)]">
              {$t('system.dept.list')}
            </div>
            <button
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border-transparent bg-[var(--antd-primary)] px-[15px] text-sm leading-[22px] text-white transition-opacity hover:opacity-90"
              type="button"
              onClick={() => openCreate()}
            >
              <Plus className="size-5" />
              {$t('ui.actionTitle.create', [$t('system.dept.name')])}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-[var(--antd-text)]">
              <thead>
                <tr>
                  {columns.map((col, i) => (
                    <th
                      className={`overflow-hidden border-b border-[var(--antd-border)] bg-[#2e3033] px-4 font-normal text-[rgba(242,242,242,0.65)] whitespace-nowrap ${
                        col.align === 'left'
                          ? 'text-left'
                          : col.align === 'right'
                            ? 'text-right'
                            : 'text-center'
                      }`}
                      key={i}
                      style={{
                        ...({ height: 38 } as React.CSSProperties),
                        ...(col.width ? { width: col.width } : {}),
                      }}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flat.map(({ depth, hasChildren, row }) => (
                  <tr
                    className="transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                    key={row.id}
                  >
                    {columns.map((col, ci) => (
                      <td
                        className={`border-b border-[var(--antd-border)] px-4 align-middle whitespace-nowrap ${
                          col.align === 'left'
                            ? 'text-left'
                            : col.align === 'right'
                              ? 'text-right'
                              : 'text-center'
                        }`}
                        key={ci}
                        style={{ height: 40 } as React.CSSProperties}
                      >
                        {col.render({ depth, hasChildren, row })}
                      </td>
                    ))}
                  </tr>
                ))}
                {!loading && flat.length === 0 && (
                  <tr>
                    <td
                      className="py-10 text-center text-[rgba(242,242,242,0.45)]"
                      colSpan={columns.length}
                    >
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FormDrawer
        confirmLoading={saving}
        layout="vertical"
        open={open}
        prependFooter={
          <button className={BTN_DANGER} type="button" onClick={onReset}>
            {antdButtonText($t('common.reset'))}
          </button>
        }
        title={
          editing
            ? $t('ui.actionTitle.edit', [$t('system.dept.name')])
            : $t('ui.actionTitle.create', [$t('system.dept.name')])
        }
        variant="modal"
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
      >
        <div className="mx-4 flex flex-col">
          <FormItem
            error={errors.name}
            label={$t('system.dept.deptName')}
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

          <FormItem label={$t('system.dept.parentDept')}>
            <TreeSelect
              options={parentOptions}
              placeholder={$t('ui.placeholder.select')}
              value={form.pid}
              onChange={(v) => setForm((prev) => ({ ...prev, pid: v }))}
            />
          </FormItem>

          <FormItem label={$t('system.dept.status')}>
            <RadioButtons
              options={[
                { label: $t('common.enabled'), value: 1 },
                { label: $t('common.disabled'), value: 0 },
              ]}
              value={form.status}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
            />
          </FormItem>

          <FormItem error={errors.remark} label={$t('system.dept.remark')}>
            {/* 官方 schema 虽写了 showCount，但 antd 侧实测未渲染字数（文本域 460×76） */}
            <TextArea
              maxLength={50}
              placeholder={$t('ui.placeholder.input')}
              rows={3}
              value={form.remark}
              onChange={(v) => setForm((prev) => ({ ...prev, remark: v }))}
            />
          </FormItem>
        </div>
      </FormDrawer>
    </SystemPage>
  );
}
