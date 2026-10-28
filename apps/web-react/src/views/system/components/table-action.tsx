/**
 * 行内操作列 —— 对齐官方 VbenTableAction（packages/@core/ui-kit/shadcn-ui 的 table-action）
 *
 * 官方 playlist（upstream playground/views/system/user/list.vue）用法：
 *   <VbenTableAction :actions="[详情, 修改]" :dropdown-actions="[删除]" align="center" />
 * 语义：
 * - actions：内联渲染的按钮（link 变体，可带 lucide 图标）
 * - dropdown-actions：收进「更多」下拉；删除项带 popConfirm 气泡，二次确认后才执行
 *
 * 实现要点：表格单元格是 `overflow-hidden`（vxe 的长文本截断），普通 absolute 弹层会被裁切，
 * 因此这里所有弹层一律用 fixed 定位到 body 坐标系，坐标取触发器实时的 getBoundingClientRect，
 * 并跟随容器滚动重算——语义上等价于 antd 的 portal + Popconfirm。
 */
import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';

import { $t } from '#/locales';
import {
  BTN_DANGER,
  BTN_DEFAULT,
  antdButtonText,
} from '#/views/system/components/form';
import { cn } from '#/lib/utils';

export interface RowAction {
  /** 危险项（删除）：文字用 antd 红，确认按钮用 danger 变体 */
  danger?: boolean;
  /** lucide 图标组件（官方 action.icon，渲染为 size-4） */
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  /** 气泡确认（官方 popConfirm）：点确认才触发 confirm，取消则不动作 */
  popConfirm?: {
    /** 点击确定时执行 */
    confirm: () => void;
    /** 气泡标题 */
    title: string;
  };
  text: string;
}

type Rect = { bottom: number; left: number; right: number; top: number };

/** 触发器位置跟随（滚动 / 尺寸变化时重算），保证 fixed 弹层不跑位 */
function useAnchorRect(open: boolean, anchor: HTMLElement | null) {
  const [rect, setRect] = React.useState<null | Rect>(null);
  React.useEffect(() => {
    if (!open || !anchor) return;
    const update = () => {
      const r = anchor.getBoundingClientRect();
      setRect({ bottom: r.bottom, left: r.left, right: r.right, top: r.top });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchor, open]);
  return rect;
}

/**
 * 简易弹层容器：fixed 定位 + 点击外部关闭 + Esc 关闭。
 * placement: top-end（气泡确认，弹在触发器上方、右对齐）/ bottom-start（下拉菜单，弹在下方、左对齐）
 */
function Popup({
  anchor,
  children,
  className,
  onClose,
  placement,
  triggerRef,
}: {
  anchor: null | Rect;
  children: React.ReactNode;
  className?: string;
  onClose: () => void;
  placement: 'bottom-start' | 'top-end';
  /** 触发器本身也算「内部」：否则点触发器时 mousedown 先关、click 再开，等于关不掉 */
  triggerRef?: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose, triggerRef]);

  if (!anchor) return null;

  const style: React.CSSProperties =
    placement === 'top-end'
      ? {
          position: 'fixed',
          right: Math.max(8, window.innerWidth - anchor.right),
          top: Math.max(8, anchor.top - 8),
          transform: 'translateY(-100%)',
        }
      : {
          position: 'fixed',
          left: Math.max(8, Math.min(anchor.left - 70, window.innerWidth - 200)),
          top: Math.max(8, anchor.bottom + 6),
        };

  return (
    <div
      className={cn(
        'antd-popover-shadow z-[1200] rounded-[4px] border border-[var(--antd-border)] bg-[#1c1e23] text-sm text-[var(--antd-text)]',
        className,
      )}
      ref={panelRef}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * 气泡确认内容 —— 对齐官方 action-item 的 PopoverContent：
 * 标题 + 右下「取消 / 确定」（danger 项确定键为红色实心）
 */
function ConfirmBody({
  danger,
  onCancel,
  onConfirm,
  title,
}: {
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="w-[240px] p-3">
      <div className="mb-3 text-sm leading-[22px] text-[var(--antd-text)]">
        {title}
      </div>
      <div className="flex justify-end gap-2">
        {/* 与官方 antd Popconfirm 一致：取 消 / 确 定（两字自动加空格，宽度各 64） */}
        <button className={BTN_DEFAULT} type="button" onClick={onCancel}>
          {antdButtonText('取消')}
        </button>
        <button className={BTN_DANGER} type="button" onClick={onConfirm}>
          {antdButtonText('确定')}
        </button>
      </div>
    </div>
  );
}

/** 单个内联按钮 + 可选气泡确认 */
function InlineAction({ action }: { action: RowAction }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);
  const rect = useAnchorRect(open, ref.current);
  const Icon = action.icon;

  return (
    <>
      <button
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 text-sm leading-[22px] hover:opacity-80',
          action.danger ? 'text-[var(--antd-danger)]' : 'text-[var(--antd-primary)]',
        )}
        ref={ref}
        type="button"
        onClick={() => (action.popConfirm ? setOpen((v) => !v) : action.onClick?.())}
      >
        {Icon ? <Icon className="size-3.5" /> : null}
        {action.text}
      </button>
      {open && action.popConfirm && (
        <Popup
          anchor={rect}
          placement="top-end"
          triggerRef={ref}
          onClose={() => setOpen(false)}
        >
          <ConfirmBody
            danger={action.danger}
            title={action.popConfirm.title}
            onCancel={() => setOpen(false)}
            onConfirm={() => {
              setOpen(false);
              action.popConfirm?.confirm();
            }}
          />
        </Popup>
      )}
    </>
  );
}

/** 下拉菜单项（官方 DropdownMenuItem）：图标 + 文字，可挂气泡确认 */
function DropdownAction({
  action,
  onConfirmed,
}: {
  action: RowAction;
  /** 气泡确认完成后收起整个下拉（官方 action-dropdown-item emit('confirm')） */
  onConfirmed?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const rect = useAnchorRect(open, ref.current);
  const Icon = action.icon;

  return (
    <>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-[4px] px-3 py-1.5 leading-[22px] hover:bg-[rgba(255,255,255,0.06)]',
          action.danger ? 'text-[var(--antd-danger)]' : 'text-[var(--antd-text)]',
        )}
        ref={ref}
        role="menuitem"
        onClick={() => (action.popConfirm ? setOpen((v) => !v) : action.onClick?.())}
      >
        {Icon ? <Icon className="size-3.5" /> : null}
        <span className="whitespace-nowrap">{action.text}</span>
      </div>
      {open && action.popConfirm && (
        <Popup
          anchor={rect}
          placement="top-end"
          triggerRef={ref}
          onClose={() => setOpen(false)}
        >
          <ConfirmBody
            danger={action.danger}
            title={action.popConfirm.title}
            onCancel={() => setOpen(false)}
            onConfirm={() => {
              setOpen(false);
              action.popConfirm?.confirm();
              onConfirmed?.();
            }}
          />
        </Popup>
      )}
    </>
  );
}

/**
 * 行内操作区（VbenTableAction 等价物）
 * - actions 内联展示（官方默认 `gap-1`、size 与文字同高）
 * - dropdownActions 收进右侧「更多」圆形触发钮（官方 DownOutlined / MoreHorizontal 语义）
 */
export function TableAction({
  actions = [],
  dropdownActions = [],
}: {
  actions?: RowAction[];
  dropdownActions?: RowAction[];
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);
  const rect = useAnchorRect(menuOpen, ref.current);

  return (
    <div className="flex items-center justify-center gap-2">
      {actions.map((action) => (
        <InlineAction action={action} key={action.text} />
      ))}
      {dropdownActions.length > 0 && (
        <>
          <button
            aria-label="more"
            className={cn(
              'flex size-5 cursor-pointer items-center justify-center rounded-full text-[var(--antd-text)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--antd-primary)]',
              menuOpen && 'bg-[rgba(255,255,255,0.08)] text-[var(--antd-primary)]',
            )}
            ref={ref}
            title={$t('common.more')}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <Popup
              anchor={rect}
              className="min-w-[100px] py-1"
              placement="bottom-start"
              triggerRef={ref}
              onClose={() => setMenuOpen(false)}
            >
              {dropdownActions.map((action) => (
                <DropdownAction
                  action={action}
                  key={action.text}
                  onConfirmed={() => setMenuOpen(false)}
                />
              ))}
            </Popup>
          )}
        </>
      )}
    </div>
  );
}
