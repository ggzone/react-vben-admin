/**
 * Tooltip 组件 —— 基于 @radix-ui/react-tooltip，样式与官方对齐
 */
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '#/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

/**
 * 触发器：模态层打开期间屏蔽「聚焦即弹气泡」。
 * Radix 的 TooltipTrigger 在 focus 时会自动展开（用于键盘可达性），但弹窗（Dialog/Drawer）
 * 打开时会把焦点交给内部首个可聚焦元素（如偏好抽屉头部的「吸顶」按钮），
 * 于是气泡会莫名其妙地盖在弹窗内容上——这不是用户意图。
 * 这里在模态锁生效（body[data-scroll-locked]）时 preventDefault 掉，
 * 让 Radix 内部 compose 的 onFocus 不再执行；正常鼠标/键盘聚焦不受影响。
 */
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ onFocus, ...props }, ref) => (
  <TooltipPrimitive.Trigger
    ref={ref}
    onFocus={(event) => {
      if (document.body.hasAttribute('data-scroll-locked')) {
        event.preventDefault();
      }
      onFocus?.(event);
    }}
    {...props}
  />
));
TooltipTrigger.displayName = 'TooltipTrigger';

/**
 * 对齐官方 ShadcnTooltip（packages/@core/ui-kit/shadcn-ui/src/components/tooltip/tooltip.vue）：
 * 官方每个 tooltip 都自带 TooltipProvider（默认 delayDuration=0），因此这里内建 Provider，
 * 调用方无需自行包裹，避免 "Tooltip must be used within TooltipProvider" 报错。
 */
function Tooltip({
  delayDuration = 0,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> & {
  delayDuration?: number;
}) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipPrimitive.Root {...props} />
    </TooltipProvider>
  );
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 5, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // 与官方两层合并后的最终样式一致：
        // 基础 TooltipContent（ui/tooltip/TooltipContent.vue）
        //   z-popup border border-border bg-accent text-accent-foreground shadow-float rounded-sm px-4 py-2 text-xs
        // 组件层 Tooltip（components/tooltip/tooltip.vue）再追加
        //   side-content bg-accent text-popover-foreground rounded-md
        // 故最终为：accent 底 + popover 前景色 + 1px 边框 + 6px 圆角 + p-4/2。
        // （此前误用 bg-primary/text-primary-foreground，暗色下呈品牌蓝，官方为中性灰）
        'side-content z-popup rounded-md border border-border bg-accent px-4 py-2 text-xs text-popover-foreground shadow-float',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
      // tooltip 只做提示，绝不能吃掉指针事件：弹窗打开时首个可聚焦元素会被自动 focus，
      // Radix 据此把气泡弹出来（如抽屉头部的吸顶按钮），类名会被 Radix 的内联
      // pointer-events:auto 覆盖，所以这里用内联样式的同等优先级兜住（放在末尾覆盖 props.style）。
      style={{ pointerEvents: 'none', ...props.style }}
    >
      {children}
      {/* 官方 TooltipContent.vue：<TooltipArrow class="fill-accent stroke-border" />
          —— 文字框朝向触发器一侧的小尖角，填充同底色、描边同边框色，10×5（Radix 默认尺寸）。
          注：箭头必须画在内容框外沿，父级不能 overflow-hidden，故上面用 rounded-md 而非 overflow-hidden。 */}
      <TooltipPrimitive.Arrow className="fill-accent stroke-border" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
