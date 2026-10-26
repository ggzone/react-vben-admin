/**
 * IconButton —— 与官方 @vben-core/shadcn-ui 的 VbenIconButton 1:1 对齐
 *
 * 官方实现要点（packages/@core/ui-kit/shadcn-ui/src/components/button/icon-button.vue）：
 * - 默认 variant="icon"、size="icon"
 * - 外层 cn('rounded-full', props.class) —— 圆角可通过 className 覆盖（tailwind-merge）
 * - 传了 tooltip 时用 VbenTooltip 包裹，默认 delayDuration=200、side="bottom"
 */
import * as React from 'react';

import { Button, type ButtonProps } from '#/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { cn } from '#/lib/utils';

export interface IconButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  tooltip?: string;
  /** 官方 Tooltip 默认的 side 为 bottom */
  tooltipSide?: 'bottom' | 'left' | 'right' | 'top';
  /** 官方 delayDuration 默认 200（与 Tooltip 组件的 0 默认值不同） */
  tooltipDelayDuration?: number;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      tooltip,
      tooltipSide = 'bottom',
      tooltipDelayDuration = 200,
      variant = 'icon',
      size = 'icon',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const button = (
      <Button
        className={cn('rounded-full', className)}
        disabled={disabled}
        ref={ref}
        size={size}
        variant={variant}
        {...props}
      >
        {children}
      </Button>
    );

    if (!tooltip) {
      return button;
    }

    return (
      <Tooltip delayDuration={tooltipDelayDuration}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
      </Tooltip>
    );
  },
);
IconButton.displayName = 'IconButton';

export default IconButton;
