/**
 * Avatar 组件 —— 基于 @radix-ui/react-avatar，样式与官方对齐
 */
import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '#/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    alt?: string;
    src?: string;
  }
>(({ className, alt = '', src, children, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      // 对齐官方 avatar.ts 的 avatarVariant（shape=circle / size=sm 默认值）
      'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-normal text-foreground select-none',
      className,
    )}
    {...props}
  >
    {src && (
      <AvatarPrimitive.Image
        alt={alt}
        className="aspect-square size-full"
        src={src}
      />
    )}
    {children}
  </AvatarPrimitive.Root>
));
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square size-full', className)}
    {...props}
  />
));
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex size-full items-center justify-center', className)}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarFallback, AvatarImage };
