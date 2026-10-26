/**
 * 系统管理 - 角色管理 —— 对齐 playground src/views/system/role/list.vue
 *
 * 布局：查询表单区 + 角色列表表格 + 分页（无部门树，全宽）
 * 数据源：backend-mock /api/system/role/list（与 playground 一致）
 */
import * as React from 'react';

import { Plus } from 'lucide-react';

import { getRoleList, type SystemApi } from '#/api/system';
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

export default function SystemRole() {
  const [rows, setRows] = React.useState<SystemApi.RoleItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  // 查询条件
  const [name, setName] = React.useState('');
  const [roleId, setRoleId] = React.useState('');
  const [remark, setRemark] = React.useState('');
  const [submitted, setSubmitted] = React.useState({});
  const [collapsed, setCollapsed] = React.useState(false);

  const fetchData = React.useCallback(() => {
    setLoading(true);
    getRoleList({
      id: roleId,
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
    {
      render: (row) => row.name,
      title: $t('system.role.roleName'),
      width: 200,
    },
    { render: (row) => row.id, title: $t('system.role.id'), width: 200 },
    {
      render: (row) => <StatusSwitch status={row.status} />,
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
      render: () => (
        <div className="flex items-center justify-center gap-3">
          <LinkBtn>{$t('common.edit')}</LinkBtn>
          <LinkBtn danger>{$t('common.delete')}</LinkBtn>
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
                defaultValue=""
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
            {!collapsed && (
              <QueryItem label={$t('system.role.createTime')}>
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
                setRoleId('');
                setRemark('');
                setPage(1);
                setSubmitted({});
              }}
              onSearch={() => {
                setPage(1);
                setSubmitted({ id: roleId, name, remark });
              }}
            />
          </div>
        </QueryCard>

        <div className="flex-1 rounded-[10px] bg-[var(--antd-card-bg)] px-3 py-2">
          <TableToolbar title={$t('system.role.list')}>
            <PrimaryBtn>
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
    </SystemPage>
  );
}
