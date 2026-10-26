/**
 * 图标组件 —— 与官方 @vben-core/shadcn-ui VbenIcon（icon.vue）行为对齐
 * 支持 iconify 图标名（如 lucide:layout-dashboard）、远程图片地址与直接传入的 React 节点
 * 额外属性（color/alt 等）与官方 v-bind="$attrs" 透传语义一致
 */
import { Icon as IconifyIcon } from '@iconify/react';
import type { ReactNode } from 'react';

import { cn, isHttpUrl } from '#/lib/utils';

export interface IconProps {
  /** 图标名（iconify）或 React 节点 */
  icon?: ReactNode | string;
  className?: string;
  /** 图标颜色（透传给 iconify Icon，对齐官方 $attrs 语义） */
  color?: string;
  /** 图片替代文本 */
  alt?: string;
  /** 图标大小 */
  size?: number | string;
  fallback?: boolean;
  style?: React.CSSProperties;
}

/** 判断是否为 iconify 图标名（包含命名空间前缀） */
function isIconifyName(icon: unknown): icon is string {
  return typeof icon === 'string' && /^[a-z0-9-]+:[a-z0-9-]+/i.test(icon);
}

export function VbenIcon({
  icon,
  className,
  color,
  alt,
  size,
  style,
  fallback = true,
}: IconProps) {
  if (!icon) {
    return fallback ? (
      <IconifyIcon
        icon="lucide:circle"
        className={className}
        color={color}
        style={style}
      />
    ) : null;
  }

  if (isIconifyName(icon)) {
    return (
      <IconifyIcon
        icon={icon}
        className={className}
        color={color}
        style={style}
        {...(size ? { width: size, height: size } : {})}
      />
    );
  }

  if (isHttpUrl(icon as string)) {
    return (
      <img
        src={icon as string}
        className={cn('size-4', className)}
        style={style}
        alt={alt ?? ''}
      />
    );
  }

  // 直接渲染传入的节点
  return <>{icon}</>;
}

export { IconifyIcon };
