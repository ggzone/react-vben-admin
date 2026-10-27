/**
 * 系统管理的表单基础件 —— 1:1 复刻官方 ant-design-vue 表单 + VbenDrawer / VbenModal 的视觉
 *
 * 规格来源（playground 实测计算样式，1600×950）：
 * - Drawer：宽 520（menu 页 800），右侧贴边、无圆角、border-l 1px #36363a、
 *   header `px-4 py-3`（12/16，border-b）、标题 16px/500、关闭钮 32×32 圆形；
 *   内容区 `p-3`（12）；footer `p-2 px-3`（8/12，border-t）。
 * - Modal（dept 页）：宽 520、`top-[10vh]` 居中、radius 8、border 1px；
 *   header `px-5 py-4`（16/20）、标题 18px/600 `leading-none`；内容 `p-3`；
 *   footer `p-2`，左侧可挂 prepend-footer（「重置」）。
 * - 表单行（horizontal）：`flex flex-row items-center pb-4`，label 固定 100px、
 *   右对齐、14px/500、行高 24、后接冒号（menu 页 colon）；控件列 `flex-auto p-px`。
 * - 表单行（vertical，dept）：`flex flex-col pb-4`，label 整行、控件在下方。
 * - 控件：高 32、radius 8、`padding 4px 11px`、底色 #1c1e23、边框 #36363a、
 *   正文 rgba(242,242,242,.85)、占位 rgba(242,242,242,.25)。
 */
import * as React from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  X,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog';
import { cn } from '#/lib/utils';

/* ---------------- 布局上下文 ---------------- */

interface FormLayoutValue {
  colon: boolean;
  layout: 'horizontal' | 'vertical';
}

const FormLayoutContext = React.createContext<FormLayoutValue>({
  colon: false,
  layout: 'horizontal',
});

/* ---------------- 控件基础样式 ---------------- */

/** 单行输入（对齐 antd Input：h32 / radius 8 / padding 4px 11px / 暗色底 #1c1e23） */
export const FIELD_CLASS =
  'h-8 w-full rounded-lg border border-[var(--antd-border)] bg-[var(--antd-input-bg)] px-[11px] py-1 text-sm leading-[22px] text-[var(--antd-text)] outline-none transition-colors placeholder:text-[var(--antd-placeholder)] focus:border-[var(--antd-primary)] disabled:cursor-not-allowed disabled:bg-[rgba(255,255,255,0.04)] disabled:text-[rgba(242,242,242,0.25)] disabled:placeholder:text-[rgba(242,242,242,0.25)]';

/** 多行文本（行高 22，antd Textarea 同款 4px 11px 内距；block 避免行内基线留白） */
export const TEXTAREA_CLASS =
  'block w-full rounded-lg border border-[var(--antd-border)] bg-[var(--antd-input-bg)] px-[11px] py-1 text-sm leading-[22px] text-[var(--antd-text)] outline-none transition-colors placeholder:text-[var(--antd-placeholder)] focus:border-[var(--antd-primary)]';

/** antd Button 基类：h32 / radius 8 / padding 0 15px / 投影 0 2px 0 0 token */
export const BTN_BASE =
  'inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border px-[15px] text-sm leading-[16.1px] transition-colors disabled:cursor-not-allowed';

export const BTN_DEFAULT = `${BTN_BASE} antd-btn border-[var(--antd-border)] bg-[var(--antd-input-bg)] text-[var(--antd-text)] hover:border-[var(--antd-primary)] hover:text-[var(--antd-primary)] disabled:opacity-60`;

export const BTN_PRIMARY = `${BTN_BASE} antd-btn-primary border-transparent bg-[var(--antd-primary)] text-white hover:opacity-90 disabled:opacity-60`;

export const BTN_DANGER = `${BTN_BASE} antd-btn-primary border-transparent bg-[var(--antd-danger)] text-white hover:opacity-90 disabled:opacity-60`;

/** antd 两字按钮会在两字之间插一个空格（`取 消`），宽度 64 即由此而来 */
export function antdButtonText(text: string) {
  return text.length === 2 ? `${text[0]} ${text[1]}` : text;
}

/* ---------------- FormItem ---------------- */

export function FormItem({
  children,
  className,
  colon,
  error,
  help,
  label,
  labelWidth = 100,
  required,
  vertical,
}: {
  children: React.ReactNode;
  className?: string;
  /** 是否在 label 末尾追加冒号（官方 form 的 colon 配置，menu 页开启） */
  colon?: boolean;
  error?: string;
  /** 官方 schema 的 `help`：label 右侧的 ? 图标（`size-3.5 ml-1`，内容走 tooltip） */
  help?: string;
  label: string;
  /** horizontal 布局下的 label 宽度（官方 100px） */
  labelWidth?: number;
  required?: boolean;
  vertical?: boolean;
}) {
  const ctx = React.useContext(FormLayoutContext);
  const isVertical = vertical ?? ctx.layout === 'vertical';
  const showColon = colon ?? ctx.colon;

  return (
    <div
      className={cn(
        'relative flex shrink-0 pb-4',
        isVertical ? 'flex-col' : 'flex-row items-center',
        className,
      )}
    >
      <label
        className={cn(
          'flex items-center text-sm leading-6 font-medium text-foreground',
          isVertical ? 'mb-1 w-full' : 'mr-2 shrink-0 justify-end',
        )}
        style={isVertical ? undefined : { width: `${labelWidth}px` }}
      >
        {required && <span className="mr-0.5 text-destructive">*</span>}
        <span className="truncate">{label}</span>
        {help && (
          <span
            className="ml-1 inline-flex shrink-0 text-[rgba(242,242,242,0.8)] hover:text-[var(--antd-text)]"
            title={help}
          >
            <CircleHelp className="size-3.5 cursor-pointer" />
          </span>
        )}
        {showColon && <span className="ml-0.5">:</span>}
      </label>
      <div
        className={cn('flex-auto overflow-hidden p-px', isVertical && 'w-full')}
      >
        <div className="flex flex-col">
          {children}
          {error && (
            <div className="pt-1 text-xs leading-5 text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 两列表单网格（官方 wrapperClass: `grid-cols-2 gap-x-4`，行距由每项 pb-4 提供） */
export function FormGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-x-4 md:grid-cols-2', className)}>
      {children}
    </div>
  );
}

/* ---------------- 单选按钮组（antd RadioGroup optionType=button buttonStyle=solid） ---------------- */

export function RadioButtons<T extends number | string>({
  onChange,
  options,
  value,
}: {
  onChange: (v: T) => void;
  options: { label: React.ReactNode; value: T }[];
  value: T;
}) {
  return (
    <div className="flex items-center">
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            className={cn(
              'inline-flex h-8 cursor-pointer items-center justify-center border px-[15px] text-sm leading-[22px] transition-colors',
              i === 0 ? 'rounded-l-lg' : '',
              i === options.length - 1 ? 'rounded-r-lg' : '',
              i > 0 ? '-ml-px' : '',
              active
                ? 'z-10 border-[var(--antd-primary)] bg-[var(--antd-primary)] text-white'
                : 'border-[var(--antd-border)] bg-[var(--antd-input-bg)] text-[var(--antd-text)]',
            )}
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- 复选框（antd Checkbox） ---------------- */

/**
 * 复选框方框 —— 逐项照搬官方 `shadcn-ui/src/ui/checkbox/Checkbox.vue`：
 * `h-4 w-4 shrink-0 rounded-sm border border-border hover:border-primary`，
 * 选中 `bg-primary text-primary-foreground`，指示图标 `h-4 w-4`（lucide Check / Minus）。
 */
function Box({
  checked,
  indeterminate,
  onClick,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const on = checked || indeterminate;
  return (
    <span
      aria-checked={on}
      className={cn(
        'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-colors',
        on
          ? 'border-[var(--antd-primary)] bg-[var(--antd-primary)] text-white'
          : 'border-[var(--antd-border)] bg-transparent hover:border-[var(--antd-primary)]',
      )}
      role="checkbox"
      onClick={onClick}
    >
      {indeterminate && !checked ? (
        <Minus className="size-4" />
      ) : checked ? (
        <Check className="size-4" />
      ) : null}
    </span>
  );
}

export function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: React.ReactNode;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm leading-[22px] text-[var(--antd-text)]">
      <Box checked={checked} />
      {label}
      <input
        checked={checked}
        className="sr-only"
        type="checkbox"
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

/**
 * 表单里的复选框行 —— 对齐官方 `component: 'Checkbox'` 的 form-item 形态。
 * 官方 Playground 该字段来自 ant-design-vue（`ant-checkbox-wrapper` / `ant-checkbox-label`），
 * 但**没有传 label**，所以左侧仍保留 100px 的空 label 列（控件列 x 才会与官方一致），
 * 文字由 Checkbox 自身渲染在方框右侧（间距 8px、14px/22px）。
 */
export function CheckboxItem({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="relative flex shrink-0 flex-row items-center">
      <span className="mr-2 w-[100px] shrink-0" />
      <div className="flex-auto overflow-hidden p-px">
        <label className="flex cursor-pointer items-center gap-2 text-sm leading-[22px] text-[var(--antd-text)]">
          <Box checked={checked} />
          <span>{label}</span>
          <input
            checked={checked}
            className="sr-only"
            type="checkbox"
            onChange={(e) => onChange(e.target.checked)}
          />
        </label>
      </div>
    </div>
  );
}

/* ---------------- 下拉（复刻 antd Select 触发器） ---------------- */

export interface SelectOption {
  disabled?: boolean;
  label: string;
  value: string;
}

/** antd Select 触发器：32 高、radius 8、右侧 12px 箭头、内右距 26 */
export function SelectField({
  disabled,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="relative">
      <select
        className={cn(
          FIELD_CLASS,
          'cursor-pointer appearance-none pr-[26px]',
          !value && 'text-[var(--antd-placeholder)]',
        )}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option disabled={opt.disabled} key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-[11px] size-3 -translate-y-1/2 text-[rgba(242,242,242,0.45)]" />
    </div>
  );
}

/* ---------------- 树形下拉（缩进 select，视觉同 antd TreeSelect 触发器） ---------------- */

export interface TreeOption {
  children?: TreeOption[];
  label: string;
  value: string;
}

export function flattenTree(
  nodes: TreeOption[],
  depth = 0,
): { depth: number; label: string; value: string }[] {
  const out: { depth: number; label: string; value: string }[] = [];
  for (const node of nodes) {
    out.push({ depth, label: node.label, value: node.value });
    if (node.children?.length) {
      out.push(...flattenTree(node.children, depth + 1));
    }
  }
  return out;
}

export function TreeSelect({
  disabled,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onChange: (v: string) => void;
  options: TreeOption[];
  placeholder?: string;
  value: string;
}) {
  const flat = flattenTree(options);
  return (
    <div className="relative">
      <select
        className={cn(
          FIELD_CLASS,
          'cursor-pointer appearance-none pr-[26px]',
          !value && 'text-[var(--antd-placeholder)]',
        )}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? '请选择'}</option>
        {flat.map((node) => (
          <option key={node.value} value={node.value}>
            {`${'\u00A0\u00A0'.repeat(node.depth)}${node.depth > 0 ? '└ ' : ''}${node.label}`}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-[11px] size-3 -translate-y-1/2 text-[rgba(242,242,242,0.45)]" />
    </div>
  );
}

/* ---------------- 多行文本（antd Textarea showCount） ---------------- */

export function TextArea({
  maxLength,
  onChange,
  placeholder,
  rows = 3,
  showCount,
  value,
}: {
  maxLength?: number;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  showCount?: boolean;
  value: string;
}) {
  return (
    <div className="relative">
      <textarea
        className={cn(TEXTAREA_CLASS, showCount && 'pb-[22px]')}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={rows}
        style={{ resize: 'none' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {showCount && (
        <span className="pointer-events-none absolute right-[9px] bottom-[5px] text-xs leading-[20px] text-[rgba(242,242,242,0.45)]">
          {value.length}
          {maxLength ? ` / ${maxLength}` : ''}
        </span>
      )}
    </div>
  );
}

/* ---------------- 多选树（官方角色表单的「菜单权限」Tree） ---------------- */

export interface CheckTreeNode {
  children?: CheckTreeNode[];
  label: string;
  value: string;
}

function collectSubtree(node: CheckTreeNode, out: string[]) {
  out.push(node.value);
  node.children?.forEach((child) => collectSubtree(child, out));
}

function collectAncestors(
  nodes: CheckTreeNode[],
  target: string,
  trail: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.value === target) {
      return trail;
    }
    if (node.children?.length) {
      const hit = collectAncestors(node.children, target, [
        ...trail,
        node.value,
      ]);
      if (hit) {
        return hit;
      }
    }
  }
  return null;
}

function collectAll(nodes: CheckTreeNode[], out: string[] = []) {
  for (const node of nodes) {
    out.push(node.value);
    if (node.children?.length) {
      collectAll(node.children, out);
    }
  }
  return out;
}

interface FlatTreeNode {
  hasChildren: boolean;
  level: number;
  node: CheckTreeNode;
}

/**
 * 官方 `tree.vue` 用 reka-ui 的 `flattenItems`：**只有展开的节点**会进入渲染列表，
 * 缩进靠 `margin-left: ${level - 1}rem`（reka 的 level 从 1 起），所以这里 level 从 0 起。
 */
function flattenVisible(
  nodes: CheckTreeNode[],
  expanded: Set<string>,
  level = 0,
  out: FlatTreeNode[] = [],
) {
  for (const node of nodes) {
    const hasChildren = !!node.children?.length;
    out.push({ hasChildren, level, node });
    if (hasChildren && expanded.has(node.value)) {
      flattenVisible(node.children ?? [], expanded, level + 1, out);
    }
  }
  return out;
}

function parentIds(nodes: CheckTreeNode[], out: string[] = []) {
  for (const node of nodes) {
    if (node.children?.length) {
      out.push(node.value);
      parentIds(node.children, out);
    }
  }
  return out;
}

/**
 * 勾选语义对齐官方 Tree（非 checkStrictly）：
 * - 勾选节点 = 勾选其整个子树，并自动补齐所有祖先（保证后端 nav 树完整）；
 * - 取消勾选 = 取消该节点及其整个子树，祖先保持不变。
 *
 * 视觉逐条照搬官方 `packages/@core/ui-kit/shadcn-ui/src/ui/tree/tree.vue`：
 * 外框 `rounded-lg border`（bordered）、首行「全选」区 `my-0.5 p-1 border-b`、
 * 节点行 `my-0.5 flex items-center rounded p-1`（行距 30px）、
 * 箭头 `size-4`（展开 `rotate-90`）、无子节点用 `h-4 w-4` 占位、
 * 文本 `text-sm font-medium`。
 */
export function CheckboxTree({
  nodes,
  onChange,
  value,
}: {
  nodes: CheckTreeNode[];
  onChange: (v: string[]) => void;
  value: string[];
}) {
  const onToggle = (target: string) => {
    const node = (() => {
      const find = (list: CheckTreeNode[]): CheckTreeNode | null => {
        for (const item of list) {
          if (item.value === target) {
            return item;
          }
          if (item.children?.length) {
            const hit = find(item.children);
            if (hit) {
              return hit;
            }
          }
        }
        return null;
      };
      return find(nodes);
    })();
    if (!node) {
      return;
    }
    const set = new Set(value);
    const subtree: string[] = [];
    collectSubtree(node, subtree);
    if (set.has(target)) {
      for (const id of subtree) {
        set.delete(id);
      }
    } else {
      for (const id of subtree) {
        set.add(id);
      }
      for (const id of collectAncestors(nodes, target) ?? []) {
        set.add(id);
      }
    }
    onChange([...set]);
  };

  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    // 对齐官方 `:default-expanded-level="2"`：初始展开前两层
    const ids: string[] = [];
    const walk = (list: CheckTreeNode[], level: number) => {
      if (level >= 2) {
        return;
      }
      for (const item of list) {
        if (item.children?.length) {
          ids.push(item.value);
          walk(item.children, level + 1);
        }
      }
    };
    walk(nodes, 0);
    return new Set(ids);
  });

  const onToggleExpand = (target: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(target)) {
        next.delete(target);
      } else {
        next.add(target);
      }
      return next;
    });
  };

  if (!nodes.length) {
    return (
      <div className="rounded-lg border border-[var(--antd-border)] bg-[var(--antd-input-bg)] px-3 py-2 text-sm text-[var(--antd-placeholder)]">
        暂无可分配菜单
      </div>
    );
  }

  const allIds = collectAll(nodes);
  const checkedCount = allIds.filter((id) => value.includes(id)).length;
  const allChecked = checkedCount === allIds.length;
  const anyExpanded = expanded.size > 0;

  return (
    <div className="list-none rounded-lg border border-[var(--antd-border)] bg-[var(--antd-input-bg)] text-sm font-medium select-none">
      {/* 全选行（官方 bordered 形态的 header 区：chevron 切展开、checkbox 全选/清空） */}
      <div className="my-0.5 flex w-full items-center border-b border-[var(--antd-border)] p-1">
        <div className="flex size-5 flex-1 cursor-pointer items-center">
          <ChevronRight
            className={cn(
              'size-4 shrink-0 cursor-pointer text-[rgba(242,242,242,0.8)] transition-transform',
              anyExpanded ? 'rotate-90' : '',
            )}
            onClick={() =>
              setExpanded(anyExpanded ? new Set() : new Set(parentIds(nodes)))
            }
          />
          <div className="flex w-full items-center gap-1 overflow-hidden">
            <Box
              checked={allChecked}
              indeterminate={checkedCount > 0 && !allChecked}
              onClick={() => onChange(allChecked ? [] : allIds)}
            />
          </div>
        </div>
      </div>

      {flattenVisible(nodes, expanded).map(({ hasChildren, level, node }) => {
        const checked = value.includes(node.value);
        const childIds = node.children ? collectAll(node.children) : [];
        const partial = !checked && childIds.some((id) => value.includes(id));
        const open = expanded.has(node.value);
        return (
          <div
            className="my-0.5 flex cursor-pointer items-center rounded p-1"
            key={node.value}
            style={{ marginLeft: `${level}rem` }}
          >
            {hasChildren ? (
              <ChevronRight
                className={cn(
                  'size-4 shrink-0 cursor-pointer text-[rgba(242,242,242,0.8)] transition-transform',
                  open ? 'rotate-90' : '',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(node.value);
                }}
              />
            ) : (
              <div className="h-4 w-4" />
            )}
            <div
              className="flex w-full items-center gap-1 overflow-hidden"
              onClick={() => onToggle(node.value)}
            >
              <Box checked={checked} indeterminate={partial} />
              <div
                className="flex w-full items-center gap-1 overflow-hidden"
                title={node.label}
              >
                {node.label}
              </div>
            </div>
            <div className="h-4 w-4" />
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 分隔线（antd Divider with text） ---------------- */

/**
 * 分隔线（antd Divider 带文字）—— 官方实测：行高 25、上下 margin 16（合计 57），
 * 文字 16px/25px、颜色 rgba(242,242,242,.85)、左右内距 16，
 * 分割线用 colorSplit（暗色 rgba(253,253,253,.12)）。
 */
export function FormDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center py-4 text-base leading-[25px] text-[var(--antd-text)]">
      <span className="h-px flex-auto bg-[rgba(253,253,253,0.12)]" />
      <span className="shrink-0 px-4 whitespace-nowrap">{children}</span>
      <span className="h-px flex-auto bg-[rgba(253,253,253,0.12)]" />
    </div>
  );
}

/* ---------------- 抽屉 / 弹窗容器 ---------------- */

export function FormDrawer({
  children,
  className,
  colon = false,
  confirmLoading,
  layout = 'horizontal',
  onClose,
  onConfirm,
  open,
  prependFooter,
  title,
  variant = 'drawer',
  width,
}: {
  children: React.ReactNode;
  className?: string;
  /** label 末尾冒号（官方 menu 页 form 配置 colon: true） */
  colon?: boolean;
  confirmLoading?: boolean;
  /** horizontal：label 左置 100px（user/role/menu）；vertical：label 上置（dept） */
  layout?: 'horizontal' | 'vertical';
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  /** 底部左侧附加内容（对齐官方 antd Modal 的 #prepend-footer，dept 页用来放「重置」） */
  prependFooter?: React.ReactNode;
  title: React.ReactNode;
  /** drawer：右侧抽屉（官方 user/role/menu 用法）；modal：居中弹窗（官方 dept 用法） */
  variant?: 'drawer' | 'modal';
  width?: number;
}) {
  const isDrawer = variant === 'drawer';
  const panelWidth = width ?? 520;
  const [fullscreen, setFullscreen] = React.useState(false);

  const footer = (
    <div
      className={cn(
        'flex flex-row items-center border-t border-[var(--antd-border)]',
        isDrawer
          ? 'w-full justify-end gap-x-2 p-2 px-3'
          : 'justify-end gap-x-2 p-2',
      )}
    >
      {prependFooter && <div className="flex-auto">{prependFooter}</div>}
      <button className={BTN_DEFAULT} type="button" onClick={onClose}>
        {antdButtonText('取消')}
      </button>
      <button
        className={BTN_PRIMARY}
        disabled={confirmLoading}
        type="button"
        onClick={onConfirm}
      >
        {confirmLoading && <Loader2 className="mr-1 size-3.5 animate-spin" />}
        {antdButtonText('确定')}
      </button>
    </div>
  );

  return (
    <Dialog onOpenChange={(v) => !v && onClose()} open={open}>
      <DialogContent
        className={cn(
          'antd-ui bg-[var(--antd-card-bg)]',
          isDrawer
            ? 'inset-y-0 right-0 left-auto flex h-full max-h-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 border-l border-[var(--antd-border)] p-0 shadow-lg sm:rounded-none data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100'
            : 'inset-x-0 top-[10vh] mx-auto flex max-h-[80%] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-lg border border-[var(--antd-border)] p-0 shadow-lg sm:rounded-lg',
          // 全屏（官方 VbenModal 的 fullscreenButton）
          !isDrawer &&
            fullscreen &&
            'top-0 left-0 size-full max-h-full translate-x-0 translate-y-0 rounded-none sm:rounded-none',
          className,
        )}
        showClose={false}
        style={{
          width: !isDrawer && fullscreen ? '100%' : `${panelWidth}px`,
        }}
      >
        {/* 头部：drawer 12/16 + 16px 标题；modal 16/20 + 18px 标题 */}
        {isDrawer ? (
          <div className="flex flex-row items-center justify-between border-b border-[var(--antd-border)] px-4 py-3">
            <div className="flex items-center">
              <DialogTitle className="text-left text-base leading-[18.4px] font-medium text-foreground">
                {title}
              </DialogTitle>
            </div>
            <div className="flex items-center">
              <button
                aria-label="close"
                className="ml-0.5 flex size-8 cursor-pointer items-center justify-center rounded-full px-1 text-foreground/80 opacity-80 transition-opacity hover:bg-accent hover:opacity-100"
                type="button"
                onClick={onClose}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-y-1.5 border-b border-[var(--antd-border)] px-5 py-4">
            <DialogTitle className="text-left text-lg leading-none font-semibold tracking-tight text-foreground">
              {title}
            </DialogTitle>
          </div>
        )}

        {/* 内容 */}
        <div
          className={cn(
            'relative flex-1 overflow-y-auto p-3',
            !isDrawer && 'min-h-40',
          )}
        >
          <FormLayoutContext.Provider value={{ colon, layout }}>
            {children}
          </FormLayoutContext.Provider>
        </div>

        {footer}

        {!isDrawer && (
          <>
            <button
              aria-label="fullscreen"
              className="absolute top-3 right-10 hidden size-6 cursor-pointer items-center justify-center rounded-full px-1 text-lg text-foreground/80 opacity-70 transition-opacity hover:bg-accent hover:text-accent-foreground hover:opacity-100 sm:flex"
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
              aria-label="close"
              className="absolute top-3 right-3 flex size-6 cursor-pointer items-center justify-center rounded-full px-1 text-lg text-foreground/80 opacity-70 transition-opacity hover:bg-accent hover:text-accent-foreground hover:opacity-100"
              type="button"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
