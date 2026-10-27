/**
 * 系统管理的表单基础件 —— 对齐官方 useVbenDrawer / useVbenForm 的交互与视觉
 *
 * - `FormDrawer`：右侧抽屉（宽 600，底部 取消/确定，提交中禁用），对应官方 Drawer 形态；
 *   dept 页官方用的是居中 Modal，这里通过 `variant="modal"` 支持。
 * - `FormItem`：label（右对齐、可必填星号）+ 控件 + 错误文案，对应 antd Form.Item。
 * - 控件统一 8px 圆角、32px 高、暗色描边，与页面其余输入框一致。
 *
 * TreeSelect：官方用的是 antd ApiTreeSelect。React 端没有对应组件，
 * 这里用「缩进展示的原生 select」实现同等选择能力（value/label 与官方一致）。
 */
import * as React from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';

/* ---------------- 控件基础样式 ---------------- */

export const FIELD_CLASS =
  'h-8 w-full rounded-lg border border-[var(--antd-border)] bg-transparent px-[11px] text-sm leading-[22px] text-[var(--antd-text)] outline-none transition-colors focus:border-[var(--antd-primary)] placeholder:text-[rgba(242,242,242,0.3)] disabled:cursor-not-allowed disabled:opacity-60';

export const TEXTAREA_CLASS =
  'w-full rounded-lg border border-[var(--antd-border)] bg-transparent px-[11px] py-[5px] text-sm leading-[22px] text-[var(--antd-text)] outline-none transition-colors focus:border-[var(--antd-primary)] placeholder:text-[rgba(242,242,242,0.3)]';

/* ---------------- FormItem ---------------- */

export function FormItem({
  children,
  error,
  label,
  required,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm leading-[22px] text-[var(--antd-text)]">
        {required && <span className="mr-1 text-[var(--antd-danger)]">*</span>}
        {label}
      </label>
      {children}
      {error && (
        <div className="text-xs leading-[20px] text-[var(--antd-danger)]">
          {error}
        </div>
      )}
    </div>
  );
}

/* ---------------- 单选按钮组（antd RadioGroup optionType=button） ---------------- */

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
            className={`inline-flex h-8 cursor-pointer items-center justify-center border px-[15px] text-sm leading-[22px] transition-colors ${
              i === 0 ? 'rounded-l-lg' : ''
            } ${i === options.length - 1 ? 'rounded-r-lg' : ''} ${
              i > 0 ? '-ml-px' : ''
            } ${
              active
                ? 'z-10 border-[var(--antd-primary)] bg-[var(--antd-primary)] text-white'
                : 'border-[var(--antd-border)] bg-transparent text-[var(--antd-text)] hover:border-[var(--antd-primary)] hover:text-[var(--antd-primary)]'
            }`}
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

/* ---------------- 复选框 ---------------- */

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
      <input
        checked={checked}
        className="size-4 cursor-pointer accent-[var(--antd-primary)]"
        type="checkbox"
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/* ---------------- 树形下拉（缩进 select） ---------------- */

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
    <select
      className={`${FIELD_CLASS} cursor-pointer`}
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
        className={`${TEXTAREA_CLASS} ${showCount ? 'pb-[22px]' : ''}`}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={rows}
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

function RenderNodes({
  depth,
  nodes,
  value,
  onToggle,
}: {
  depth: number;
  nodes: CheckTreeNode[];
  onToggle: (v: string) => void;
  value: string[];
}) {
  return (
    <>
      {nodes.map((node) => {
        const checked = value.includes(node.value);
        return (
          <div key={node.value}>
            <label
              className="flex cursor-pointer items-center gap-2 rounded-md py-[5px] pr-2 text-sm leading-[22px] text-[var(--antd-text)] hover:bg-[rgba(255,255,255,0.04)]"
              style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
              <input
                checked={checked}
                className="size-4 cursor-pointer accent-[var(--antd-primary)]"
                type="checkbox"
                onChange={() => onToggle(node.value)}
              />
              {node.label}
            </label>
            {node.children?.length ? (
              <RenderNodes
                depth={depth + 1}
                nodes={node.children}
                onToggle={onToggle}
                value={value}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/**
 * 勾选语义对齐 antd Tree（非 checkStrictly）：
 * - 勾选节点 = 勾选其整个子树，并自动补齐所有祖先（保证后端 nav 树完整）；
 * - 取消勾选 = 取消该节点及其整个子树，祖先保持不变。
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

  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--antd-border)] py-1">
      {nodes.length ? (
        <RenderNodes
          depth={0}
          nodes={nodes}
          onToggle={onToggle}
          value={value}
        />
      ) : (
        <div className="px-3 py-2 text-sm text-[rgba(242,242,242,0.45)]">
          暂无可分配菜单
        </div>
      )}
    </div>
  );
}

/* ---------------- 提示块 ---------------- */

/** 表单底部的说明文案（对齐 antd Form.Item extra 的弱化样式） */
export function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs leading-[20px] text-[rgba(242,242,242,0.45)]">
      {children}
    </div>
  );
}

/* ---------------- 抽屉 / 弹窗容器 ---------------- */

export const BTN_BASE =
  'inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border px-[15px] text-sm leading-[22px] transition-colors';

export function FormDrawer({
  children,
  confirmLoading,
  onClose,
  onConfirm,
  open,
  prependFooter,
  title,
  variant = 'drawer',
  width = 600,
}: {
  children: React.ReactNode;
  confirmLoading?: boolean;
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
  return (
    <Dialog onOpenChange={(v) => !v && onClose()} open={open}>
      <DialogContent
        className={
          isDrawer
            ? 'top-0 right-0 left-auto h-full max-h-full w-full translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-r-0 p-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100'
            : 'max-w-[640px] gap-0 p-0'
        }
        showClose={false}
        style={
          isDrawer
            ? { maxWidth: `${width}px`, width: `${width}px` }
            : { width: '640px' }
        }
      >
        {/* 头部 */}
        <DialogHeader className="flex-row items-center justify-between border-b border-[var(--antd-border)] px-6 py-4">
          <DialogTitle className="text-base leading-[24px] font-semibold text-[var(--antd-text)]">
            {title}
          </DialogTitle>
          <button
            aria-label="close"
            className="cursor-pointer text-[rgba(242,242,242,0.45)] transition-colors hover:text-[var(--antd-text)]"
            type="button"
            onClick={onClose}
          >
            <svg
              fill="none"
              height="16"
              stroke="currentColor"
              strokeWidth="1.6"
              viewBox="0 0 16 16"
              width="16"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </DialogHeader>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* 底部 */}
        <DialogFooter className="flex-row items-center justify-end gap-2 border-t border-[var(--antd-border)] px-6 py-3">
          {prependFooter && <div className="flex-auto">{prependFooter}</div>}
          <button
            className={`${BTN_BASE} border-[var(--antd-border)] bg-transparent text-[var(--antd-text)] hover:border-[var(--antd-primary)] hover:text-[var(--antd-primary)]`}
            type="button"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className={`${BTN_BASE} border-transparent bg-[var(--antd-primary)] text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={confirmLoading}
            type="button"
            onClick={onConfirm}
          >
            {confirmLoading && (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            )}
            确定
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
