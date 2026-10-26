/**
 * 标签栏 —— 与官方 tabbar.vue + tabs-ui(TabsView/TabsChrome/ToolMore/Refresh/Screen) 1:1 对齐
 * chrome 风格标签页：SVG 圆角背景 + 分隔线 + 固定/关闭按钮 + 右键菜单 + 右侧工具（更多/刷新/最大化）
 */
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronsLeft,
  ChevronsRight,
  Fullscreen,
  LayoutGrid,
  Minimize2,
  Pin,
  RotateCw,
  X,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { VbenIcon } from '#/components/icon';
import { cn } from '#/lib/utils';
import { $t } from '#/locales';
import { usePreferencesStore } from '#/preferences/store';
import { useTabbarStore } from '#/stores/tabbar';
import {
  useTabbar,
  type ContextMenuItem,
} from '#/components/layout/use-tabbar';

/** chrome 标签页单页 */
function ChromeTab({
  active,
  affixTab,
  closable,
  icon,
  index,
  showIcon,
  tabCount,
  title,
  onClick,
  onClose,
  onMiddleClick,
  onUnpin,
}: {
  active: boolean;
  affixTab: boolean;
  closable: boolean;
  icon?: string;
  index: number;
  showIcon: boolean;
  tabCount: number;
  title: string;
  onClick: () => void;
  onClose: () => void;
  onMiddleClick: (e: React.MouseEvent) => void;
  onUnpin: () => void;
}) {
  const showClose = !affixTab && tabCount > 1 && closable;
  const showPin = affixTab && tabCount > 1 && closable;

  return (
    <div
      className={cn(
        'draggable group tabs-chrome__item translate-all relative -mr-3 flex h-full items-center select-none',
        active && 'is-active',
        affixTab && 'affix-tab',
      )}
      data-active-tab={active}
      data-index={index}
      data-tab-item="true"
      onClick={onClick}
      onMouseDown={onMiddleClick}
    >
      <div className="relative size-full px-1">
        {/* divider */}
        {index !== 0 && !active && (
          <div className="tabs-chrome__divider absolute top-1/2 left-(--gap) z-0 h-4 w-px translate-y-[-50%] bg-border transition-all" />
        )}
        {/* background */}
        <div className="tabs-chrome__background absolute z-[-1] size-full px-[calc(var(--gap)-1px)] py-0 transition-opacity duration-150">
          <div className="tabs-chrome__background-content h-full rounded-tl-(--gap) rounded-tr-(--gap) duration-150 group-[.is-active]:bg-primary/15 group-[.is-active]:dark:bg-accent" />
          <svg
            className="tabs-chrome__background-before absolute bottom-0 -left-px fill-transparent transition-all duration-150 group-[.is-active]:fill-primary/15 group-[.is-active]:dark:fill-accent"
            height="7"
            width="7"
          >
            <path d="M 0 7 A 7 7 0 0 0 7 0 L 7 7 Z" />
          </svg>
          <svg
            className="tabs-chrome__background-after absolute -right-px bottom-0 fill-transparent transition-all duration-150 group-[.is-active]:fill-primary/15 group-[.is-active]:dark:fill-accent"
            height="7"
            width="7"
          >
            <path d="M 0 0 A 7 7 0 0 0 7 7 L 0 7 Z" />
          </svg>
        </div>
        {/* extra：固定 / 关闭按钮 */}
        <div className="tabs-chrome__extra absolute top-1/2 right-(--gap) z-3 size-4 translate-y-[-50%]">
          {showClose && (
            <X
              className="mt-0.5 size-3 cursor-pointer rounded-full stroke-accent-foreground/80 text-accent-foreground/80 transition-all group-[.is-active]:text-accent-foreground hover:bg-accent hover:stroke-accent-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            />
          )}
          {showPin && (
            <Pin
              className="mt-px size-3.5 cursor-pointer rounded-full text-accent-foreground/80 transition-all group-[.is-active]:text-accent-foreground hover:text-accent-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onUnpin();
              }}
            />
          )}
        </div>
        {/* tab-item-main */}
        <div className="tabs-chrome__item-main z-2 mx-[calc(var(--gap)*2)] my-0 flex h-full items-center overflow-hidden rounded-tl-[5px] rounded-tr-[5px] pr-4 pl-2 text-accent-foreground duration-150 group-[.is-active]:text-primary group-[.is-active]:dark:text-accent-foreground">
          {/* 对齐官方 tabs.vue：v-if="showIcon && tab.icon"，无图标时不渲染占位 */}
          {showIcon && !!icon && (
            <VbenIcon
              className="mr-1 flex size-4 items-center overflow-hidden group-hover:animate-[shrink_0.3s_ease-in-out]"
              icon={icon}
            />
          )}
          <span className="flex-1 overflow-hidden text-sm whitespace-nowrap">
            {title}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 右键菜单（对齐官方 VbenContextMenu：右键触发） */
function TabContextMenu({
  items,
  tab,
}: {
  items: ContextMenuItem[];
  tab: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {/* display:contents 让包裹层不产生盒模型，标签页仍是 .tabs-chrome 的直接 flex 子项 */}
        <span
          className="contents"
          onPointerDown={(e) => {
            // Radix DropdownMenuTrigger 在 pointerdown 就会开菜单；
            // 左键按下必须 preventDefault 拦掉，否则点页签/关闭图标会误弹右键菜单。
            // 菜单只允许右键 onContextMenu 打开（对齐官方 VbenContextMenu 触发方式）。
            if (e.button === 0) e.preventDefault();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          {tab}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {items.map((item, i) => (
          <div key={item.key}>
            {item.separator && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                item.handler();
                setOpen(false);
              }}
            >
              {item.icon && <item.icon className="mr-2 size-4" />}
              {item.text}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 更多操作（对齐官方 TabsToolMore：当前 tab 的右键菜单平铺） */
function TabsToolMore({ menus }: { menus: ContextMenuItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* 对齐官方 tool-more.vue：border-l 分隔 + hover 背景 */}
        <div className="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
          <LayoutGrid className="size-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {menus.map((item, i) => (
          <div key={item.key}>
            {item.separator && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                item.handler();
              }}
            >
              {item.icon && <item.icon className="mr-2 size-4" />}
              {item.text}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 标签栏主体 */
export function LayoutTabbar() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const refresh = useTabbarStore((state) => state.refresh);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const {
    createContextMenus,
    currentActive,
    currentTabs,
    handleClick,
    handleClose,
  } = useTabbar();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  // 对齐官方 useContentMaximize：最大化 = header.hidden + sidebar.hidden 两个偏好同时切换
  const maximize = preferences.header.hidden && preferences.sidebar.hidden;
  const toggleMaximize = useCallback(() => {
    const next = !preferences.header.hidden;
    updatePreferences({ header: { hidden: next }, sidebar: { hidden: next } });
  }, [preferences.header.hidden, updatePreferences]);

  const showIcon = preferences.tabbar.showIcon;
  const middleClickToClose = preferences.tabbar.middleClickToClose;

  /** 标签页数据（对齐官方 tabsView computed） */
  const tabsView = currentTabs.map((tab) => {
    const { fullPath, meta = {}, name, path, key } = tab;
    const { affixTab, icon, newTabTitle, tabClosable, title } = meta as any;
    return {
      affixTab: !!affixTab,
      closable: Reflect.has(meta, 'tabClosable') ? !!tabClosable : true,
      fullPath,
      icon: icon as string,
      key: key ?? path,
      name,
      path,
      title: (newTabTitle || title || name) as string,
    };
  });

  const activeTab = useTabbarStore((state) => state.getTabByKey(currentActive));
  const moreMenus = createContextMenus(activeTab);

  /** 生成单个页签的右键菜单（在官方菜单列表的「固定」后插入「最大化/还原」，对齐官方 use-tabbar） */
  const buildTabMenus = useCallback(
    (tabDef: Parameters<typeof createContextMenus>[0]) => {
      const items = createContextMenus(tabDef);
      const insertAt = items.findIndex((item) => item.key === 'reload');
      const maximizeItem: ContextMenuItem = {
        handler: async () => {
          // 对齐官方：还原时直接 toggle；最大化时先切到该页签再 toggle
          if (!maximize && tabDef) navigate(tabDef.fullPath || tabDef.path);
          toggleMaximize();
        },
        icon: maximize ? Minimize2 : Fullscreen,
        key: maximize ? 'restore-maximize' : 'maximize',
        text: maximize
          ? $t('preferences.tabbar.contextMenu.restoreMaximize')
          : $t('preferences.tabbar.contextMenu.maximize'),
      };
      if (insertAt < 0) return [...items, maximizeItem];
      return [
        ...items.slice(0, insertAt),
        maximizeItem,
        ...items.slice(insertAt),
      ];
    },
    [createContextMenus, maximize, navigate, toggleMaximize],
  );

  function scrollBy(direction: 'left' | 'right') {
    scrollRef.current?.scrollBy({
      behavior: 'smooth',
      left: direction === 'left' ? -200 : 200,
    });
  }

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <div className="size-full flex-1 overflow-hidden pt-0.75">
        <div
          ref={scrollRef}
          className="tabs-chrome flex! h-full w-max overflow-y-hidden overflow-x-auto pr-6"
          style={{ ['--gap' as string]: '7px' }}
        >
          {tabsView.map((tab, i) => {
            const tabDef = currentTabs[i];
            return (
              <TabContextMenu
                key={tab.key}
                items={buildTabMenus(tabDef)}
                tab={
                  <ChromeTab
                    active={tab.key === currentActive}
                    affixTab={tab.affixTab}
                    closable={tab.closable}
                    icon={tab.icon}
                    index={i}
                    showIcon={showIcon}
                    tabCount={tabsView.length}
                    title={$t(tab.title)}
                    onClick={() => handleClick(tab.key as string)}
                    onClose={() => handleClose(tab.key as string)}
                    onMiddleClick={(e) => {
                      if (
                        e.button === 1 &&
                        tab.closable &&
                        !tab.affixTab &&
                        tabsView.length > 1 &&
                        middleClickToClose
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClose(tab.key as string);
                      }
                    }}
                    onUnpin={() => {
                      if (tabDef)
                        useTabbarStore.getState().toggleTabPin(tabDef);
                    }}
                  />
                }
              />
            );
          })}
        </div>
      </div>
      {/* 右侧工具 */}
      <div className="flex-center h-full">
        {preferences.tabbar.showMore && <TabsToolMore menus={moreMenus} />}
        {preferences.tabbar.showRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* 对齐官方 tool-refresh.vue */}
              <div className="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                <RotateCw className="size-4" onClick={() => refresh()} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {$t('preferences.tabbar.contextMenu.reload')}
            </TooltipContent>
          </Tooltip>
        )}
        {preferences.tabbar.showMaximize && (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* 对齐官方 tool-screen.vue：未最大化用 Fullscreen 图标 */}
              <div className="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                {maximize ? (
                  <Minimize2
                    className="size-4"
                    onClick={() => toggleMaximize()}
                  />
                ) : (
                  <Fullscreen
                    className="size-4"
                    onClick={() => toggleMaximize()}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {maximize
                ? $t('preferences.tabbar.contextMenu.restoreMaximize')
                : $t('preferences.tabbar.contextMenu.maximize')}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {/* 滚动按钮（内容溢出时才显示） */}
      <span className="hidden border-r px-2">
        <ChevronsLeft
          className="size-4 h-full"
          onClick={() => scrollBy('left')}
        />
      </span>
      <span className="hidden border-l px-2">
        <ChevronsRight
          className="size-4 h-full"
          onClick={() => scrollBy('right')}
        />
      </span>
    </div>
  );
}

export default LayoutTabbar;
