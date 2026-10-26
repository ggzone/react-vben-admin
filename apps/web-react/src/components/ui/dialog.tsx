/**
 * Dialog 组件（含 Drawer 变体）—— 基于 @radix-ui/react-dialog，样式与官方对齐
 */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '#/lib/utils';

/**
 * Dialog 根组件
 *
 * Radix 的 Esc 关闭依赖 @radix-ui/react-dismissable-layer 的 document 监听，
 * 在本项目「React 19 + 抽屉式 Content」组合下不触发（已实测：偏好抽屉按 Esc 不关、
 * 点遮罩才关），而官方 useVbenDrawer 支持 Esc 关闭。这里补一层兜底，
 * 用栈保证只关闭最上层（对齐 Radix 分层语义）。
 */
const openDialogStack: symbol[] = [];

function Dialog({ open, onOpenChange, ...props }: DialogPrimitive.DialogProps) {
  React.useEffect(() => {
    if (!open || !onOpenChange) {
      return;
    }
    const id = Symbol('dialog');
    openDialogStack.push(id);
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      // 仅最上层响应，避免嵌套弹窗被一起关掉
      if (openDialogStack.at(-1) !== id) {
        return;
      }
      event.preventDefault();
      onOpenChange(false);
    };
    // 捕获阶段监听：Radix 的 dismissable-layer 会在冒泡前消费掉 Escape，
    // 冒泡阶段监听收不到（实测 defaultPrevented 已为 true）
    document.addEventListener('keydown', handler, true);
    return () => {
      document.removeEventListener('keydown', handler, true);
      const index = openDialogStack.indexOf(id);
      if (index !== -1) {
        openDialogStack.splice(index, 1);
      }
    };
  }, [open, onOpenChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props} />
  );
}

const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  // 滚动条补偿由 assets/index.css 的 `html body[data-scroll-locked]` 统一处理，
  // 这里不再做 JS 补偿（否则与 CSS 叠加会二次收窄，关窗时反而抖）
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-popup bg-overlay',
        className,
      )}
      {...props}
    />
  );
});
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showClose?: boolean;
  }
>(({ className, children, showClose = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-popup grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border p-6 shadow-lg sm:rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      {showClose && (
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  // 对齐官方 SheetHeader：`flex flex-col text-center sm:text-left`（无 space-y-1.5，
  // shadcn 默认的 space-y 会在 row 布局下给子元素加 margin-top，把标题整体顶高 3px）
  <div
    className={cn('flex flex-col text-center sm:text-left', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
