/**
 * 侧边栏菜单 —— 与官方 @vben-core/menu-ui 1:1 对齐
 *
 * DOM 结构（垂直模式）：
 * ul.vben-menu.is-vertical.is-dark.is-rounded[.is-collapse]
 *   li.vben-sub-menu
 *     div.vben-sub-menu-content (icon + title + arrow)
 *     ul.vben-menu (nested, v-show opened)
 *   li > a.vben-menu-item.is-active (icon + title)
 *
 * 折叠模式（vertical + collapse）等价官方 `isMenuPopup`：
 *   li.vben-sub-menu > [HoverCard 恒 open] > div.h-full.cursor-pointer > div.vben-sub-menu-content
 *   弹层：div.vben-menu__popup-container[.is-dark][.hidden]
 *          > div.is-vertical.vben-menu__popup > ul.vben-menu.is-rounded
 *   hover 300ms 打开、移出 300ms 关闭；mouseInChild 逐级向上冒泡
 *   （对齐 sub-menu.vue 的 handleMouseenter / handleMouseleave + dispatchEvent('mouseenter') 链）。
 */
import type { MutableRefObject } from 'react';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { VbenIcon } from '#/components/icon';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '#/components/ui/hover-card';
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
            'flex-center text-primary-foreground rounded-xl px-1.5 py-0.5 text-[10px]',
          )}
        >
          {badge}
        </div>
      )}
    </span>
  );
}

interface MenuCtxValue {
  activePath: string;
  accordion: boolean;
  collapse: boolean;
  collapseShowTitle: boolean;
  mode: 'horizontal' | 'vertical';
  openedMenus: string[];
  rounded: boolean;
  theme: 'dark' | 'light';
  closeMenu: (path: string, parentPaths: string[]) => void;
  openMenu: (path: string, parentPaths: string[]) => void;
  selectMenu: (path: string) => void;
}

const MenuCtx = createContext<MenuCtxValue | null>(null);

function useMenuCtx(): MenuCtxValue {
  const ctx = useContext(MenuCtx);
  if (!ctx) throw new Error('VbenMenu context is required');
  return ctx;
}

interface SubMenuCtxValue {
  level: number;
  /** 本子菜单是否有光标停在其后代内（对齐官方 SubMenuProvider.mouseInChild） */
  mouseInChild: MutableRefObject<boolean>;
  /** 后代进入时向上冒泡，置位各级 mouseInChild（等价官方 dispatchEvent('mouseenter') 链） */
  notifyEnter: () => void;
  /** 后代离开时向上深派发（等价官方 handleMouseleave(true) 递归） */
  leaveDeep: () => void;
}

const SubMenuCtx = createContext<SubMenuCtxValue | null>(null);

/** 递归菜单项（叶子） */
function MenuItemNode({ level, menu }: { level: number; menu: MenuRecordRaw }) {
  const ctx = useMenuCtx();
  const { activePath, collapse, collapseShowTitle, mode, theme } = ctx;

  const active = menu.path === activePath;
  const menuIcon = active ? menu.activeIcon || menu.icon : menu.icon;

  // 对齐官方 menu-item.vue：`showTooltip = mode==='vertical' && isTopLevelMenuItem && collapse`
  const showTooltip = mode === 'vertical' && level === 1 && collapse;
  // 官方 collapseShowTitle 需同时满足：根级 + 折叠 + 开关开启
  const collapseShowTitleHere = collapse && level === 1 && !!collapseShowTitle;

  // 对齐官方 menu-item.vue：叶子项 `<VbenIcon :icon="menuIcon" />` **不带** fallback，
  // 无图标时不渲染（带 fallback 会画出多余的占位圆点）
  const icon = <VbenIcon icon={menuIcon} className="vben-menu__icon" />;

  const handleClick = () => {
    if (menu.path) {
      ctx.selectMenu(menu.path);
    }
  };

  // 对齐官方 menu-item.vue：折叠根级用 VbenTooltip 包住
  // `div.vben-menu-tooltip__trigger`（absolute 全尺寸居中），普通态渲染 `__content`
  if (showTooltip) {
    return (
      <Link
        className={cn(
          theme,
          'vben-menu-item',
          active && 'is-active',
          collapseShowTitleHere && 'is-collapse-show-title',
        )}
        role="menuitem"
        to={menu.path}
        onClick={handleClick}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="vben-menu-tooltip__trigger">
              {icon}
              {collapseShowTitleHere && (
                <span className="vben-menu__name">{$t(menu.name)}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className={cn(theme, 'side-content bg-accent rounded-md')}
          >
            {$t(menu.name)}
          </TooltipContent>
        </Tooltip>
      </Link>
    );
  }

  return (
    <Link
      className={cn(
        theme,
        'vben-menu-item',
        active && 'is-active',
        collapseShowTitleHere && 'is-collapse-show-title',
      )}
      role="menuitem"
      to={menu.path}
      onClick={handleClick}
    >
      <div className="vben-menu-item__content">
        <MenuBadge
          className="right-2"
          badge={menu.badge}
          badgeType={menu.badgeType}
          badgeVariants={menu.badgeVariants}
        />
        {icon}
        <span className="vben-menu__title">{$t(menu.name)}</span>
      </div>
    </Link>
  );
}

/** 递归子菜单 */
function SubMenuNode({
  level,
  menu,
  parentPaths,
}: {
  level: number;
  menu: MenuRecordRaw;
  /** 祖先路径（不含自身），对应官方 parentPaths 去掉自身后的前缀 */
  parentPaths: string[];
}) {
  const ctx = useMenuCtx();
  const parentSub = useContext(SubMenuCtx);

  const { activePath, collapse, collapseShowTitle, mode, openedMenus } = ctx;

  const opened = openedMenus.includes(menu.path);
  /** 对齐官方 `isMenuPopup`：水平模式或垂直折叠模式走弹层 */
  const isMenuPopup =
    mode === 'horizontal' || (mode === 'vertical' && collapse);

  const mouseInChild = useRef(false);
  const timer = useRef<null | number>(null);

  /** 官方 parentPaths 含自身，accordion 过滤与 closeMenu 复位都基于它 */
  const selfPaths = useMemo(
    () => [...parentPaths, menu.path],
    [parentPaths, menu.path],
  );

  const notifyEnter = useCallback(() => {
    mouseInChild.current = true;
    parentSub?.notifyEnter();
  }, [parentSub]);

  const handleMouseleave = useCallback(
    (deep = false) => {
      // 官方：非折叠的垂直模式为内联展开，不参与弹层关闭
      if (!collapse && mode === 'vertical') {
        if (parentSub) parentSub.mouseInChild.current = false;
        return;
      }

      if (timer.current !== null) window.clearTimeout(timer.current);

      if (parentSub) parentSub.mouseInChild.current = false;

      timer.current = window.setTimeout(() => {
        if (!mouseInChild.current) {
          ctx.closeMenu(menu.path, parentPaths);
        }
      }, 300);

      if (deep) parentSub?.leaveDeep();
    },
    [collapse, mode, parentSub, ctx, menu.path, parentPaths],
  );

  const handleMouseenter = useCallback(
    (showTimeout = 300) => {
      // 官方：非折叠的垂直模式只置位父级标记，不弹层
      if (!collapse && mode === 'vertical') {
        if (parentSub) parentSub.mouseInChild.current = true;
        return;
      }
      if (parentSub) parentSub.mouseInChild.current = true;

      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        ctx.openMenu(menu.path, selfPaths);
      }, showTimeout);
    },
    [collapse, mode, parentSub, ctx, menu.path, selfPaths],
  );

  const subMenuCtx = useMemo<SubMenuCtxValue>(
    () => ({
      leaveDeep: () => handleMouseleave(true),
      level: (parentSub?.level ?? 0) + 1,
      mouseInChild,
      notifyEnter,
    }),
    [handleMouseleave, notifyEnter, parentSub?.level],
  );

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
  const isFirstLevel = level === 1;

  // 对齐官方 sub-menu-content.vue 的三个计算属性
  const collapseShowTitleHere = collapse && isFirstLevel && !!collapseShowTitle;
  const hiddenTitle =
    mode === 'vertical' && isFirstLevel && collapse && !collapseShowTitleHere;
  const showArrowIcon = mode === 'horizontal' || !(isFirstLevel && collapse);
  const ArrowIcon =
    (mode === 'horizontal' && !isFirstLevel) ||
    (mode === 'vertical' && collapse)
      ? ChevronRight
      : ChevronDown;

  const handleClick = () => {
    // 官方 handleClick：折叠的垂直模式与水平模式都不展开
    if (isClickBlocked(collapse, mode)) return;
    if (opened) {
      ctx.closeMenu(menu.path, parentPaths);
    } else {
      ctx.openMenu(menu.path, selfPaths);
    }
  };

  const content = (
    <>
      <MenuBadge
        className="right-6"
        badge={menu.badge}
        badgeType={menu.badgeType}
        badgeVariants={menu.badgeVariants}
      />
      <VbenIcon icon={menuIcon} fallback className="vben-menu__icon" />
      {!hiddenTitle && (
        <div className="vben-sub-menu-content__title">
          <span className="vben-menu__title">{$t(menu.name)}</span>
        </div>
      )}
      {/* 对齐官方 sub-menu-content.vue：箭头 absolute right-10px，
          仅「非首层或非折叠」可见（showArrowIcon） */}
      {showArrowIcon && (
        <ArrowIcon
          className="vben-sub-menu-content__icon-arrow size-4"
          style={opened ? { transform: 'rotate(180deg)' } : undefined}
        />
      )}
    </>
  );

  const children = (menu.children ?? []).map((child) => (
    <MenuNode
      key={child.path}
      level={level + 1}
      menu={child}
      parentPaths={selfPaths}
    />
  ));

  return (
    <SubMenuCtx.Provider value={subMenuCtx}>
      <li
        className={cn(
          'vben-sub-menu',
          opened && 'is-opened',
          isActiveChild && 'is-active',
        )}
        onMouseEnter={() => handleMouseenter()}
        onMouseLeave={() => handleMouseleave()}
      >
        {isMenuPopup ? (
          // 对齐官方 sub-menu.vue：HoverCard 恒 open，靠 `hidden` 类控制可见性，
          // 展开与否由 openedMenus（300ms 定时）决定
          <HoverCard open openDelay={0}>
            <HoverCardTrigger asChild>
              <div className="h-full cursor-pointer">
                <div
                  className={cn(
                    'vben-sub-menu-content',
                    collapseShowTitleHere && 'is-collapse-show-title',
                    isActiveChild && 'is-active',
                  )}
                  onClick={handleClick}
                >
                  {content}
                </div>
              </div>
            </HoverCardTrigger>
            <HoverCardContent
              collisionPadding={{ top: 20 }}
              side={mode === 'horizontal' && isFirstLevel ? 'bottom' : 'right'}
              sideOffset={mode === 'horizontal' ? 5 : 10}
              className={cn(
                ctx.theme,
                'vben-menu__popup-container',
                `is-${ctx.theme}`,
                !opened && 'hidden',
                'overflow-auto',
                'max-h-[calc(var(--radix-popper-available-height)-20px)]',
                mode === 'horizontal' && 'is-horizontal',
              )}
              onMouseEnter={() => handleMouseenter(100)}
              onMouseLeave={() => handleMouseleave(true)}
            >
              <div
                className={cn(
                  mode === 'horizontal' ? 'is-horizontal' : 'is-vertical',
                  'vben-menu__popup',
                )}
              >
                <ul
                  className={cn('vben-menu', ctx.rounded && 'is-rounded')}
                  style={{ '--menu-level': level } as React.CSSProperties}
                >
                  {children}
                </ul>
              </div>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <>
            <div
              className={cn(
                'vben-sub-menu-content',
                collapseShowTitleHere && 'is-collapse-show-title',
                isActiveChild && 'is-active',
              )}
              onClick={handleClick}
            >
              {content}
            </div>
            <ul
              className={cn(
                'vben-menu',
                ctx.rounded && 'is-rounded',
                ctx.theme,
              )}
              hidden={!opened}
              style={{ '--menu-level': level } as React.CSSProperties}
            >
              {children}
            </ul>
          </>
        )}
      </li>
    </SubMenuCtx.Provider>
  );
}

/** 官方 handleClick 的守卫：折叠的垂直模式、水平模式都不展开 */
function isClickBlocked(collapse: boolean, mode: string): boolean {
  return (collapse && mode === 'vertical') || mode === 'horizontal';
}

/** 菜单节点（有子级用 SubMenu，否则 MenuItem） */
function MenuNode({
  level,
  menu,
  parentPaths,
}: {
  level: number;
  menu: MenuRecordRaw;
  parentPaths: string[];
}) {
  const hasChildren = !!menu.children && menu.children.length > 0;
  if (hasChildren) {
    return <SubMenuNode level={level} menu={menu} parentPaths={parentPaths} />;
  }
  return <MenuItemNode level={level} menu={menu} />;
}

/** 激活项所在链路（对齐官方 getActivePaths 的 walk 部分） */
function getActivePaths(menus: MenuRecordRaw[], activePath: string): string[] {
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

  const activeParentPaths = useMemo(
    () => getActivePaths(menus, activePath),
    [menus, activePath],
  );

  // 对齐官方 watch(() => props.collapse)：折叠时清空已展开项
  useEffect(() => {
    if (collapse) setOpenedMenus([]);
  }, [collapse]);

  // 对齐官方 getActivePaths：折叠 / 水平模式下不预展开激活链路
  useEffect(() => {
    if (collapse || mode === 'horizontal') return;
    if (activeParentPaths.length === 0) return;
    setOpenedMenus((prev) =>
      Array.from(new Set([...prev, ...activeParentPaths])),
    );
  }, [activeParentPaths, collapse, mode]);

  /** 对齐官方 openMenu（含 accordion 过滤） */
  const openMenu = useCallback(
    (path: string, parentPaths: string[]) => {
      setOpenedMenus((prev) => {
        if (prev.includes(path)) return prev;
        let paths = parentPaths;
        if (accordion) {
          // 官方 getActivePaths()：折叠 / 水平模式返回空数组
          const actives =
            collapse || mode === 'horizontal'
              ? []
              : getActivePaths(menus, activePath);
          if (actives.includes(path)) {
            paths = actives;
          }
          return [...prev.filter((p) => paths.includes(p)), path];
        }
        return [...prev, path];
      });
    },
    [accordion, activePath, collapse, menus, mode],
  );

  /** 对齐官方 closeMenu（accordion 下复位为父级链路） */
  const closeMenu = useCallback(
    (path: string, parentPaths: string[]) => {
      setOpenedMenus((prev) => {
        const next = accordion ? [...parentPaths] : prev;
        return next.filter((p) => p !== path);
      });
    },
    [accordion],
  );

  /** 对齐官方 handleMenuItemClick：折叠/水平模式下点击叶子项清空展开 */
  const selectMenu = useCallback(
    (path: string) => {
      if (collapse || mode === 'horizontal') setOpenedMenus([]);
      onSelect?.(path);
    },
    [collapse, mode, onSelect],
  );

  const ctxValue = useMemo<MenuCtxValue>(
    () => ({
      activePath,
      accordion,
      closeMenu,
      collapse,
      collapseShowTitle,
      mode,
      openMenu,
      openedMenus,
      rounded,
      selectMenu,
      theme,
    }),
    [
      activePath,
      accordion,
      closeMenu,
      collapse,
      collapseShowTitle,
      mode,
      openMenu,
      openedMenus,
      rounded,
      selectMenu,
      theme,
    ],
  );

  return (
    <MenuCtx.Provider value={ctxValue}>
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
          <MenuNode key={menu.path} level={1} menu={menu} parentPaths={[]} />
        ))}
      </ul>
    </MenuCtx.Provider>
  );
}

export default VbenMenu;
