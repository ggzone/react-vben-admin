/**
 * 系统管理通用表格部件 —— 对齐 playground 的 VxeTable + antd 外观（实测样式复刻）
 *
 * 视觉规格（与 playground 系统管理页截图逐像素对齐）：
 * - 表格：无圆角卡片内嵌，行高 38px，行分隔线 1px，表头底色略深、字色 muted
 * - 状态徽章：antd Tag 蓝（已启用）/ 灰（已停用），带白点
 * - 操作列：修改 / 删除 文字链接（primary 色）
 * - 分页：共 N 条记录 + pageSize 选择 + 页码
 */
import * as React from 'react';

import { $t } from '#/locales';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  RefreshCw,
  Search,
  Table2,
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

/* ---------------- 工具栏 ---------------- */

const ICON_BTN =
  'flex size-[30px] cursor-pointer items-center justify-center rounded-full border border-[var(--antd-border)] bg-[var(--antd-card-bg)] text-[var(--antd-text)] transition-colors hover:text-[var(--antd-primary)]';

export function TableToolbar({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-2 pb-[17px]">
      <div className="text-[15px] font-semibold leading-[32px] text-[var(--antd-text)]">
        {title}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {/* 对齐 vxe-grid toolbarConfig: search/refresh/zoom/custom */}
        <button
          aria-label="search"
          className="flex size-[30px] cursor-pointer items-center justify-center rounded-full bg-[var(--antd-primary)] text-white transition-opacity hover:opacity-90"
          type="button"
        >
          <Search className="size-3.5" />
        </button>
        <button aria-label="refresh" className={ICON_BTN} type="button">
          <RefreshCw className="size-3.5" />
        </button>
        <button aria-label="zoom" className={ICON_BTN} type="button">
          <Maximize2 className="size-3.5" />
        </button>
        <button aria-label="custom-column" className={ICON_BTN} type="button">
          <Table2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function PrimaryBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border-transparent bg-[var(--antd-primary)] px-[15px] text-sm leading-[22px] text-white transition-opacity hover:opacity-90"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
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
  'h-8 w-full rounded-lg border border-[var(--antd-border)] bg-transparent px-[11px] text-sm leading-[22px] text-[var(--antd-text)] outline-none placeholder:text-[rgba(242,242,242,0.3)]';

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
        className={`${QUERY_ACTIONS_BTN} border-[var(--antd-border)] bg-[var(--antd-card-bg)] text-[var(--antd-text)] hover:border-[var(--antd-primary)] hover:text-[var(--antd-primary)]`}
        type="button"
        onClick={onReset}
      >
        重 置
      </button>
      <button
        className={`${QUERY_ACTIONS_BTN} border-transparent bg-[var(--antd-primary)] text-white hover:opacity-90`}
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
