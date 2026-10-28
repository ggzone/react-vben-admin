/**
 * antd RangePicker（暗色）—— 创建时间范围查询
 *
 * 官方 user/role 查询表单的 `component: 'RangePicker'`（fieldName: createTime）。
 * 视觉规格（antd 暗色 token）：
 * - 触发器：h32 边框盒，两段日期 + 中间 → 分隔符，占位「开始日期 / 结束日期」
 * - 弹层：bg #1c1e23、radius 8、双月并排（每月 248 宽）、
 *   header 年月 + 前后月箭头、周头 一~日（zh-CN 周一为首）、格子 32×32
 * - 区间：端点 primary 实底白字，中间 rgba(0,107,230,.25)；hover 预览
 * - 交互：点第一天 = 设起点，点第二天 = 完成并关闭；点更早日期则重新开始
 *
 * 值格式：['YYYY-MM-DD', 'YYYY-MM-DD']，空串表示未选。
 */
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '#/lib/utils';
import { useDismiss } from '#/views/system/components/select';

export type DateRange = [string, string];

const WEEK_HEADS = ['一', '二', '三', '四', '五', '六', '日'];

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parse(s: string): null | Date {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** 周一为首的 6×7 月历矩阵（含前后月补位） */
function monthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay(): 0=周日；周一为首 → 偏移 (day+6)%7
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const out: Date[] = [];
  for (let i = 0; i < 42; i++) {
    out.push(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  }
  return out;
}

const CELL =
  'flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-sm transition-colors';

function Calendar({
  month,
  onHover,
  onPick,
  onSwitch,
  rangeEnd,
  rangeStart,
}: {
  /** Date（月初任意一天） */
  month: Date;
  /** hover 日期变化（预览区间用），移出置 null */
  onHover: (d: null | Date) => void;
  onPick: (d: Date) => void;
  /** 月份整体 +1 / -1（左右面板共用一个偏移状态） */
  onSwitch: (delta: number) => void;
  rangeEnd: null | Date;
  rangeStart: null | Date;
}) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const days = monthMatrix(year, mon);
  const startT = rangeStart ? rangeStart.getTime() : 0;
  const endT = rangeEnd ? rangeEnd.getTime() : 0;
  const lo = Math.min(startT, endT);
  const hi = Math.max(startT, endT);
  return (
    <div className="w-[248px] px-2 pb-2" onMouseLeave={() => onHover(null)}>
      <div className="flex h-10 items-center justify-between">
        <ChevronLeft
          className="size-4 cursor-pointer text-[rgba(242,242,242,0.6)] hover:text-[var(--antd-text)]"
          onClick={() => onSwitch(-1)}
        />
        <span className="text-sm font-medium text-[var(--antd-text)]">
          {year}年{mon + 1}月
        </span>
        <ChevronRight
          className="size-4 cursor-pointer text-[rgba(242,242,242,0.6)] hover:text-[var(--antd-text)]"
          onClick={() => onSwitch(1)}
        />
      </div>
      <div className="grid grid-cols-7">
        {WEEK_HEADS.map((w) => (
          <div
            className="flex h-6 items-center justify-center text-xs text-[var(--antd-placeholder)]"
            key={w}
          >
            {w}
          </div>
        ))}
        {days.map((d) => {
          const t = d.getTime();
          const outside = d.getMonth() !== mon;
          const isStart = rangeStart && t === startT;
          const isEnd = rangeEnd && t === endT;
          const inRange = rangeStart && rangeEnd && t > lo && t < hi;
          return (
            <div
              className={cn(
                'flex h-8 items-center justify-center',
                inRange && !isStart && !isEnd && 'bg-[rgba(0,107,230,0.25)]',
              )}
              data-date={fmt(d)}
              key={t}
              onMouseEnter={() => onHover(d)}
            >
              <span
                className={cn(
                  CELL,
                  outside
                    ? 'text-[rgba(242,242,242,0.25)]'
                    : 'text-[var(--antd-text)] hover:bg-[rgba(255,255,255,0.08)]',
                  (isStart || isEnd) &&
                    'bg-[var(--antd-primary)] font-medium text-white',
                )}
                onClick={() => onPick(d)}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RangePicker({
  className,
  onChange,
  placeholder = ['开始日期', '结束日期'],
  value,
}: {
  className?: string;
  onChange: (range: DateRange) => void;
  placeholder?: string[];
  value: DateRange;
}) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  // 弹层左月（右月恒为左月 + 1）
  const [leftMonth, setLeftMonth] = React.useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  // 已点选的起点；null = 未选
  const [start, setStart] = React.useState<null | Date>(null);
  // hover 预览终点
  const [preview, setPreview] = React.useState<null | Date>(null);

  useDismiss(open, () => setOpen(false), wrapRef.current, triggerRef.current);

  const openPanel = () => {
    const base = parse(value[0]) ?? new Date();
    setLeftMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    // 每次打开都重新开始：第一次点击总是设为新起点（antd 口径）。
    // 若预置为旧起点，点更晚的日期会被当成「第二次点选」直接完成区间并关闭，
    // 表现为无法重新设置起始时间。
    setStart(null);
    setPreview(null);
    setOpen(true);
  };

  const rightMonth = new Date(
    leftMonth.getFullYear(),
    leftMonth.getMonth() + 1,
    1,
  );

  const pick = (d: Date) => {
    if (!start) {
      setStart(d);
      return;
    }
    // 第二次点选：不晚于起点则重新开始
    if (d.getTime() <= start.getTime()) {
      setStart(d);
      return;
    }
    onChange([fmt(start), fmt(d)]);
    setOpen(false);
  };

  // 面板高亮：本次已点起点用 start/preview；尚未点选时显示已提交的 value 区间
  const viewStart = start ?? parse(value[0]);
  const viewEnd = start ? (preview ?? start) : parse(value[1]);

  return (
    <div className={cn('relative', className)} ref={wrapRef}>
      <button
        aria-expanded={open}
        className={cn(
          'flex h-8 w-full cursor-pointer items-center rounded-lg border bg-[var(--antd-input-bg)] px-[11px] text-sm outline-none transition-colors',
          open
            ? 'border-[var(--antd-primary)]'
            : 'border-[var(--antd-border)] hover:border-[var(--antd-primary)]',
        )}
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-left leading-[22px]',
            value[0]
              ? 'text-[var(--antd-text)]'
              : 'text-[var(--antd-placeholder)]',
          )}
        >
          {value[0] || placeholder[0]}
        </span>
        <svg
          className="mx-1 size-3 shrink-0 text-[rgba(242,242,242,0.3)]"
          fill="none"
          viewBox="0 0 12 12"
        >
          <path
            d="M1 6h9M7 2.8 10.2 6 7 9.2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </svg>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-left leading-[22px]',
            value[1]
              ? 'text-[var(--antd-text)]'
              : 'text-[var(--antd-placeholder)]',
          )}
        >
          {value[1] || placeholder[1]}
        </span>
      </button>
      {open && (
        <div
          className="antd-popover-shadow absolute top-[calc(100%+4px)] left-0 z-50 flex rounded-lg border border-[var(--antd-border)] bg-[#1c1e23]"
          role="dialog"
        >
          <Calendar
            month={leftMonth}
            onHover={setPreview}
            onPick={pick}
            onSwitch={(delta) =>
              setLeftMonth(
                new Date(
                  leftMonth.getFullYear(),
                  leftMonth.getMonth() + delta,
                  1,
                ),
              )
            }
            rangeEnd={viewStart ? viewEnd : null}
            rangeStart={viewStart}
          />
          <div className="w-px bg-[var(--antd-border)]" />
          <Calendar
            month={rightMonth}
            onHover={setPreview}
            onPick={pick}
            onSwitch={(delta) =>
              setLeftMonth(
                new Date(
                  leftMonth.getFullYear(),
                  leftMonth.getMonth() + delta,
                  1,
                ),
              )
            }
            rangeEnd={viewStart ? viewEnd : null}
            rangeStart={viewStart}
          />
        </div>
      )}
    </div>
  );
}
