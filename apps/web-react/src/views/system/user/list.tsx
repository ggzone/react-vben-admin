/**
 * 系统管理 - 用户管理 —— 对齐 playground src/views/system/user/list.vue
 *
 * 布局：左侧部门树面板（搜索 + 树）+ 右侧（查询表单区 + 用户列表表格 + 分页）
 * 数据源：backend-mock /api/system/user/list、/api/system/dept/list（与 playground 一致）
 */
import * as React from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';

import { getDeptList, getUserList, type SystemApi } from '#/api/system';
import { $t } from '#/locales';
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
}: {
  depth: number;
  node: SystemApi.DeptItem;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const hasChildren = !!node.children?.length;
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
          if (hasChildren) setExpanded((v) => !v);
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
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeptTree({ onSelect }: { onSelect: (id: string) => void }) {
  const [depts, setDepts] = React.useState<SystemApi.DeptItem[]>([]);
  const [keyword, setKeyword] = React.useState('');
  const [selectedId, setSelectedId] = React.useState('');

  React.useEffect(() => {
    getDeptList()
      .then(setDepts)
      .catch(() => setDepts([]));
  }, []);

  const filtered = React.useMemo(() => {
    if (!keyword.trim()) return depts;
    // 简单过滤：保留包含关键字的节点及其父链
    const walk = (nodes: SystemApi.DeptItem[]): SystemApi.DeptItem[] =>
      nodes
        .map((node) => {
          const children = node.children ? walk(node.children) : [];
          if (
            node.name.toLowerCase().includes(keyword.toLowerCase()) ||
            children.length
          ) {
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
            key={node.id}
            node={node}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              onSelect(id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- 用户管理页 ---------------- */

export default function SystemUser() {
  const [rows, setRows] = React.useState<SystemApi.UserItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  // 查询条件
  const [name, setName] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [remark, setRemark] = React.useState('');
  const [deptId, setDeptId] = React.useState('');
  const [submitted, setSubmitted] = React.useState({});
  const [collapsed, setCollapsed] = React.useState(false);

  const fetchData = React.useCallback(() => {
    setLoading(true);
    getUserList({
      deptId,
      id: userId,
      name,
      page,
      pageSize,
      remark,
      ...submitted,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, submitted]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: TableColumn[] = [
    { render: (row) => row.name, title: $t('system.user.name'), width: 200 },
    {
      render: (row) => <span className="block truncate">{row.id}</span>,
      title: $t('system.user.id'),
      width: 200,
    },
    {
      render: (row) => <StatusSwitch status={row.status} />,
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
      render: () => (
        <div className="flex items-center justify-center gap-3">
          <LinkBtn>{$t('common.edit')}</LinkBtn>
          <LinkBtn danger>{$t('common.delete')}</LinkBtn>
        </div>
      ),
      title: $t('system.user.operation'),
      width: 130,
    },
  ];

  return (
    <SystemPage>
      <div className="flex h-full gap-2">
        <DeptTree onSelect={(id) => setDeptId(id)} />
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
                  defaultValue=""
                >
                  <option value="">{$t('ui.placeholder.select')}</option>
                  <option value="1">已启用</option>
                  <option value="0">已停用</option>
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
              {!collapsed && (
                <QueryItem label={$t('system.user.createTime')}>
                  <div className="flex h-8 items-center gap-1 rounded-lg border border-[var(--antd-border)] px-[11px] text-sm text-[rgba(242,242,242,0.3)]">
                    开始日期 <span className="mx-1">→</span> 结束日期
                  </div>
                </QueryItem>
              )}
              <QueryActions
                collapsed={collapsed}
                onCollapse={() => setCollapsed((v) => !v)}
                onReset={() => {
                  setName('');
                  setUserId('');
                  setRemark('');
                  setDeptId('');
                  setPage(1);
                  setSubmitted({});
                }}
                onSearch={() => {
                  setPage(1);
                  setSubmitted({ deptId, id: userId, name, remark });
                }}
              />
            </div>
          </QueryCard>

          <div className="flex-1 rounded-[10px] bg-[var(--antd-card-bg)] px-3 py-2">
            <TableToolbar title={$t('system.user.list')}>
              <PrimaryBtn>
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
    </SystemPage>
  );
}
