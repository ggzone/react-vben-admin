/**
 * 系统管理 - 菜单管理 —— 对齐 playground src/views/system/menu/list.vue + modules/form.vue
 *
 * 布局：树形表格（无查询表单、无分页），工具栏 + 新增菜单按钮
 * 交互：
 * - 新增 / 新增下级 / 编辑 → 右侧抽屉（宽 800，官方 Drawer max-w-200）
 * - 删除 → loading/success 消息
 * - 表单随「类型」动态显示字段（官方 dependencies.show 逐条对齐）：
 *   path：catalog/menu/embedded ｜ component：menu ｜ linkSrc：embedded/link
 *   authCode：button/catalog/menu/embedded（button 必填）｜ 图标等：非 button
 *   高级设置（缓存/固定标签/隐藏等）：按官方各自的显示条件
 *
 * 与官方的差异：
 * - 唯一性校验（官方调 isMenuNameExists / isMenuPathExists 接口）改为在本地菜单树上校验，
 *   避免新增后端接口；判定口径一致（新增查全表，编辑排除自身）。
 * - 图标用「文本输入 + 实时预览」替代官方 IconPicker（React 端无该组件），
 *   取值格式一致（carbon:xxx）。
 */
import * as React from 'react';
import { Icon } from '@iconify/react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

import {
  createMenu,
  deleteMenu,
  getMenuList,
  updateMenu,
  type SystemApi,
} from '#/api/system';

import { $t } from '#/locales';
import {
  CheckboxField,
  FormDrawer,
  FormItem,
  FIELD_CLASS,
  RadioButtons,
  TreeSelect,
  type TreeOption,
} from '#/views/system/components/form';
import { message } from '#/views/system/components/feedback';
import { SystemPage } from '#/views/system/components/table-page';

/* ---------------- 类型 ---------------- */

const TYPE_OPTIONS = [
  {
    color: 'processing',
    label: $t('system.menu.typeCatalog'),
    value: 'catalog',
  },
  { color: 'default', label: $t('system.menu.typeMenu'), value: 'menu' },
  { color: 'error', label: $t('system.menu.typeButton'), value: 'button' },
  {
    color: 'success',
    label: $t('system.menu.typeEmbedded'),
    value: 'embedded',
  },
  { color: 'warning', label: $t('system.menu.typeLink'), value: 'link' },
];

const TYPE_TAG_STYLE: Record<
  string,
  { bg: string; border: string; color: string }
> = {
  processing: { bg: '#111a2c', border: '#15325b', color: '#1668dc' },
  default: {
    bg: 'rgba(255,255,255,0.04)',
    border: '#424242',
    color: 'rgba(242,242,242,0.65)',
  },
  error: { bg: '#2a1215', border: '#58181c', color: '#e84749' },
  success: { bg: '#162312', border: '#274902', color: '#49aa19' },
  warning: { bg: '#2b2111', border: '#594214', color: '#d89614' },
};

function TypeTag({ type }: { type?: string }) {
  const item = TYPE_OPTIONS.find((o) => o.value === type) ?? TYPE_OPTIONS[1]!;
  const style = TYPE_TAG_STYLE[item.color] ?? TYPE_TAG_STYLE.default!;
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-[4px] border px-[7px] text-xs leading-[20px]"
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.color,
      }}
    >
      {item.label}
    </span>
  );
}

function StatusTag({ status }: { status?: number }) {
  const enabled = status === 1;
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-[4px] border px-[7px] text-xs leading-[20px] ${
        enabled
          ? 'border-[#274902] bg-[#162312] text-[#49aa19]'
          : 'border-[#58181c] bg-[#2a1215] text-[#e84749]'
      }`}
    >
      {enabled ? $t('common.enabled') : $t('common.disabled')}
    </span>
  );
}

/** 页面组件列 formatter（对齐 playground data.ts） */
function componentText(row: SystemApi.MenuItem): string {
  switch (row.type) {
    case 'catalog':
    case 'menu': {
      return row.component ?? '';
    }
    case 'embedded': {
      return row.meta?.iframeSrc ?? '';
    }
    case 'link': {
      return row.meta?.link ?? '';
    }
    default: {
      return '';
    }
  }
}

/* ---------------- 树工具 ---------------- */

interface FlatMenu {
  depth: number;
  hasChildren: boolean;
  parentName: string;
  row: SystemApi.MenuItem;
}

function toTreeOptions(nodes: SystemApi.MenuItem[]): TreeOption[] {
  return nodes.map((n) => ({
    children: n.children?.length ? toTreeOptions(n.children) : undefined,
    label: $t(n.meta?.title ?? n.name),
    value: n.id,
  }));
}

/** 收集全表的 name / path（唯一性校验用） */
function collectUnique(
  nodes: SystemApi.MenuItem[],
  selfId: string,
  out = { names: new Set<string>(), paths: new Set<string>() },
) {
  for (const n of nodes) {
    if (n.id !== selfId) {
      if (n.name) out.names.add(n.name.toLowerCase());
      if (n.path) out.paths.add(n.path.toLowerCase());
    }
    if (n.children?.length) {
      collectUnique(n.children, selfId, out);
    }
  }
  return out;
}

/* ---------------- 表单 ---------------- */

interface EditForm {
  activeIcon: string;
  // 官方 fieldName: 'activePath'（内嵌/菜单类型可见，可选但需指向已存在的 path）
  // 后端 MenuBody 无该列，落到 meta.activePath 持久化
  activePath: string;
  authCode: string;
  badge: string;
  badgeType: string;
  badgeVariants: string;
  component: string;
  icon: string;
  linkSrc: string;
  name: string;
  path: string;
  pid: string;
  sort: number;
  status: number;
  title: string;
  type: string;
  // 高级设置
  affixTab: boolean;
  hideChildrenInMenu: boolean;
  hideInBreadcrumb: boolean;
  hideInMenu: boolean;
  hideInTab: boolean;
  keepAlive: boolean;
}

const EMPTY_FORM: EditForm = {
  activeIcon: '',
  activePath: '',
  authCode: '',
  badge: '',
  badgeType: '',
  badgeVariants: '',
  component: '',
  icon: '',
  linkSrc: '',
  name: '',
  path: '',
  pid: '',
  sort: 0,
  status: 1,
  title: '',
  type: 'menu',
  affixTab: false,
  hideChildrenInMenu: false,
  hideInBreadcrumb: false,
  hideInMenu: false,
  hideInTab: false,
  keepAlive: false,
};

export default function SystemMenu() {
  const [rows, setRows] = React.useState<SystemApi.MenuItem[]>([]);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<null | SystemApi.MenuItem>(null);
  const [form, setForm] = React.useState<EditForm>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    getMenuList()
      .then((list) => {
        const data = list ?? [];
        setRows(data);
        const ids: string[] = [];
        const walk = (nodes: SystemApi.MenuItem[]) => {
          for (const n of nodes) {
            if (n.children?.length) {
              ids.push(n.id);
              walk(n.children);
            }
          }
        };
        walk(data);
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

  const flat = React.useMemo(() => {
    const out: FlatMenu[] = [];
    const walk = (
      nodes: SystemApi.MenuItem[],
      depth: number,
      parentName: string,
    ) => {
      for (const node of nodes) {
        const hasChildren = !!node.children?.length;
        out.push({ depth, hasChildren, parentName, row: node });
        if (hasChildren && !collapsed.has(node.id)) {
          walk(node.children!, depth + 1, $t(node.meta?.title ?? node.name));
        }
      }
    };
    walk(rows, 0, '');
    return out;
  }, [rows, collapsed]);

  /* --------- 删除 --------- */
  const onDelete = (row: SystemApi.MenuItem) => {
    const label = $t(row.meta?.title ?? row.name);
    const hide = message.loading({
      content: $t('ui.actionMessage.deleting', [label]),
      duration: 0,
      key: 'action_process_msg',
    });
    deleteMenu(row.id)
      .then(() => {
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [label]),
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

  const openEdit = (row: SystemApi.MenuItem) => {
    setEditing(row);
    const meta: any = row.meta ?? {};
    setForm({
      activeIcon: meta.activeIcon ?? '',
      activePath: meta.activePath ?? '',
      authCode: row.authCode ?? '',
      badge: meta.badge ?? '',
      badgeType: meta.badgeType ?? '',
      badgeVariants: meta.badgeVariants ?? '',
      component: row.component ?? '',
      icon: meta.icon ?? '',
      // 官方 onOpenChange：link/embedded 把 meta.link / meta.iframeSrc 回填到 linkSrc
      linkSrc:
        row.type === 'link'
          ? (meta.link ?? '')
          : row.type === 'embedded'
            ? (meta.iframeSrc ?? '')
            : '',
      name: row.name ?? '',
      path: row.path ?? '',
      pid: String(row.pid) === '0' ? '' : String(row.pid),
      sort: row.sort ?? 0,
      status: row.status ?? 1,
      title: meta.title ?? '',
      type: row.type ?? 'menu',
      affixTab: !!meta.affixTab,
      hideChildrenInMenu: !!meta.hideChildrenInMenu,
      hideInBreadcrumb: !!meta.hideInBreadcrumb,
      hideInMenu: !!meta.hideInMenu,
      hideInTab: !!meta.hideInTab,
      keepAlive: !!meta.keepAlive,
    });
    setErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const { type } = form;
    const isButton = type === 'button';
    const showPath = ['catalog', 'embedded', 'menu'].includes(type);
    const showComponent = type === 'menu';
    const showLink = ['embedded', 'link'].includes(type);
    const showActivePath = ['embedded', 'menu'].includes(type);

    const name = form.name.trim();
    if (!name) {
      next.name = $t('ui.formRules.required', [$t('system.menu.menuName')]);
    } else if (name.length < 2 || name.length > 30) {
      next.name =
        name.length < 2
          ? $t('ui.formRules.minLength', [$t('system.menu.menuName'), 2])
          : $t('ui.formRules.maxLength', [$t('system.menu.menuName'), 30]);
    } else {
      const { names } = collectUnique(rows, editing?.id ?? '');
      if (names.has(name.toLowerCase())) {
        next.name = $t('ui.formRules.alreadyExists', [
          $t('system.menu.menuName'),
          name,
        ]);
      }
    }

    if (!form.title.trim()) {
      next.title = $t('ui.formRules.required', [$t('system.menu.menuTitle')]);
    }

    if (showPath) {
      const path = form.path.trim();
      if (!path) {
        next.path = $t('ui.formRules.required', [$t('system.menu.path')]);
      } else if (path.length < 2 || path.length > 100) {
        next.path =
          path.length < 2
            ? $t('ui.formRules.minLength', [$t('system.menu.path'), 2])
            : $t('ui.formRules.maxLength', [$t('system.menu.path'), 100]);
      } else if (!path.startsWith('/')) {
        next.path = $t('ui.formRules.startWith', [$t('system.menu.path'), '/']);
      } else {
        const { paths } = collectUnique(rows, editing?.id ?? '');
        if (paths.has(path.toLowerCase())) {
          next.path = $t('ui.formRules.alreadyExists', [
            $t('system.menu.path'),
            path,
          ]);
        }
      }
    }

    if (showComponent && !form.component.trim()) {
      next.component = $t('ui.formRules.required', [
        $t('system.menu.component'),
      ]);
    }

    if (showLink) {
      const link = form.linkSrc.trim();
      if (!link) {
        next.linkSrc = '请输入链接地址';
      } else if (!/^https?:\/\/.+/i.test(link)) {
        next.linkSrc = $t('ui.formRules.invalidURL');
      }
    }

    // 激活路径：可选；填了就必须是 2-100 位、以 / 开头、且能对上已有菜单的 path
    if (showActivePath && form.activePath.trim()) {
      const activePath = form.activePath.trim();
      if (activePath.length < 2 || activePath.length > 100) {
        next.activePath =
          activePath.length < 2
            ? $t('ui.formRules.minLength', [$t('system.menu.path'), 2])
            : $t('ui.formRules.maxLength', [$t('system.menu.path'), 100]);
      } else if (!activePath.startsWith('/')) {
        next.activePath = $t('ui.formRules.startWith', [
          $t('system.menu.path'),
          '/',
        ]);
      } else {
        const { paths } = collectUnique(rows, editing?.id ?? '');
        if (!paths.has(activePath.toLowerCase())) {
          next.activePath = $t('system.menu.activePathMustExist');
        }
      }
    }

    if (isButton && !form.authCode.trim()) {
      next.authCode = $t('ui.formRules.required', [$t('system.menu.authCode')]);
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
      const meta: Record<string, any> = {
        activeIcon: form.activeIcon || undefined,
        activePath: form.activePath.trim() || undefined,
        affixTab: form.affixTab || undefined,
        badge: form.badge || undefined,
        badgeType: form.badgeType || undefined,
        badgeVariants: form.badgeVariants || undefined,
        hideChildrenInMenu: form.hideChildrenInMenu || undefined,
        hideInBreadcrumb: form.hideInBreadcrumb || undefined,
        hideInMenu: form.hideInMenu || undefined,
        hideInTab: form.hideInTab || undefined,
        icon: form.icon || undefined,
        keepAlive: form.keepAlive || undefined,
        title: form.title.trim(),
      };
      if (form.type === 'link') {
        meta.link = form.linkSrc.trim();
      } else if (form.type === 'embedded') {
        meta.iframeSrc = form.linkSrc.trim();
      }
      // 去掉 undefined，避免把空字段写进 meta
      for (const k of Object.keys(meta)) {
        if (meta[k] === undefined) {
          delete meta[k];
        }
      }

      const payload = {
        authCode: form.authCode.trim(),
        component: ['catalog', 'menu'].includes(form.type)
          ? form.component.trim()
          : '',
        meta,
        name: form.name.trim(),
        path: ['catalog', 'embedded', 'menu'].includes(form.type)
          ? form.path.trim()
          : '',
        pid: form.pid || '0',
        // 官方表单没有排序项，但后端 update 是整行覆盖，透传原值避免被清零
        sort: editing?.sort ?? 0,
        status: form.status,
        type: form.type,
      };

      if (editing) {
        await updateMenu(editing.id, payload);
        message.success('修改成功');
      } else {
        await createMenu(payload);
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

  /** 上级菜单：编辑时排除自身及子树 */
  const parentOptions = React.useMemo(() => {
    if (!editing) {
      return toTreeOptions(rows);
    }
    const excluded = new Set<string>();
    const mark = (node: SystemApi.MenuItem) => {
      excluded.add(node.id);
      node.children?.forEach(mark);
    };
    const find = (nodes: SystemApi.MenuItem[]): SystemApi.MenuItem | null => {
      for (const n of nodes) {
        if (n.id === editing.id) return n;
        const hit = n.children ? find(n.children) : null;
        if (hit) return hit;
      }
      return null;
    };
    const self = find(rows);
    if (self) mark(self);
    const prune = (nodes: SystemApi.MenuItem[]): TreeOption[] =>
      nodes
        .filter((n) => !excluded.has(n.id))
        .map((n) => ({
          children: n.children?.length ? prune(n.children) : undefined,
          label: $t(n.meta?.title ?? n.name),
          value: n.id,
        }));
    return prune(rows);
  }, [rows, editing]);

  const OpLink = ({
    children,
    danger,
    onClick,
  }: {
    children: React.ReactNode;
    danger?: boolean;
    onClick?: () => void;
  }) => (
    <button
      className={`cursor-pointer text-sm leading-[22px] ${
        danger
          ? 'text-[var(--antd-danger)] hover:opacity-80'
          : 'text-[var(--antd-primary)] hover:opacity-80'
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );

  const columns: {
    align?: 'center' | 'left' | 'right';
    render: (item: FlatMenu) => React.ReactNode;
    title: string;
    width?: number;
  }[] = [
    {
      align: 'left',
      render: ({ depth, row }) => (
        <div
          className="flex items-center gap-1"
          style={{ paddingLeft: `${depth * 20}px` }}
        >
          {row.children?.length ? (
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
          <span className="size-5 shrink-0">
            {row.type === 'button' ? (
              <Icon className="size-full" icon="carbon:security" />
            ) : row.meta?.icon ? (
              <Icon className="size-full" icon={row.meta.icon} />
            ) : null}
          </span>
          <span className="flex-auto truncate">
            {$t(row.meta?.title ?? row.name)}
          </span>
        </div>
      ),
      title: $t('system.menu.menuTitle'),
      width: 250,
    },
    {
      render: ({ row }) => <TypeTag type={row.type} />,
      title: $t('system.menu.type'),
      width: 100,
    },
    {
      render: ({ row }) => row.authCode ?? '',
      title: $t('system.menu.authCode'),
      width: 180,
    },
    {
      align: 'left',
      render: ({ row }) => row.path ?? '',
      title: $t('system.menu.path'),
      width: 180,
    },
    {
      align: 'left',
      render: ({ row }) => (
        <span className="block truncate">{componentText(row)}</span>
      ),
      title: $t('system.menu.component'),
    },
    {
      render: ({ row }) => <StatusTag status={row.status} />,
      title: $t('system.menu.status'),
      width: 100,
    },
    {
      align: 'right',
      render: ({ row }) => (
        <div className="flex items-center justify-end gap-3">
          <OpLink onClick={() => openCreate(row.id)}>新增下级</OpLink>
          <OpLink onClick={() => openEdit(row)}>{$t('common.edit')}</OpLink>
          <OpLink danger onClick={() => onDelete(row)}>
            {$t('common.delete')}
          </OpLink>
        </div>
      ),
      title: $t('system.menu.operation'),
      width: 200,
    },
  ];

  const type = form.type;
  const isButton = type === 'button';
  const showPath = ['catalog', 'embedded', 'menu'].includes(type);
  const showComponent = type === 'menu';
  const showLink = ['embedded', 'link'].includes(type);
  const showActivePath = ['embedded', 'menu'].includes(type);
  const showIcon = ['catalog', 'embedded', 'link', 'menu'].includes(type);
  const showActiveIcon = ['catalog', 'embedded', 'menu'].includes(type);
  const showAuthCode = ['button', 'catalog', 'embedded', 'menu'].includes(type);
  const showBadge = !isButton;
  const showAdvanced = !['button', 'link'].includes(type);

  return (
    <SystemPage>
      <div className="flex h-full flex-col">
        <div className="flex-1 rounded-[10px] bg-[var(--antd-card-bg)] px-3 py-2">
          <div className="flex items-center justify-between px-2 pb-[17px]">
            <div />
            <button
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border-transparent bg-[var(--antd-primary)] px-[15px] text-sm leading-[22px] text-white transition-opacity hover:opacity-90"
              type="button"
              onClick={() => openCreate()}
            >
              <Plus className="size-5" />
              {$t('ui.actionTitle.create', [$t('system.menu.name')])}
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
                {flat.map((item) => (
                  <tr
                    className="transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                    key={item.row.id}
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
                        {col.render(item)}
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
        open={open}
        title={
          editing
            ? $t('ui.actionTitle.edit', [$t('system.menu.name')])
            : $t('ui.actionTitle.create', [$t('system.menu.name')])
        }
        width={800}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
          {/* 类型 */}
          <div className="md:col-span-2">
            <FormItem label={$t('system.menu.type')}>
              <div className="flex flex-wrap items-center">
                {TYPE_OPTIONS.map((opt) => {
                  const active = opt.value === form.type;
                  return (
                    <button
                      className={`-ml-px inline-flex h-8 cursor-pointer items-center justify-center border px-[15px] text-sm leading-[22px] first:ml-0 first:rounded-l-lg last:rounded-r-lg ${
                        active
                          ? 'z-10 border-[var(--antd-primary)] bg-[var(--antd-primary)] text-white'
                          : 'border-[var(--antd-border)] bg-transparent text-[var(--antd-text)] hover:border-[var(--antd-primary)] hover:text-[var(--antd-primary)]'
                      }`}
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, type: opt.value }))
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </FormItem>
          </div>

          {/* 菜单名称 */}
          <FormItem
            error={errors.name}
            label={$t('system.menu.menuName')}
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

          {/* 上级菜单 */}
          <FormItem label={$t('system.menu.parent')}>
            <TreeSelect
              options={parentOptions}
              placeholder="不选则为顶级菜单"
              value={form.pid}
              onChange={(v) => setForm((prev) => ({ ...prev, pid: v }))}
            />
          </FormItem>

          {/* 标题 */}
          <FormItem
            error={errors.title}
            label={$t('system.menu.menuTitle')}
            required
          >
            <input
              className={FIELD_CLASS}
              placeholder={$t('ui.placeholder.input')}
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </FormItem>

          {/* 路由地址 */}
          {showPath && (
            <FormItem
              error={errors.path}
              label={$t('system.menu.path')}
              required
            >
              <input
                className={FIELD_CLASS}
                placeholder="/dashboard"
                value={form.path}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, path: e.target.value }))
                }
              />
            </FormItem>
          )}

          {/* 激活路径 */}
          {showActivePath && (
            <FormItem
              error={errors.activePath}
              label={$t('system.menu.activePath')}
            >
              <input
                className={FIELD_CLASS}
                placeholder="/analytics"
                value={form.activePath}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, activePath: e.target.value }))
                }
              />
              {!errors.activePath && (
                <div className="text-xs leading-[20px] whitespace-pre-line text-[rgba(242,242,242,0.45)]">
                  {$t('system.menu.activePathHelp')}
                </div>
              )}
            </FormItem>
          )}

          {/* 图标 */}
          {showIcon && (
            <FormItem label={$t('system.menu.icon')}>
              <div className="flex items-center gap-2">
                <input
                  className={FIELD_CLASS}
                  placeholder="carbon:dashboard"
                  value={form.icon}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, icon: e.target.value }))
                  }
                />
                {form.icon && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--antd-border)]">
                    <Icon className="size-4" icon={form.icon} />
                  </span>
                )}
              </div>
            </FormItem>
          )}

          {showActiveIcon && (
            <FormItem label={$t('system.menu.activeIcon')}>
              <div className="flex items-center gap-2">
                <input
                  className={FIELD_CLASS}
                  placeholder="carbon:home"
                  value={form.activeIcon}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, activeIcon: e.target.value }))
                  }
                />
                {form.activeIcon && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--antd-border)]">
                    <Icon className="size-4" icon={form.activeIcon} />
                  </span>
                )}
              </div>
            </FormItem>
          )}

          {/* 页面组件 */}
          {showComponent && (
            <div className="md:col-span-2">
              <FormItem
                error={errors.component}
                label={$t('system.menu.component')}
                required
              >
                <input
                  className={`${FIELD_CLASS} font-mono`}
                  placeholder="/views/dashboard/index"
                  value={form.component}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, component: e.target.value }))
                  }
                />
              </FormItem>
            </div>
          )}

          {/* 链接地址（内嵌 / 外链） */}
          {showLink && (
            <div className="md:col-span-2">
              <FormItem
                error={errors.linkSrc}
                label={$t('system.menu.linkSrc')}
                required
              >
                <input
                  className={FIELD_CLASS}
                  placeholder="https://..."
                  value={form.linkSrc}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, linkSrc: e.target.value }))
                  }
                />
              </FormItem>
            </div>
          )}

          {/* 权限标识 */}
          {showAuthCode && (
            <FormItem
              error={errors.authCode}
              label={$t('system.menu.authCode')}
              required={isButton}
            >
              <input
                className={`${FIELD_CLASS} font-mono`}
                placeholder="system:user:list"
                value={form.authCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, authCode: e.target.value }))
                }
              />
            </FormItem>
          )}

          {/* 状态 */}
          <FormItem label={$t('system.menu.status')}>
            <RadioButtons
              options={[
                { label: $t('common.enabled'), value: 1 },
                { label: $t('common.disabled'), value: 0 },
              ]}
              value={form.status}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
            />
          </FormItem>

          {/* 徽标 */}
          {showBadge && (
            <>
              <FormItem label={$t('system.menu.badgeType.title')}>
                <select
                  className={`${FIELD_CLASS} cursor-pointer`}
                  value={form.badgeType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, badgeType: e.target.value }))
                  }
                >
                  <option value="">{$t('system.menu.badgeType.none')}</option>
                  <option value="dot">{$t('system.menu.badgeType.dot')}</option>
                  <option value="normal">
                    {$t('system.menu.badgeType.normal')}
                  </option>
                </select>
              </FormItem>
              <FormItem label={$t('system.menu.badge')}>
                <input
                  className={FIELD_CLASS}
                  disabled={form.badgeType !== 'normal'}
                  placeholder={$t('ui.placeholder.input')}
                  value={form.badge}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, badge: e.target.value }))
                  }
                />
              </FormItem>
              <FormItem label={$t('system.menu.badgeVariants')}>
                <select
                  className={`${FIELD_CLASS} cursor-pointer`}
                  value={form.badgeVariants}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      badgeVariants: e.target.value,
                    }))
                  }
                >
                  <option value="">{$t('ui.placeholder.select')}</option>
                  {[
                    'default',
                    'destructive',
                    'primary',
                    'success',
                    'warning',
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </FormItem>
            </>
          )}

          {/* 高级设置 */}
          {showAdvanced && (
            <div className="md:col-span-2">
              <div className="mb-3 border-t border-[var(--antd-border)] pt-4 text-sm text-[rgba(242,242,242,0.65)]">
                {$t('system.menu.advancedSettings')}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {type === 'menu' && (
                  <CheckboxField
                    checked={form.keepAlive}
                    label={$t('system.menu.keepAlive')}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, keepAlive: v }))
                    }
                  />
                )}
                {['embedded', 'menu'].includes(type) && (
                  <CheckboxField
                    checked={form.affixTab}
                    label={$t('system.menu.affixTab')}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, affixTab: v }))
                    }
                  />
                )}
                <CheckboxField
                  checked={form.hideInMenu}
                  label={$t('system.menu.hideInMenu')}
                  onChange={(v) =>
                    setForm((prev) => ({ ...prev, hideInMenu: v }))
                  }
                />
                {['catalog', 'menu'].includes(type) && (
                  <CheckboxField
                    checked={form.hideChildrenInMenu}
                    label={$t('system.menu.hideChildrenInMenu')}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, hideChildrenInMenu: v }))
                    }
                  />
                )}
                <CheckboxField
                  checked={form.hideInBreadcrumb}
                  label={$t('system.menu.hideInBreadcrumb')}
                  onChange={(v) =>
                    setForm((prev) => ({ ...prev, hideInBreadcrumb: v }))
                  }
                />
                <CheckboxField
                  checked={form.hideInTab}
                  label={$t('system.menu.hideInTab')}
                  onChange={(v) =>
                    setForm((prev) => ({ ...prev, hideInTab: v }))
                  }
                />
              </div>
            </div>
          )}
        </div>
      </FormDrawer>
    </SystemPage>
  );
}
