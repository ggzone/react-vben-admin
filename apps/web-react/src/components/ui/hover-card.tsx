/**
 * HoverCard 组件 —— 与官方 @vben-core/shadcn-ui VbenHoverCard + ui/hover-card 1:1 对齐
 *
 * 官方 HoverCardContent.vue 的 cn() 基类原样照搬（含 side-content / z-popup 两个设计类），
 * 外层 VbenHoverCard 额外叠加 `side-content z-popup`。
 */
import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';

import { cn } from '#/lib/utils';

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ align = 'center', className, sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-popup border-border bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-64 rounded-md border p-4 shadow-md outline-hidden',
        'side-content z-popup',
        className,
      )}
      {...props}
    />
  </HoverCardPrimitive.Portal>
));
HoverCardContent.displayName = 'HoverCardContent';

export { HoverCard, HoverCardContent, HoverCardTrigger };
