/**
 * VbenAvatar —— 与官方 @vben-core/shadcn-ui 的 avatar.vue 1:1 对齐
 *
 * 官方结构：
 * <div class="relative flex shrink-0 items-center {class}">
 *   <Avatar class="size-full"><AvatarImage/><AvatarFallback/></Avatar>
 *   <span v-if="dot" class="border-background absolute right-0 bottom-0 size-3 rounded-full border-2 {dotClass}" />
 * </div>
 */
import * as React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { cn } from '#/lib/utils';

export interface VbenAvatarProps {
  alt?: string;
  className?: string;
  dot?: boolean;
  dotClass?: string;
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  size?: number;
  src?: string;
}

export function VbenAvatar({
  alt = 'avatar',
  className,
  dot = false,
  dotClass = 'bg-green-500',
  fit = 'cover',
  size,
  src,
}: VbenAvatarProps) {
  // 官方 text = alt.slice(-2).toUpperCase()
  const text = (alt ?? '').slice(-2).toUpperCase();
  const rootStyle =
    size && size > 0 ? { height: size, width: size } : undefined;

  return (
    <div
      className={cn('relative flex shrink-0 items-center', className)}
      style={rootStyle}
    >
      <Avatar className={cn('size-full', className)}>
        <AvatarImage alt={alt} src={src} style={{ objectFit: fit }} />
        <AvatarFallback>{text}</AvatarFallback>
      </Avatar>
      {dot && (
        <span
          className={cn(
            'border-background absolute right-0 bottom-0 size-3 rounded-full border-2',
            dotClass,
          )}
        />
      )}
    </div>
  );
}

export default VbenAvatar;
