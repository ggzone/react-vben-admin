/**
 * 系统管理 - 菜单管理 —— 对齐 playground src/views/system/menu/list.vue
 *
 * 布局：树形表格（无查询表单、无分页），工具栏 + 新增菜单按钮
 * 数据源：backend-mock /api/system/menu/list（树结构）
 * 列对齐 playground menu/data.ts：标题(树)/类型Tag/权限标识/路由地址/页面组件/状态Tag/操作
 */
import * as React from 'react';

import { Icon } from '@iconify/react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

import { getMenuList, type SystemApi } from '#/api/system';
import { $t } from '#/locales';
import { SystemPage, TableToolbar } from '#/views/system/components/table-page';

/** 操作列链接 */
function OpLink({
  children,
  danger,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      className={`cursor-pointer text-sm leading-[22px] ${
        danger
          ? 'text-[var(--antd-danger)] hover:opacity-80'
          : 'text-[var(--antd-primary)] hover:opacity-80'
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

/** antd Tag 暗色预设色（processing/default/error/success/warning） */
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
  const options: { color: string; label: string; value: string }[] = [
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
  const item = options.find((o) => o.value === type) ?? options[1];
  const style = TYPE_TAG_STYLE[item.color] ?? TYPE_TAG_STYLE.default;
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

/** 状态 CellTag（复用 dept 规格的 success/error Tag） */
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
      return (row as any).meta?.iframeSrc ?? '';
    }
    case 'link': {
      return (row as any).meta?.link ?? '';
    }
    default: {
      return '';
    }
  }
}

interface FlatMenu {
  depth: number;
  hasChildren: boolean;
  row: SystemApi.MenuItem;
}

export default function SystemMenu() {
  const [rows, setRows] = React.useState<SystemApi.MenuItem[]>([]);
  // 对齐官方 vxe 默认行为：初始全折叠，只显示顶层节点
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
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
      .catch(() => setRows([]));
  }, []);

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
    const walk = (nodes: SystemApi.MenuItem[], depth: number) => {
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

  const columns: {
    render: (item: FlatMenu) => React.ReactNode;
    title: string;
    width?: number;
  }[] = [
    {
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
      render: ({ row }) => (row as any).authCode ?? '',
      title: $t('system.menu.authCode'),
      width: 200,
    },
    {
      render: ({ row }) => row.path ?? '',
      title: $t('system.menu.path'),
      width: 200,
    },
    {
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
      render: () => (
        <div className="flex items-center justify-end gap-3">
          <OpLink>新增下级</OpLink>
          <OpLink>{$t('common.edit')}</OpLink>
          <OpLink danger>{$t('common.delete')}</OpLink>
        </div>
      ),
      title: $t('system.menu.operation'),
      width: 200,
    },
  ];

  return (
    <SystemPage>
      <div className="flex h-full flex-col">
        <div className="flex-1 rounded-[10px] bg-[var(--antd-card-bg)] px-3 py-2">
          <div className="flex items-center justify-between px-2 pb-[17px]">
            <div />
            <button
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border-transparent bg-[var(--antd-primary)] px-[15px] text-sm leading-[22px] text-white transition-opacity hover:opacity-90"
              type="button"
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
                        i === 0 || i === 3 || i === 4
                          ? 'text-left'
                          : i === columns.length - 1
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
                          ci === 0 || ci === 3 || ci === 4
                            ? 'text-left'
                            : ci === columns.length - 1
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
                {flat.length === 0 && (
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
    </SystemPage>
  );
}
