/**
 * 侧边栏菜单 —— 与官方 @vben-core/menu-ui 1:1 对齐
 *
 * DOM 结构（垂直模式）：
 * ul.vben-menu.is-vertical.is-dark.is-rounded[.is-collapse]
 *   li.vben-sub-menu
 *     div.vben-sub-menu-content (icon + title + arrow)
 *     ul.vben-menu (nested, v-show opened)
 *   li > a.vben-menu-item.is-active (icon + title)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { VbenIcon } from '#/components/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { cn } from '#/lib/utils';
import type { MenuRecordRaw } from '#/types/menu';
import { $t } from '#/locales';

export interface MenuProps {
  /** 菜单数据 */
  menus: MenuRecordRaw[];
  /** 是否折叠 */
  collapse?: boolean;
  /** 折叠时是否显示菜单名（对齐官方 collapseShowTitle） */
  collapseShowTitle?: boolean;
  /** 圆角样式 */
  rounded?: boolean;
  /** 主题 dark/light */
  theme?: 'dark' | 'light';
  /** 模式 vertical/horizontal */
  mode?: 'horizontal' | 'vertical';
  /** 手风琴模式 */
  accordion?: boolean;
  /** 默认激活路径 */
  defaultActive?: string;
  /** 选中回调 */
  onSelect?: (path: string) => void;
  className?: string;
}

/** 徽标颜色映射（对齐官方 menu-badge.vue variantsMap） */
const BADGE_VARIANTS: Record<string, string> = {
  default: 'bg-green-500',
  destructive: 'bg-destructive',
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
};

/** 菜单徽标（对齐官方 menu-badge.vue + menu-badge-dot.vue） */
function MenuBadge({
  badge,
  badgeType,
  badgeVariants,
  className,
}: {
  badge?: string;
  badgeType?: string;
  badgeVariants?: string;
  className?: string;
}) {
  const isDot = badgeType === 'dot';
  // 官方 `v-if="isDot || badge"`：badgeType 为 dot 时即使没有文字也要渲染圆点
  if (!isDot && !badge) return null;
  const badgeClass = !badgeVariants
    ? BADGE_VARIANTS.default
    : (BADGE_VARIANTS[badgeVariants] ?? badgeVariants);

  return (
    <span className={cn('absolute', className)}>
      {isDot ? (
        <span className="relative mr-1 flex size-1.5">
          <span
            className={cn(
              badgeClass,
              'absolute inline-flex size-full animate-ping rounded-full opacity-75',
            )}
          />
          <span
            className={cn(
              badgeClass,
              'relative inline-flex size-1.5 rounded-full',
            )}
          />
        </span>
      ) : (
        <div
          className={cn(
            badgeClass,
            'flex-center rounded-xl px-1.5 py-0.5 text-[10px] text-primary-foreground',
          )}
        >
          {badge}
        </div>
      )}
    </span>
  );
}

/** 递归菜单项 */
function MenuItemNode({
  menu,
  activePath,
  collapse,
  collapseShowTitle,
  theme,
  level,
  onSelect,
}: {
  menu: MenuRecordRaw;
  activePath: string;
  collapse: boolean;
  collapseShowTitle?: boolean;
  theme: string;
  level: number;
  onSelect: (path: string) => void;
}) {
  const active = menu.path === activePath;
  const menuIcon = active ? menu.activeIcon || menu.icon : menu.icon;

  // 官方 menu-item.vue 用 <router-link>，真实渲染 <a href>；
  // 用 React Router 的 <Link> 保持一致（支持中键新标签页、状态栏显示地址）
  const handleClick = () => {
    if (menu.path) {
      onSelect(menu.path);
    }
  };
  const badge = (
    <MenuBadge
      className="right-2"
      badge={menu.badge}
      badgeType={menu.badgeType}
      badgeVariants={menu.badgeVariants}
    />
  );
  const icon = (
    <VbenIcon icon={menuIcon} fallback className="vben-menu__icon" />
  );
  // 对齐官方：折叠且非首层时仅显示图标（tooltip 提示）；collapseShowTitle 时显示标题
  const showTitle = !collapse || !!collapseShowTitle;
  const showTooltip = collapse && level === 1;

  const content = (
    <>
      {badge}
      {icon}
      {showTitle && <span className="vben-menu__title">{$t(menu.name)}</span>}
    </>
  );

  // 对齐官方 menu-item.vue：根元素就是 <a class="vben-menu-item">，没有外层 li
  // （多了 li 会让根级缩进规则 `& > .vben-menu-item { padding-left: calc(indent - 8px) }` 不命中）
  return (
    <Link
      className={cn(
        theme,
        'vben-menu-item',
        active && 'is-active',
        collapseShowTitle && 'is-collapse-show-title',
      )}
      role="menuitem"
      to={menu.path}
      onClick={handleClick}
    >
      {showTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* 对齐官方 menu-item.vue：折叠首层用 tooltip trigger（absolute 全尺寸居中） */}
            <div className="vben-menu-tooltip__trigger">{content}</div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="side-content bg-accent text-popover-foreground rounded-md"
          >
            {$t(menu.name)}
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="vben-menu-item__content">{content}</div>
      )}
    </Link>
  );
}

/** 递归子菜单 */
function SubMenuNode({
  menu,
  activePath,
  collapse,
  collapseShowTitle,
  theme,
  rounded,
  accordion,
  level,
  openedMenus,
  setOpenedMenus,
  onSelect,
}: {
  menu: MenuRecordRaw;
  activePath: string;
  collapse: boolean;
  collapseShowTitle?: boolean;
  theme: string;
  rounded: boolean;
  accordion: boolean;
  level: number;
  openedMenus: string[];
  setOpenedMenus: (menus: string[]) => void;
  onSelect: (path: string) => void;
}) {
  const opened = openedMenus.includes(menu.path);
  // 对齐官方 menu.vue：折叠模式下内联子菜单一律收起（子项经 popup 呈现，不内联展开）
  const expanded = opened && !collapse;
  // 子菜单激活态：任一子项激活
  const isActiveChild = useMemo(() => {
    const check = (items: MenuRecordRaw[]): boolean =>
      items.some(
        (item) =>
          item.path === activePath || (item.children && check(item.children)),
      );
    return menu.children ? check(menu.children) : false;
  }, [menu, activePath]);

  const menuIcon = isActiveChild ? menu.activeIcon || menu.icon : menu.icon;

  const handleClick = () => {
    if (collapse) return; // 折叠模式下点击不展开（popup 模式）
    if (opened) {
      setOpenedMenus(openedMenus.filter((p) => p !== menu.path));
    } else {
      // 手风琴模式：只保留同级
      if (accordion) {
        const siblings = openedMenus.filter(
          (p) => !menu.path.startsWith(p) || p === menu.path,
        );
        setOpenedMenus([...siblings.filter((p) => p !== menu.path), menu.path]);
      } else {
        setOpenedMenus([...openedMenus, menu.path]);
      }
    }
  };

  const ArrowIcon = level === 1 && collapse ? ChevronRight : ChevronDown;
  // 对齐官方：折叠时仅首层且开启 collapseShowTitle 才显示标题
  const showTitle = !collapse || (!!collapseShowTitle && level === 1);

  return (
    <li
      className={cn(
        'vben-sub-menu',
        opened && 'is-opened',
        isActiveChild && 'is-active',
      )}
    >
      <div
        className={cn('vben-sub-menu-content', isActiveChild && 'is-active')}
        onClick={handleClick}
      >
        <MenuBadge
          className="right-6"
          badge={menu.badge}
          badgeType={menu.badgeType}
          badgeVariants={menu.badgeVariants}
        />
        <VbenIcon icon={menuIcon} fallback className="vben-menu__icon" />
        {showTitle && (
          <div className="vben-sub-menu-content__title">
            <span className="vben-menu__title">{$t(menu.name)}</span>
          </div>
        )}
        {/* 对齐官方 sub-menu-content.vue：箭头用 `sub-menu-content__icon-arrow`（absolute right-10px），
            并且仅在「非首层或非折叠」时显示（官方 showArrowIcon 计算属性） */}
        {(level !== 1 || !collapse) && (
          <ArrowIcon
            className="vben-sub-menu-content__icon-arrow size-4"
            style={opened ? { transform: 'rotate(180deg)' } : undefined}
          />
        )}
      </div>
      <ul
        className={cn('vben-menu', rounded && 'is-rounded', theme)}
        style={{ '--menu-level': level } as React.CSSProperties}
        hidden={!expanded}
      >
        {(menu.children ?? []).map((child) => (
          <MenuNode
            key={child.path}
            menu={child}
            activePath={activePath}
            collapse={collapse}
            collapseShowTitle={collapseShowTitle}
            theme={theme}
            rounded={rounded}
            accordion={accordion}
            level={level + 1}
            openedMenus={openedMenus}
            setOpenedMenus={setOpenedMenus}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </li>
  );
}

/** 菜单节点（有子级用 SubMenu，否则 MenuItem） */
function MenuNode(props: {
  menu: MenuRecordRaw;
  activePath: string;
  collapse: boolean;
  collapseShowTitle?: boolean;
  theme: string;
  rounded: boolean;
  accordion: boolean;
  level: number;
  openedMenus: string[];
  setOpenedMenus: (menus: string[]) => void;
  onSelect: (path: string) => void;
}) {
  const { menu } = props;
  const hasChildren = !!menu.children && menu.children.length > 0;
  if (hasChildren) {
    return <SubMenuNode {...props} />;
  }
  return <MenuItemNode {...props} />;
}

/** 菜单组件 */
export function VbenMenu({
  menus,
  collapse = false,
  collapseShowTitle = false,
  rounded = true,
  theme = 'dark',
  mode = 'vertical',
  accordion = true,
  defaultActive = '',
  onSelect,
  className,
}: MenuProps) {
  const location = useLocation();
  const activePath = location.pathname || defaultActive;
  const [openedMenus, setOpenedMenus] = useState<string[]>([]);

  /** 当前激活项的所有父级菜单路径（对齐官方 initOpenedMenus：默认展开激活项所在链路） */
  const activeParentPaths = useMemo(() => {
    const trail: string[] = [];
    const walk = (items: MenuRecordRaw[], parents: string[]): boolean => {
      for (const item of items) {
        if (item.path === activePath) {
          trail.push(...parents);
          return true;
        }
        if (
          item.children?.length &&
          walk(item.children, [...parents, item.path])
        ) {
          return true;
        }
      }
      return false;
    };
    walk(menus, []);
    return trail;
  }, [menus, activePath]);

  // 菜单为异步生成（守卫内 setAccessMenus），需在拿到数据后补齐展开项
  useEffect(() => {
    if (activeParentPaths.length === 0) return;
    setOpenedMenus((prev) =>
      Array.from(new Set([...prev, ...activeParentPaths])),
    );
  }, [activeParentPaths]);

  const handleSelect = useCallback(
    (path: string) => {
      onSelect?.(path);
    },
    [onSelect],
  );

  return (
    <ul
      className={cn(
        theme,
        'vben-menu',
        `is-${mode}`,
        `is-${theme}`,
        rounded && 'is-rounded',
        collapse && 'is-collapse',
        className,
      )}
      role="menu"
      style={{ '--menu-level': 0 } as React.CSSProperties}
    >
      {menus.map((menu) => (
        <MenuNode
          key={menu.path}
          menu={menu}
          activePath={activePath}
          collapse={collapse}
          collapseShowTitle={collapseShowTitle}
          theme={theme}
          rounded={rounded}
          accordion={accordion}
          level={1}
          openedMenus={openedMenus}
          setOpenedMenus={setOpenedMenus}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  );
}

export default VbenMenu;
