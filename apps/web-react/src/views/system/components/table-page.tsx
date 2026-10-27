/**
 * 系统管理通用表格部件 —— 对齐 playground 的 VxeTable + antd 外观（实测样式复刻）
 *
 * 视觉规格（与 playground 系统管理页截图逐像素对齐）：
 * - 表格：无圆角卡片内嵌，行高 38px，行分隔线 1px，表头底色略深、字色 muted
 * - 状态徽章：antd Tag 蓝（已启用）/ 灰（已停用），带白点
 * - 操作列：修改 / 删除 文字链接（primary 色）
 * - 分页：共 N 条记录 + pageSize 选择 + 页码
 * - 工具栏（对齐 vxe-grid toolbarConfig）：
 *   · 搜索 30×30 圆形，展开态实心 #006be6，收起态描边 —— 切换查询表单显隐
 *   · 刷新 30×30 圆形 —— 重新请求
 *   · 全屏 30×30 圆形 —— 卡片变 fixed inset-0 z-1003（官方 .vxe-grid.is--maximize）
 *   · 列设置 30×30 圆形 —— 贴按钮下沿弹面板（官方 vxe-table custom panel）
 */
import * as React from 'react';

import { $t } from '#/locales';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Pin,
  RefreshCw,
  Search,
} from 'lucide-react';

/* ---------------- 状态渲染（对齐 playground CellTag / CellSwitch） ---------------- */

/** CellTag：antd Tag 暗色主题 success/error 预设（bg #162312/#2a1215, border #274902/#58181c, 文字 #49aa19/#e84749） */
export function StatusTag({ status }: { status: number }) {
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

/** CellSwitch：antd Switch（checkedChildren 启用 / unCheckedChildren 停用，宽度随文字自适应） */
export function StatusSwitch({
  onChange,
  status,
}: {
  /** 点击时把「期望切换到的状态」交给调用方（对齐官方 CellSwitch beforeChange） */
  onChange?: (next: number) => void;
  status: number;
}) {
  const enabled = status === 1;
  return (
    <button
      aria-checked={enabled}
      className={`relative inline-flex h-[22px] cursor-pointer items-center rounded-full transition-colors ${
        enabled ? 'bg-[var(--antd-primary)]' : 'bg-[rgba(255,255,255,0.25)]'
      }`}
      role="switch"
      type="button"
      onClick={() => onChange?.(enabled ? 0 : 1)}
    >
      <span
        className={`text-xs leading-[20px] text-white ${
          enabled ? 'pl-[9px] pr-[22px]' : 'pl-[22px] pr-[9px]'
        }`}
      >
        {enabled ? $t('common.enabled') : $t('common.disabled')}
      </span>
      <span
        className={`absolute top-[2px] size-[18px] rounded-full bg-white shadow ${
          enabled ? 'right-[2px]' : 'left-[2px]'
        }`}
      />
    </button>
  );
}

/* ---------------- 操作列链接 ---------------- */

export function LinkBtn({
  children,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
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
}

/* ---------------- 工具栏圆形按钮（对齐 vxe-button.is--circle 30×30） ---------------- */

const CIRCLE_BTN =
  'flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors';
const CIRCLE_IDLE =
  'border-[var(--antd-border)] bg-[var(--antd-input-bg)] text-[var(--antd-text)] hover:border-[#006be6] hover:text-[#006be6]';
const CIRCLE_ON = 'border-[#006be6] bg-[var(--antd-input-bg)] text-[#006be6]';
const CIRCLE_PRIMARY = 'border-[#006be6] bg-[#006be6] text-white';

export function PrimaryBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="antd-btn-primary inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border-transparent bg-[var(--antd-primary)] px-[15px] text-sm leading-[22px] text-white transition-opacity hover:opacity-90"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* ---------------- 列设置面板（对齐 vxe-table custom panel：234 宽、贴按钮下沿） ---------------- */

function ColumnSettingPanel({
  allKeys,
  draftHidden,
  onApply,
  onCancel,
  onToggleOne,
  onToggleAll,
  fullscreen,
}: {
  allKeys: string[];
  draftHidden: string[];
  /** 全屏时工具栏贴视口顶，面板改为向下弹，避免超出可视区域 */
  fullscreen?: boolean;
  onApply: () => void;
  onCancel: () => void;
  onToggleAll: (hide: boolean) => void;
  onToggleOne: (key: string) => void;
}) {
  const hidden = new Set(draftHidden);
  const allVisible = hidden.size === 0;
  return (
    <div
      className={`antd-popover-shadow absolute right-1 z-50 w-[234px] overflow-hidden rounded-[4px] border border-[var(--antd-border)] bg-[#1c1e23] text-sm ${
        fullscreen ? 'top-[44px]' : '-top-[35px]'
      }`}
      role="dialog"
    >
      <div className="flex h-[30px] items-center gap-2 px-3">
        <Box
          checked={allVisible}
          indeterminate={!allVisible && hidden.size < allKeys.length}
        />
        <span
          className="cursor-pointer text-[var(--antd-primary)]"
          onClick={() => onToggleAll(allVisible)}
        >
          {$t('common.all')}
        </span>
      </div>
      <div className="max-h-[222px] overflow-y-auto border-t border-[var(--antd-border)]">
        {allKeys.map((key) => {
          const on = !hidden.has(key);
          return (
            <div
              className="flex h-7 cursor-pointer items-center gap-2 px-3 hover:bg-[rgba(255,255,255,0.06)]"
              key={key}
              onClick={() => onToggleOne(key)}
            >
              <Box checked={on} />
              <GripVertical className="size-3 shrink-0 text-[rgba(242,242,242,0.35)]" />
              <span className="truncate text-[var(--antd-text)]">{key}</span>
              <span className="ml-auto flex items-center gap-2 text-[rgba(242,242,242,0.45)]">
                <Pin className="size-3 -rotate-45" />
                <Pin className="size-3 rotate-45" />
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex h-[37px] items-center justify-between border-t border-[var(--antd-border)] px-3">
        <button
          className="cursor-pointer text-sm text-[var(--antd-primary)] disabled:cursor-not-allowed disabled:text-[rgba(242,242,242,0.25)]"
          disabled={allVisible}
          type="button"
          onClick={() => onToggleAll(false)}
        >
          {$t('common.resetDefault')}
        </button>
        <div className="flex items-center gap-3">
          <button
            className="cursor-pointer text-sm text-[var(--antd-primary)]"
            type="button"
            onClick={onCancel}
          >
            {$t('common.cancel')}
          </button>
          <button
            className="cursor-pointer text-sm text-[var(--antd-primary)]"
            type="button"
            onClick={onApply}
          >
            {$t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** antd / vxe 复选框方框：16×16、radius 4、选中蓝底白勾 */
export function Box({
  checked,
  indeterminate,
}: {
  checked: boolean;
  indeterminate?: boolean;
}) {
  return (
    <span
      aria-checked={checked}
      className={`relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
        checked || indeterminate
          ? 'border-[var(--antd-primary)] bg-[var(--antd-primary)]'
          : 'border-[rgba(242,242,242,0.3)] bg-transparent'
      }`}
      role="checkbox"
    >
      {indeterminate && !checked ? (
        <span className="h-[2px] w-2 rounded-[1px] bg-white" />
      ) : checked ? (
        <svg className="size-3 text-white" fill="none" viewBox="0 0 12 12">
          <path
            d="M2 6.2 4.6 8.8 10 3.2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : null}
    </span>
  );
}

/* ---------------- 表格面板：工具栏 + 表格 + 分页（含全屏 / 列设置） ---------------- */

export interface TablePanelProps {
  children: (
    visibleColumns: (columns: TableColumn[]) => TableColumn[],
  ) => React.ReactNode;
  columns: TableColumn[];
  /** 传入则渲染「搜索」圆钮（官方 user/role 页开 search，dept/menu 页不渲染） */
  onRefresh?: () => void;
  search?: { onToggle: () => void; open: boolean };
  title: string;
  /** 工具栏左侧额外按钮（新增 / 全部展开等） */
  tools?: React.ReactNode;
}

export function TablePanel({
  children,
  columns,
  onRefresh,
  search,
  title,
  tools,
}: TablePanelProps) {
  const [fullscreen, setFullscreen] = React.useState(false);
  const [settingOpen, setSettingOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [draftHidden, setDraftHidden] = React.useState<string[]>([]);

  const allKeys = React.useMemo(
    () => columns.map((c) => c.title).filter(Boolean),
    [columns],
  );

  const openSetting = () => {
    setDraftHidden(hidden);
    setSettingOpen((v) => !v);
  };

  const filterColumns = React.useCallback(
    (list: TableColumn[]) => list.filter((c) => !hidden.includes(c.title)),
    [hidden],
  );

  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[1003] flex flex-col bg-[var(--antd-card-bg)] px-[13px] py-[6.5px]'
          : 'flex min-h-0 flex-1 flex-col rounded-[10px] bg-[var(--antd-card-bg)] px-2 pt-0 pb-2'
      }
    >
      <div className="relative flex h-12 shrink-0 items-center justify-between pr-1 pl-2">
        <div className="text-[15px] leading-[32px] font-semibold text-[var(--antd-text)]">
          {title}
        </div>
        <div className="flex items-center gap-1.5">
          {tools}
          {search && (
            <button
              aria-label="search"
              className={`${CIRCLE_BTN} ${search.open ? CIRCLE_PRIMARY : CIRCLE_ON} mr-1.5`}
              title={$t('common.search')}
              type="button"
              onClick={search.onToggle}
            >
              <Search className="size-3.5" />
            </button>
          )}
          <button
            aria-label="refresh"
            className={`${CIRCLE_BTN} ${CIRCLE_IDLE}`}
            title={$t('common.refresh')}
            type="button"
            onClick={onRefresh}
          >
            <RefreshCw className="size-3.5" />
          </button>
          <button
            aria-label="zoom"
            className={`${CIRCLE_BTN} ${fullscreen ? CIRCLE_ON : CIRCLE_IDLE}`}
            title={fullscreen ? $t('common.restore') : $t('common.fullscreen')}
            type="button"
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </button>
          <button
            aria-label="custom-column"
            className={`${CIRCLE_BTN} ${settingOpen ? CIRCLE_ON : CIRCLE_IDLE}`}
            title={$t('common.columnSetting')}
            type="button"
            onClick={openSetting}
          >
            <LayoutGrid className="size-3.5" />
          </button>
        </div>
        {settingOpen && (
          <ColumnSettingPanel
            allKeys={allKeys}
            draftHidden={draftHidden}
            fullscreen={fullscreen}
            onApply={() => {
              setHidden(draftHidden);
              setSettingOpen(false);
            }}
            onCancel={() => setSettingOpen(false)}
            onToggleAll={(hide) => setDraftHidden(hide ? allKeys : [])}
            onToggleOne={(key) =>
              setDraftHidden((prev) =>
                prev.includes(key)
                  ? prev.filter((k) => k !== key)
                  : [...prev, key],
              )
            }
          />
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {children(filterColumns)}
      </div>
    </div>
  );
}

/* ---------------- 表格 ---------------- */

export interface TableColumn {
  /** 对齐方式（官方 vxe 全局 align: 'center'，个别列覆盖为 left/right） */
  align?: 'center' | 'left' | 'right';
  /** 单元格渲染 */
  render?: (row: any) => React.ReactNode;
  /** 表头 */
  title: string;
  /** 宽度（px，未指定则自动） */
  width?: number;
  /** 排序：'asc' | 'desc' 会渲染排序箭头并支持点击切换 */
  sortable?: boolean;
}

export function DataTable({
  columns,
  rows,
}: {
  columns: TableColumn[];
  rows: any[];
}) {
  const alignClass = (a?: string) =>
    a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center';
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-sm text-[var(--antd-text)]">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                className={`overflow-hidden border-b border-[var(--antd-border)] bg-[#2e3033] px-4 font-normal text-[rgba(242,242,242,0.65)] whitespace-nowrap ${alignClass(col.align)}`}
                key={i}
                style={{
                  ...({ height: 40 } as React.CSSProperties),
                  ...(col.width ? { width: col.width } : {}),
                }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              className="transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              key={row.id ?? ri}
            >
              {columns.map((col, ci) => (
                <td
                  className={`overflow-hidden border-b border-[var(--antd-border)] px-4 align-middle whitespace-nowrap ${alignClass(col.align)}`}
                  key={ci}
                  style={{ height: 40 } as React.CSSProperties}
                >
                  {col.render ? col.render(row) : (row[col.title] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
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
  );
}

/* ---------------- 分页 ---------------- */

const PAGE_SIZES = [10, 20, 50, 100];

export function Pagination({
  current,
  onChange,
  onPageSizeChange,
  pageSize,
  total,
}: {
  current: number;
  onChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages: number[] = [];
  for (let p = 1; p <= totalPages; p++) pages.push(p);
  const visible = pages.filter(
    (p) => p <= 2 || p > totalPages - 2 || Math.abs(p - current) <= 1,
  );
  const pageBtn =
    'flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--antd-border)] bg-[var(--antd-card-bg)] text-sm text-[var(--antd-text)] transition-colors';
  return (
    <div className="flex items-center justify-between px-2 py-4 text-sm text-[var(--antd-text)]">
      <div className="flex items-center gap-2">
        <span>共 {total} 条记录</span>
        <select
          className="h-8 cursor-pointer rounded-lg border border-[var(--antd-border)] bg-[var(--antd-card-bg)] px-2 outline-none"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}条/页
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          className={pageBtn}
          disabled={current <= 1}
          type="button"
          onClick={() => onChange(1)}
        >
          <ChevronsLeft className="size-3.5" />
        </button>
        <button
          className={pageBtn}
          disabled={current <= 1}
          type="button"
          onClick={() => onChange(current - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </button>
        {visible.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && p - visible[i - 1] > 1 && (
              <span className="px-1 text-[var(--antd-text)]">…</span>
            )}
            <button
              className={`${pageBtn} ${p === current ? 'border-[var(--antd-primary)] text-[var(--antd-primary)]' : ''}`}
              type="button"
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          </React.Fragment>
        ))}
        <button
          className={pageBtn}
          disabled={current >= totalPages}
          type="button"
          onClick={() => onChange(current + 1)}
        >
          <ChevronRight className="size-3.5" />
        </button>
        <button
          className={pageBtn}
          disabled={current >= totalPages}
          type="button"
          onClick={() => onChange(totalPages)}
        >
          <ChevronsRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ---------------- 查询表单区（antd 风格 label 左置） ---------------- */

export function QueryItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-16 shrink-0 text-right text-sm leading-[22px] text-[var(--antd-text)]">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export const QUERY_INPUT =
  'h-8 w-full rounded-lg border border-[var(--antd-border)] bg-transparent px-[11px] py-1 text-sm leading-[22px] text-[var(--antd-text)] outline-none placeholder:text-[rgba(242,242,242,0.3)]';

export function QueryActions({
  collapsed = false,
  onCollapse,
  onReset,
  onSearch,
}: {
  collapsed?: boolean;
  onCollapse?: () => void;
  onReset: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        className={`${QUERY_ACTIONS_BTN} antd-btn border-[var(--antd-border)] bg-[var(--antd-card-bg)] text-[var(--antd-text)] hover:border-[var(--antd-primary)] hover:text-[var(--antd-primary)]`}
        type="button"
        onClick={onReset}
      >
        重 置
      </button>
      <button
        className={`${QUERY_ACTIONS_BTN} antd-btn-primary border-transparent bg-[var(--antd-primary)] text-white hover:opacity-90`}
        type="button"
        onClick={onSearch}
      >
        <Search className="mr-1 inline size-3.5" />
        搜 索
      </button>
      {onCollapse && (
        <button
          className="flex cursor-pointer items-center gap-1 text-sm text-[var(--antd-primary)] hover:opacity-80"
          type="button"
          onClick={onCollapse}
        >
          {collapsed ? '展开' : '收起'}
          <ChevronDown
            className={`size-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
      )}
    </div>
  );
}

const QUERY_ACTIONS_BTN =
  'inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border px-[15px] text-sm leading-[22px] transition-colors';

/** 查询卡片容器（对齐 playground 深色查询区卡片） */
export function QueryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-[var(--antd-card-bg)] px-4 py-4">
      {children}
    </div>
  );
}

/** 页面骨架：深色背景 + 16px 内距（对齐官方 Page 组件 p-4） */
export function SystemPage({ children }: { children: React.ReactNode }) {
  return <div className="antd-ui h-full min-h-full p-4">{children}</div>;
}
