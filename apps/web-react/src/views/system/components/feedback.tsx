/**
 * 系统管理的轻量反馈组件 —— 对齐 playground 所用的 antd `message` / `Modal.confirm`
 *
 * 官方页面里的写法是命令式的：
 *   const hide = message.loading({ content, duration: 0, key })
 *   message.success({ content, key })
 *   await new Promise((resolve, reject) => Modal.confirm({ title, content, onOk, onCancel }))
 *
 * React 端此前没有对应能力，这里用「命令式 API + createRoot 渲染」复刻，
 * 保持与官方完全一致的调用手感，同时让视觉贴合暗色主题。
 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  AlertCircle,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  XCircle,
} from 'lucide-react';

import { Dialog, DialogContent } from '#/components/ui/dialog';
import { BTN_DEFAULT, BTN_PRIMARY, antdButtonText } from '#/views/system/components/form';

type MessageType = 'error' | 'info' | 'loading' | 'success' | 'warning';

interface MessageOptions {
  content: React.ReactNode;
  /** 毫秒，0 表示不自动关闭 */
  duration?: number;
  /** 同一 key 的消息复用同一节点（官方用于 loading → success 的原地替换） */
  key?: string;
}

interface MessageItem {
  content: React.ReactNode;
  el: HTMLDivElement;
  root: Root;
  timer?: number;
  type: MessageType;
}

const ICON_MAP: Record<MessageType, React.ReactNode> = {
  error: <XCircle className="size-3.5 shrink-0 text-[#e84749]" />,
  info: <Info className="size-3.5 shrink-0 text-[#1668dc]" />,
  loading: (
    <Loader2 className="size-3.5 shrink-0 animate-spin text-[#1668dc]" />
  ),
  success: <CheckCircle2 className="size-3.5 shrink-0 text-[#49aa19]" />,
  warning: <AlertCircle className="size-3.5 shrink-0 text-[#d89614]" />,
};

/** 对齐 antd v5 message（dark）：padding 9px 12px、radius 8、底色 #1f1f1f、无边框 */
const ITEM_STYLE = [
  'display:inline-flex',
  'align-items:center',
  'gap:8px',
  'min-height:38px',
  'padding:9px 12px',
  'border-radius:8px',
  'background:#1f1f1f',
  'box-shadow:0 6px 16px 0 rgba(0,0,0,0.08),0 3px 6px -4px rgba(0,0,0,0.12),0 9px 28px 8px rgba(0,0,0,0.05)',
  'color:rgba(255,255,255,0.88)',
  'font-size:14px',
  'line-height:22px',
  'pointer-events:auto',
  'max-width:520px',
  'word-break:break-word',
].join(';');

/** key → 节点，用于 loading 被 success/error 原地替换 */
const keyedItems = new Map<string, MessageItem>();
let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
  if (container?.isConnected) {
    return container;
  }
  const div = document.createElement('div');
  div.id = 'system-message-root';
  div.style.cssText = [
    'position:fixed',
    'top:16px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:1200',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:8px',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(div);
  container = div;
  return div;
}

function paint(item: MessageItem) {
  item.el.style.cssText = ITEM_STYLE;
  item.root.render(
    <span className="inline-flex items-center gap-2">
      {ICON_MAP[item.type]}
      <span>{item.content}</span>
    </span>,
  );
}

function dispose(item: MessageItem) {
  if (item.timer) {
    window.clearTimeout(item.timer);
  }
  // 先卸载 React 树再摘节点，避免 React 对已脱离文档的容器报警
  item.root.unmount();
  item.el.remove();
  for (const [k, v] of keyedItems) {
    if (v === item) {
      keyedItems.delete(k);
    }
  }
}

function scheduleClose(item: MessageItem, duration?: number) {
  if (duration === 0) {
    return;
  }
  item.timer = window.setTimeout(() => dispose(item), duration ?? 3000);
}

function open(type: MessageType, options: MessageOptions): () => void {
  const host = ensureContainer();
  const existed = options.key ? keyedItems.get(options.key) : undefined;

  if (existed) {
    // 同 key 已存在 → 原地替换（官方 loading → success 的语义）
    existed.type = type;
    existed.content = options.content;
    if (existed.timer) {
      window.clearTimeout(existed.timer);
      existed.timer = undefined;
    }
    paint(existed);
    scheduleClose(existed, options.duration);
    return () => dispose(existed);
  }

  const el = document.createElement('div');
  host.appendChild(el);
  const item: MessageItem = {
    content: options.content,
    el,
    root: createRoot(el),
    type,
  };
  if (options.key) {
    keyedItems.set(options.key, item);
  }
  paint(item);
  scheduleClose(item, options.duration);
  return () => dispose(item);
}

function normalize(options: MessageOptions | string): MessageOptions {
  return typeof options === 'string' ? { content: options } : options;
}

export const message = {
  error: (opt: MessageOptions | string) => open('error', normalize(opt)),
  info: (opt: MessageOptions | string) => open('info', normalize(opt)),
  /** 官方用法：const hide = message.loading({ content, duration: 0, key }) */
  loading: (opt: MessageOptions | string) => open('loading', normalize(opt)),
  success: (opt: MessageOptions | string) => open('success', normalize(opt)),
  warning: (opt: MessageOptions | string) => open('warning', normalize(opt)),
};

/* ---------------- Modal.confirm ---------------- */

interface ConfirmOptions {
  cancelText?: string;
  content?: React.ReactNode;
  okText?: string;
  onCancel?: () => void;
  onOk?: () => void;
  title?: React.ReactNode;
}

/**
 * 对齐 antd `Modal.confirm`：给 Promise，确认 resolve(true)、取消 resolve(false)。
 * 官方页面把它包成 `confirm(content, title)` 后在异步流程里 await。
 *
 * 视觉取自 playground 实测：宽 416、顶部 100px 居中、radius 10、底色 #242424、
 * 内距 20px 24px；左侧 22px 警告图标 + 右侧「标题 16/600 + 内容 14/22」；
 * 按钮行右对齐，按钮为 antd 默认/主色 32 高、radius 8，文案沿用 antd 内置的 Cancel / OK。
 */
export function confirmModal(options: ConfirmOptions): Promise<boolean> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const close = (result: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      root.unmount();
      host.remove();
      if (result) {
        options.onOk?.();
      } else {
        options.onCancel?.();
      }
      resolve(result);
    };

    function ConfirmDialog() {
      return (
        <Dialog onOpenChange={(v) => !v && close(false)} open>
          <DialogContent
            className="antd-ui top-[100px] left-1/2 bottom-auto w-[416px] max-w-none translate-x-[-50%] translate-y-0 gap-0 rounded-[10px] border-0 bg-[#242424] p-0 shadow-lg sm:rounded-[10px]"
            onPointerDownOutside={() => close(false)}
            showClose={false}
          >
            <div className="px-6 py-5">
              <div className="flex items-start gap-3">
                <CircleAlert className="size-[22px] shrink-0 text-[#cea440]" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="text-base leading-6 font-semibold text-[rgba(242,242,242,0.85)]">
                    {options.title ?? '确认'}
                  </div>
                  {options.content && (
                    <div className="text-sm leading-[22px] text-[rgba(242,242,242,0.85)]">
                      {options.content}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className={BTN_DEFAULT}
                  type="button"
                  onClick={() => close(false)}
                >
                  {/* 对齐 antd Modal.confirm 的中文默认按钮文案（FormDrawer footer 同理） */}
                  {options.cancelText ?? antdButtonText('取消')}
                </button>
                <button
                  className={BTN_PRIMARY}
                  type="button"
                  onClick={() => close(true)}
                >
                  {options.okText ?? antdButtonText('确定')}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    root.render(<ConfirmDialog />);
  });
}

/** 官方 user 页里的 confirm 封装：确认返回 true，取消抛错（便于 try/catch 中止流程） */
export async function confirmOrThrow(
  content: string,
  title: string,
): Promise<true> {
  const ok = await confirmModal({ content, title });
  if (!ok) {
    throw new Error('已取消');
  }
  return true;
}
