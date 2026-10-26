/**
 * 系统管理 - 部门管理 —— 对齐 playground src/views/system/dept/list.vue
 *
 * 布局：树形表格（无查询表单、无分页），工具栏 + 新增部门按钮
 * 数据源：backend-mock /api/system/dept/list（树结构）
 */
import * as React from 'react';

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

import { getDeptList, type SystemApi } from '#/api/system';
import { $t } from '#/locales';
import {
  StatusTag,
  SystemPage,
  TableToolbar,
} from '#/views/system/components/table-page';

/** 操作列链接（与 LinkBtn 同规格） */
function OpLink({
  children,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
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
    >
      {children}
    </button>
  );
}

export default function SystemDept() {
  const [rows, setRows] = React.useState<SystemApi.DeptItem[]>([]);
  // 对齐官方 vxe 默认行为：初始全折叠，只显示顶层节点
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    getDeptList()
      .then((data) => {
        setRows(data);
        // 初始折叠所有有子节点的节点
        const ids: string[] = [];
        const walk = (nodes: SystemApi.DeptItem[]) => {
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

  const columns: {
    render: (item: (typeof flat)[number]) => React.ReactNode;
    title: string;
    width?: number;
  }[] = [
    {
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
      width: 150,
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
      render: ({ hasChildren }) => (
        <div className="flex items-center justify-end gap-3">
          <OpLink>新增下级</OpLink>
          <OpLink>{$t('common.edit')}</OpLink>
          <OpLink danger disabled={hasChildren}>
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
          <TableToolbar title={$t('system.dept.list')}>
            <button
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border-transparent bg-[var(--antd-primary)] px-[15px] text-sm leading-[22px] text-white transition-opacity hover:opacity-90"
              type="button"
            >
              <Plus className="size-5" />
              {$t('ui.actionTitle.create', [$t('system.dept.name')])}
            </button>
          </TableToolbar>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-[var(--antd-text)]">
              <thead>
                <tr>
                  {columns.map((col, i) => (
                    <th
                      className={`overflow-hidden border-b border-[var(--antd-border)] bg-[#2e3033] px-4 font-normal text-[rgba(242,242,242,0.65)] whitespace-nowrap ${
                        i === 0
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
                          ci === 0
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
