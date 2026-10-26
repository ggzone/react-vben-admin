/**
 * 面包屑 —— 与官方 effects/layouts breadcrumb + shadcn-ui breadcrumb 1:1 对齐
 * 数据来源：AppRoute 树祖先链（对齐官方 route.matched）
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { VbenIcon } from '#/components/icon';
import { $t } from '#/locales';
import { findRouteChain } from '#/router/route-chain';
import { cn } from '#/lib/utils';

export interface IBreadcrumb {
  icon?: string;
  isHome?: boolean;
  items?: Array<{ path: string; title: string }>;
  path: string;
  title: string;
}

export interface BreadcrumbProps {
  hideWhenOnlyOne?: boolean;
  showHome?: boolean;
  showIcon?: boolean;
  type?: 'background' | 'normal';
  className?: string;
}

export function Breadcrumb({
  hideWhenOnlyOne = false,
  showHome = false,
  showIcon = true,
  type = 'normal',
  className,
}: BreadcrumbProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // 与官方一致：遍历 matched 链，跳过 hideInBreadcrumb / hideChildrenInMenu
  const breadcrumbs: IBreadcrumb[] = [];
  const chain = findRouteChain(location.pathname) ?? [];
  for (const route of chain) {
    const meta = (route.meta ?? {}) as {
      hideInBreadcrumb?: boolean;
      hideChildrenInMenu?: boolean;
      icon?: string;
      title?: string;
    };
    if (meta.hideInBreadcrumb || meta.hideChildrenInMenu || !route.path) {
      continue;
    }
    breadcrumbs.push({
      icon: meta.icon,
      path: route.path,
      title: meta.title ? $t(meta.title) : '',
    });
  }
  if (showHome) {
    breadcrumbs.unshift({
      icon: 'mdi:home-outline',
      isHome: true,
      path: '/',
      title: '',
    });
  }
  if (hideWhenOnlyOne && breadcrumbs.length === 1) {
    return null;
  }

  const handleSelect = (path?: string) => {
    if (path) navigate(path);
  };

  return (
    <nav
      aria-label="breadcrumb"
      className={cn('vben-breadcrumb ml-2', className)}
    >
      <ol className="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const hasItems = (item.items?.length ?? 0) > 0;
          return (
            <li
              key={`${item.path}-${item.title}-${index}`}
              className="inline-flex items-center gap-1.5"
            >
              {hasItems ? (
                <span className="flex items-center gap-1">
                  {showIcon && <VbenIcon icon={item.icon} className="size-4" />}
                  {item.title}
                  <ChevronDown className="size-4" />
                </span>
              ) : isLast ? (
                <span
                  className="flex items-center font-normal text-foreground"
                  aria-current="page"
                >
                  {showIcon && (
                    <VbenIcon
                      icon={item.icon}
                      className={cn('mr-1 size-4', item.isHome && 'size-5')}
                    />
                  )}
                  {item.title}
                </span>
              ) : (
                <a
                  href="javascript:void 0"
                  className="flex items-center text-primary transition-colors hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(item.path);
                  }}
                >
                  {showIcon && (
                    <VbenIcon
                      icon={item.icon}
                      className={cn('mr-1 size-4', item.isHome && 'size-5')}
                    />
                  )}
                  {item.title}
                </a>
              )}
              {/* 与官方 BreadcrumbItem 内嵌 BreadcrumbSeparator 的 DOM 保持一致（li > li）；
                  间距由外层 li 的 gap-1.5 控制，拆成兄弟节点会变成 ol 的 gap-2.5，视觉不等价。 */}
              {index < breadcrumbs.length - 1 && !item.isHome && (
                <li
                  className="[&>svg]:size-3.5"
                  aria-hidden="true"
                  role="presentation"
                >
                  <ChevronRight />
                </li>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
