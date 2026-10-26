/**
 * VbenCheckbox —— 与官方 @vben-core/shadcn-ui 的 checkbox.vue 1:1 对齐
 *
 * 官方结构：
 * <div class="flex items-center">
 *   <Checkbox :id />
 *   <label :for="id" class="ml-2 cursor-pointer text-sm"><slot /></label>
 * </div>
 */
import * as React from 'react';

import { Checkbox } from '#/components/ui/checkbox';
import { cn } from '#/lib/utils';

export interface VbenCheckboxProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Checkbox>,
  'children'
> {
  children?: React.ReactNode;
  labelClassName?: string;
}

export const VbenCheckbox = React.forwardRef<
  React.ElementRef<typeof Checkbox>,
  VbenCheckboxProps
>(({ className, children, id, labelClassName, ...props }, ref) => {
  const autoId = React.useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn('flex items-center', className)}>
      <Checkbox id={inputId} ref={ref} {...props} />
      {children !== undefined && children !== null && children !== '' && (
        <label
          className={cn('ml-2 cursor-pointer text-sm', labelClassName)}
          htmlFor={inputId}
        >
          {children}
        </label>
      )}
    </div>
  );
});
VbenCheckbox.displayName = 'VbenCheckbox';

export default VbenCheckbox;
