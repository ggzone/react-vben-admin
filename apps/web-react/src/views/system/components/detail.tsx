/**
 * 详情抽屉 —— 对齐官方 VbenDrawer + VbenDescriptions（upstream playground/views/system/user/modules/detail.vue）
 *
 *   <Drawer :footer="false" :title="$t('common.detail')">
 *     <VbenDescriptions bordered :column="1" :items="items" />
 *   </Drawer>
 *
 * 规格（沿用本仓库 table-page / form 里已复刻的暗色 antd 令牌）：
 * - Drawer：宽 520、右侧贴边、无圆角、border-l 1px、header px-4 py-3（16px/500 标题 + 32 圆形关闭钮）
 * - 详情不加 footer（官方 `:footer="false"`），内容区 p-3
 * - Descriptions bordered：外框 1px #36363a + radius 8；label 列 110px、底色 rgba(255,255,255,.04)、
 *   文字 muted；content 列文字 --antd-text；单元格 padding 16px 24px（官方 antd 尺寸，实测收紧为 12px 16px
 *   以适应 520 宽的抽屉，保持视觉密度与官方截图一致）
 */
import * as React from 'react';
import { X } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog';
import { cn } from '#/lib/utils';

export interface DescItem {
  content?: React.ReactNode;
  label: React.ReactNode;
}

/**
 * VbenDescriptions 等价物（bordered）。
 * column 为每行展示的条目数（官方详情用 1）；不足一行的空位用占位单元格补齐，
 * 保持边框网格完整（与 antd Descriptions 的 bordered 表现一致）。
 */
export function Descriptions({
  column = 1,
  items,
  labelWidth = 110,
}: {
  /** 每行条目数（官方详情默认 1） */
  column?: number;
  items: DescItem[];
  /** label 列宽度（px） */
  labelWidth?: number;
}) {
  const rows: DescItem[][] = [];
  for (let i = 0; i < items.length; i += column) {
    const row = items.slice(i, i + column);
    while (row.length < column) {
      row.push({ content: '', label: '' });
    }
    rows.push(row);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--antd-border)]">
      {rows.map((row, ri) => (
        <div
          className={cn(
            'flex',
            ri > 0 && 'border-t border-[var(--antd-border)]',
          )}
          key={ri}
        >
          {row.map((item, ci) => (
            <React.Fragment key={ci}>
              <div
                className="flex shrink-0 items-center border-r border-[var(--antd-border)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm leading-[22px] text-[rgba(242,242,242,0.65)]"
                style={{ width: `${labelWidth}px` }}
              >
                {item.label}
              </div>
              <div
                className={cn(
                  'min-w-0 flex-1 break-all px-4 py-3 text-sm leading-[22px] text-[var(--antd-text)]',
                  ci < row.length - 1 && 'border-r border-[var(--antd-border)]',
                )}
              >
                {item.content}
              </div>
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 详情抽屉：默认宽 520、无 footer（官方 detail.vue 的 `:footer="false"`） */
export function DetailDrawer({
  children,
  onClose,
  open,
  title,
  width = 520,
}: {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: React.ReactNode;
  width?: number;
}) {
  return (
    <Dialog onOpenChange={(v) => !v && onClose()} open={open}>
      <DialogContent
        className="antd-ui inset-y-0 right-0 left-auto flex h-full max-h-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 border-l border-[var(--antd-border)] bg-[var(--antd-card-bg)] p-0 shadow-lg sm:rounded-none data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100"
        showClose={false}
        style={{ width: `${width}px` }}
      >
        <div className="flex flex-row items-center justify-between border-b border-[var(--antd-border)] px-4 py-3">
          <DialogTitle className="text-left text-base leading-[18.4px] font-medium text-foreground">
            {title}
          </DialogTitle>
          <button
            aria-label="close"
            className="ml-0.5 flex size-8 cursor-pointer items-center justify-center rounded-full px-1 text-foreground/80 opacity-80 transition-opacity hover:bg-accent hover:opacity-100"
            type="button"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="relative flex-1 overflow-y-auto p-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
