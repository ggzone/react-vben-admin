/**
 * ToggleGroup —— 与官方 @vben-core/shadcn-ui 1:1 对齐
 * 基类来源：ui/toggle/toggle.ts 的 `toggleVariants`（cva）与
 * ui/toggle-group/ToggleGroup.vue 的根类 `flex items-center justify-center gap-1`。
 * 注意：官方 cva 的 data-[state=on] 默认是 bg-accent，业务侧（radius.vue /
 * toggle-item.vue）再显式覆盖为 bg-primary，这里保持一致。
 */
import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';

import { cn } from '#/lib/utils';

const sizeClasses: Record<string, string> = {
  default: 'h-9 px-3',
  lg: 'h-10 px-3',
  sm: 'h-8 px-2',
};

const variantClasses: Record<string, string> = {
  default: 'bg-transparent',
  outline:
    'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
};

type GroupVariants = {
  size?: 'default' | 'lg' | 'sm';
  variant?: 'default' | 'outline';
};

/**
 * 对齐官方 ToggleGroup.vue 的 `provide('toggleGroup', { size, variant })`：
 * 根上的 size/variant 要能被子项继承（且优先级高于子项自身传值）。
 */
const ToggleGroupCtx = React.createContext<GroupVariants>({});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    GroupVariants
>(({ className, size, variant, ...props }, ref) => {
  const ctx = React.useMemo<GroupVariants>(
    () => ({ size, variant }),
    [size, variant],
  );
  return (
    <ToggleGroupCtx.Provider value={ctx}>
      <ToggleGroupPrimitive.Root
        ref={ref}
        className={cn('flex items-center justify-center gap-1', className)}
        {...props}
      />
    </ToggleGroupCtx.Provider>
  );
});
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    GroupVariants
>(({ className, size, variant, ...props }, ref) => {
  const ctx = React.useContext(ToggleGroupCtx);
  // 官方：context?.size || size（根节点优先），再由 cva 的 defaultVariants 兜底
  const resolvedSize = ctx.size || size || 'default';
  const resolvedVariant = ctx.variant || variant || 'default';

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
        sizeClasses[resolvedSize],
        variantClasses[resolvedVariant],
        className,
      )}
      {...props}
    />
  );
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
