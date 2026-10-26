/**
 * Page 组件 —— 与官方 @vben/common-ui Page（page.vue）1:1 对齐
 * 支持 title/description/extra 头部插槽、autoContentHeight 自适应、footer 插槽
 */
import * as React from 'react';

import { cn } from '#/lib/utils';

export interface PageProps {
  title?: string;
  description?: string;
  contentClass?: string;
  /** 根据 content 可见高度自适应 */
  autoContentHeight?: boolean;
  headerClass?: string;
  footerClass?: string;
  /** autoContentHeight 时的高度偏移（px） */
  heightOffset?: number;
  /** footer 是否固定（固定则不参与内容高度计算） */
  footerFixed?: boolean;
  children?: React.ReactNode;
  titleSlot?: React.ReactNode;
  descriptionSlot?: React.ReactNode;
  extra?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Page({
  title,
  description,
  contentClass,
  autoContentHeight = false,
  headerClass,
  footerClass,
  heightOffset = 0,
  footerFixed = false,
  children,
  titleSlot,
  descriptionSlot,
  extra,
  footer,
}: PageProps) {
  const headerRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = React.useState(0);
  const [footerHeight, setFooterHeight] = React.useState(0);
  const [shouldAutoHeight, setShouldAutoHeight] = React.useState(false);

  const hasHeader = !!(
    description ||
    descriptionSlot ||
    title ||
    titleSlot ||
    extra
  );

  React.useEffect(() => {
    if (!autoContentHeight) return;
    setShouldAutoHeight(false);
    const calc = () => {
      setHeaderHeight(headerRef.current?.offsetHeight || 0);
      setFooterHeight(footerFixed ? 0 : footerRef.current?.offsetHeight || 0);
      // 对齐官方 setTimeout(30) 后开启 overflow
      const timer = setTimeout(() => setShouldAutoHeight(true), 30);
      return () => clearTimeout(timer);
    };
    const cleanup = calc();
    return cleanup;
  }, [autoContentHeight, footerFixed, title, description]);

  const contentStyle: React.CSSProperties = autoContentHeight
    ? {
        height: `calc(var(--vben-content-height, 100vh) - ${headerHeight}px - ${footerHeight}px - ${typeof heightOffset === 'number' ? `${heightOffset}px` : heightOffset})`,
        overflowY: shouldAutoHeight ? 'auto' : 'unset',
      }
    : {};

  return (
    <div className="relative flex min-h-full flex-col">
      {hasHeader && (
        <div
          ref={headerRef}
          className={cn(
            'relative flex items-end border-b border-border bg-card px-6 py-4',
            headerClass,
          )}
        >
          <div className="flex-auto">
            {titleSlot ??
              (title ? (
                <div className="mb-2 flex text-lg font-semibold">{title}</div>
              ) : null)}
            {descriptionSlot ??
              (description ? (
                <p className="text-muted-foreground">{description}</p>
              ) : null)}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}

      <div className={cn('h-full p-4', contentClass)} style={contentStyle}>
        {children}
      </div>

      {footer && (
        <div
          ref={footerRef}
          className={cn('align-center flex bg-card px-6 py-4', footerClass)}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
