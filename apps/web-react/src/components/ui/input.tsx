/**
 * Input 组件 —— 与官方 @vben-core/shadcn-ui input 1:1 对齐
 */
import * as React from 'react';

import { cn } from '#/lib/utils';

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none vben-input flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
