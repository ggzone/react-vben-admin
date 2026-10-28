/**
 * 自绘 antd Select（暗色弹层）—— 替换原生 <select>
 *
 * 为什么要自绘：原生 <option> 的弹层由操作系统/浏览器渲染，暗色主题下 Chromium
 * 依然给出白底黑字的下拉（截图问题 1 的根因），CSS 无法定制，必须自己画弹层。
 *
 * 视觉规格（对齐 antd-design-vue 暗色 token）：
 * - 触发器：h32 / radius 8 / 边框 --antd-border / 底 --antd-input-bg，
 *   右侧 12px 箭头、内右距 26；有值且 allowClear 时 hover 显示清空 ×
 * - 弹层：bg #1c1e23（与列设置面板同色）、radius 8、border --antd-border、
 *   max-height 274（antd listHeight 默认 256 + padding）、item 高 32、hover 白 6%、
 *   选中项 primary 色加粗
 * - 交互：点外部 / Esc 关闭；点 item 回调并关闭（多选不需要）
 */
import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

import { cn } from '#/lib/utils';

export interface SelectOption {
  disabled?: boolean;
  label: string;
  value: string;
}

/** 点外部 / Esc 关闭（exclude 里的元素不触发关闭，如触发器本身） */
export function useDismiss(
  open: boolean,
  onClose: () => void,
  ...exclude: (HTMLElement | null)[]
) {
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      for (const el of exclude) {
        if (el?.contains(target)) return;
      }
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);
}

/** 暗色下拉弹层菜单（Select / TreeSelect / 分页器共用） */
export function SelectMenu({
  menuRef,
  onPick,
  options,
  value,
}: {
  menuRef?: React.RefObject<HTMLDivElement | null>;
  onPick: (v: string) => void;
  options: SelectOption[];
  value: string;
}) {
  return (
    <div
      className="antd-popover-shadow absolute top-[calc(100%+4px)] left-0 z-50 max-h-[274px] min-w-full overflow-y-auto rounded-lg border border-[var(--antd-border)] bg-[#1c1e23] py-1"
      ref={menuRef}
      role="listbox"
    >
      {options.length === 0 && (
        <div className="flex h-8 items-center px-3 text-sm text-[var(--antd-placeholder)]">
          无数据
        </div>
      )}
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <div
            aria-selected={selected}
            className={cn(
              'flex h-8 cursor-pointer items-center gap-1 px-3 text-sm leading-[22px] transition-colors',
              opt.disabled
                ? 'cursor-not-allowed text-[var(--antd-placeholder)]'
                : selected
                  ? 'font-medium text-[var(--antd-primary)]'
                  : 'text-[var(--antd-text)] hover:bg-[rgba(255,255,255,0.06)]',
            )}
            key={opt.value}
            role="option"
            onClick={() => {
              if (opt.disabled) return;
              onPick(opt.value);
            }}
          >
            <span className="min-w-0 flex-1 truncate">{opt.label}</span>
            {selected && (
              <Check className="size-3.5 shrink-0 text-[var(--antd-primary)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * antd Select 触发器 + 暗色弹层。
 * API 与旧版（原生 select）保持一致：value/onChange(options 的 value)/options/placeholder。
 * allowClear：有值且 hover 时显示清空按钮，点击清空并回调 ''。
 */
export function Select({
  allowClear,
  className,
  disabled,
  onChange,
  options,
  placeholder,
  value,
}: {
  allowClear?: boolean;
  className?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  useDismiss(open, () => setOpen(false), wrapRef.current, triggerRef.current);

  const current = options.find((opt) => opt.value === value);
  const showClear = allowClear && !disabled && !!value && (hover || open);

  return (
    <div className={cn('relative', className)} ref={wrapRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'flex h-8 w-full cursor-pointer items-center rounded-lg border bg-[var(--antd-input-bg)] px-[11px] text-sm outline-none transition-colors',
          open
            ? 'border-[var(--antd-primary)]'
            : 'border-[var(--antd-border)] hover:border-[var(--antd-primary)]',
          disabled && 'cursor-not-allowed bg-[rgba(255,255,255,0.04)]',
        )}
        disabled={disabled}
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-left leading-[22px]',
            current
              ? 'text-[var(--antd-text)]'
              : 'text-[var(--antd-placeholder)]',
          )}
        >
          {current?.label ?? placeholder ?? '请选择'}
        </span>
        {showClear ? (
          <X
            aria-label="clear"
            className="size-3.5 shrink-0 text-[rgba(242,242,242,0.45)] hover:text-[var(--antd-text)]"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setOpen(false);
            }}
          />
        ) : (
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 text-[rgba(242,242,242,0.45)] transition-transform',
              open && 'rotate-180',
            )}
          />
        )}
      </button>
      {open && (
        <SelectMenu
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
          options={options}
          value={value}
        />
      )}
    </div>
  );
}
