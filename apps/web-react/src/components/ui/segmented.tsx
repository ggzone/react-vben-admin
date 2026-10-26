/**
 * Segmented —— 与官方 @vben-core/shadcn-ui 的 segmented.vue 1:1 对齐
 *
 * 官方实现：Tabs + TabsList(`bg-accent outline-heavy! outline! outline-2! relative grid w-full`)
 * + TabsIndicator（宽度 100%/n，translate 到当前索引，内含 `bg-background` 药丸）
 * + TabsTrigger（选中 `font-bold! text-primary`）。
 * Radix 没有 TabsIndicator，这里用受控 button + 滑动指示器复刻同一视觉。
 */
import * as React from 'react';

import { cn } from '#/lib/utils';

export interface SegmentedItem {
  label: React.ReactNode;
  value: string;
}

export interface SegmentedProps {
  className?: string;
  items: SegmentedItem[];
  onValueChange?: (value: string) => void;
  value: string;
}

export function Segmented({
  className,
  items,
  onValueChange,
  value,
}: SegmentedProps) {
  const count = Math.max(1, items.length);
  const index = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  return (
    <div
      aria-label="segmented"
      className={cn(
        // 官方 TabsList 基础类含 `inline-flex h-9 items-center justify-center rounded-md p-1`，
        // 再由 segmented.vue 覆盖为 `bg-accent outline-heavy! relative grid w-full outline! outline-2!`
        // 注意 h-9 / p-1 不能省：它们决定了 36px 总高与 4px 内距（页签 28 高、5 项各 70 宽）
        'bg-accent outline-heavy relative grid h-9 w-full rounded-md p-1 outline outline-2',
        className,
      )}
      role="tablist"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {/* 滑动指示器 */}
      <div
        className="absolute bottom-0 left-0 z-10 h-full rounded-full px-0 py-1 pr-0.5 transition-[width,transform] duration-300"
        style={{
          transform: `translateX(${index * 100}%)`,
          width: `${(100 / count).toFixed(2)}%`,
        }}
      >
        <div className="bg-background text-foreground inline-flex h-full w-full items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap" />
      </div>
      {items.map((item) => (
        <button
          key={item.value}
          aria-selected={item.value === value}
          className={cn(
            'hover:text-primary z-20 inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors',
            item.value === value && 'font-bold text-primary',
          )}
          data-state={item.value === value ? 'active' : 'inactive'}
          role="tab"
          type="button"
          onClick={() => onValueChange?.(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default Segmented;
