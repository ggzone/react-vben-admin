/**
 * 管理后台布局骨架 —— 与官方 @vben-core/layout-ui VbenLayout 1:1 对齐
 * 固定侧边栏 + 固定头部（header + tabbar 同一 fixed 容器）+ 内容区 + 遮罩
 * 宽度/高度/margin 计算逻辑与官方 vben-layout.vue 保持一致
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight, Pin, PinOff } from 'lucide-react';

import { Button } from '#/components/ui/button';
import { VbenIcon } from '#/components/icon';
import { cn } from '#/lib/utils';
import { SCROLL_FIXED_CLASS } from '#/lib/scroll-lock';
import { usePreferencesStore } from '#/preferences/store';

export interface AdminLayoutProps {
  /** 侧边栏 logo 区域 */
  sidebarLogo?: React.ReactNode;
  /** 侧边栏菜单 */
  sidebarMenu?: React.ReactNode;
  /** 侧边栏主题（对齐官方 sidebarTheme：dark/light 直接作用于 aside） */
  sidebarTheme?: 'dark' | 'light';
  /** 头部左侧（刷新按钮 + 面包屑） */
  headerLeft?: React.ReactNode;
  /** 头部中部菜单 */
  headerMenu?: React.ReactNode;
  /** 头部右侧部件 */
  headerRight?: React.ReactNode;
  /** 头部左侧额外插槽（toggle 按钮前的自定义内容） */
  headerToggleButton?: React.ReactNode;
  /** 标签栏 */
  tabbar?: React.ReactNode;
  /** 主内容 */
  children?: React.ReactNode;
  /** 页脚 */
  footer?: React.ReactNode;
  /** 额外内容（偏好悬浮按钮等） */
  extra?: React.ReactNode;
}

/** 布局模式判定（与官方 useLayout 对齐） */
function useLayoutMode() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const layout = preferences.app.layout;
  return useMemo(
    () => ({
      isFullContent: layout === 'full-content',
      isHeaderMixedNav: layout === 'header-mixed-nav',
      isHeaderNav: layout === 'header-nav',
      isMixedNav: layout === 'mixed-nav',
      isSidebarMixedNav: layout === 'sidebar-mixed-nav',
      layout,
    }),
    [layout],
  );
}

export function AdminLayout({
  sidebarLogo,
  sidebarMenu,
  sidebarTheme,
  headerLeft,
  headerMenu,
  headerRight,
  headerToggleButton,
  tabbar,
  children,
  footer,
  extra,
}: AdminLayoutProps) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const { isFullContent, isHeaderNav, isMixedNav, isSidebarMixedNav, layout } =
    useLayoutMode();
  const [expandOnHovering, setExpandOnHovering] = useState(false);
  // 对齐官方 useScroll(document)：整页滚动 > 20px 时头部/标签栏才显示投影
  const [windowScrolled, setWindowScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setWindowScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const {
    header: headerPref,
    sidebar: sidebarPref,
    tabbar: tabbarPref,
    app: appPref,
  } = preferences;

  const isSideMode =
    layout === 'mixed-nav' ||
    layout === 'sidebar-mixed-nav' ||
    layout === 'sidebar-nav' ||
    layout === 'header-mixed-nav' ||
    layout === 'header-sidebar-nav';

  /** 侧边栏是否可用（对齐 sidebarEnableState） */
  const sidebarEnableState = !isHeaderNav && sidebarPref.enable;

  /** 折叠宽度（对齐 getSideCollapseWidth） */
  const getSideCollapseWidth =
    sidebarPref.collapsedShowTitle || isSidebarMixedNav
      ? sidebarPref.extraCollapsedWidth
      : sidebarPref.collapseWidth;

  /** 侧边栏实际宽度（对齐官方 getSidebarWidth / calcMenuWidthStyle） */
  const sidebarWidth = useMemo(() => {
    if (sidebarPref.hidden) return 0;
    if (!sidebarEnableState) return 0;
    if (isSidebarMixedNav) return sidebarPref.mixedWidth;
    // 折叠后保留图标轨道宽度（官方 sideCollapseWidth=60；collapsedShowTitle 时用 extraCollapsedWidth）
    if (sidebarPref.collapsed) return getSideCollapseWidth;
    return sidebarPref.width;
  }, [
    sidebarPref.hidden,
    sidebarPref.collapsed,
    sidebarPref.width,
    sidebarPref.mixedWidth,
    sidebarPref.enable,
    sidebarEnableState,
    isSidebarMixedNav,
    getSideCollapseWidth,
  ]);

  /** 头部容器高度（header + tabbar，对齐 headerWrapperHeight） */
  const headerWrapperHeight =
    (headerPref.enable && !headerPref.hidden ? headerPref.height : 0) +
    (tabbarPref.enable ? tabbarPref.height : 0);

  /** 折叠态下悬停展开整个侧边栏（对齐官方 expandOnHover=false 分支） */
  const handleSidebarMouseEnter = useCallback(() => {
    if (sidebarPref.expandOnHover) return;
    if (!expandOnHovering) {
      updatePreferences({ sidebar: { collapsed: false } });
    }
    setExpandOnHovering(true);
  }, [sidebarPref.expandOnHover, expandOnHovering, updatePreferences]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (sidebarPref.expandOnHover) return;
    setExpandOnHovering(false);
    updatePreferences({ sidebar: { collapsed: true } });
  }, [sidebarPref.expandOnHover, updatePreferences]);

  const showSidebar = isSideMode && sidebarPref.enable && !sidebarPref.hidden;

  /**
   * 是否按侧边栏宽度偏移主区域 —— 对齐官方 mainStyle 的生效条件：
   * 头部 fixed + 非 header-nav / mixed-nav / header-sidebar-nav + 侧边栏可见
   */
  const isMainOffset =
    headerPref.mode !== 'static' && !isHeaderNav && !isMixedNav && showSidebar;

  /** 侧边栏占位宽度（对齐官方 sidebarAndExtraWidth） */
  const sidebarAndExtraWidth = isMainOffset ? `${sidebarWidth}px` : 'unset';

  /** 主区域宽度（对齐 mainStyle.width） */
  const mainWidth = isMainOffset ? `calc(100% - ${sidebarWidth}px)` : '100%';

  /** 头部 fixed 容器样式（对齐 headerWrapperStyle） */
  const headerWrapperStyle: React.CSSProperties = {
    height: isFullContent ? 0 : `${headerWrapperHeight}px`,
    left: isMixedNav ? 0 : sidebarAndExtraWidth,
    position: headerPref.mode === 'static' ? 'static' : 'fixed',
    top: 0,
    width: mainWidth,
    zIndex: appPref.zIndex,
  };

  /** 内容区样式（对齐 contentStyle） */
  const contentStyle: React.CSSProperties = {
    marginTop:
      headerPref.mode !== 'static' && !isFullContent
        ? `${headerWrapperHeight}px`
        : 0,
  };

  const sidebarZIndex = appPref.zIndex + 1;

  /** 内容区 CSS 变量（对齐官方 use-layout-style：--vben-content-height/width） */
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const setVars = () => {
      el.style.setProperty('--vben-content-height', `${el.offsetHeight}px`);
      el.style.setProperty('--vben-content-width', `${el.offsetWidth}px`);
    };
    setVars();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(setVars);
    observer.observe(el);
    return () => observer.disconnect();
  }, [headerWrapperHeight, mainWidth]);

  return (
    <div className="relative flex min-h-full w-full">
      {/* 侧边栏占位（对齐官方 layout-sidebar.vue 的 domVisible div）：fixed 的 aside 不占流，
          由这个同宽空 div 撑开主区域的起始位置 */}
      {sidebarEnableState && (
        <div
          className="h-full shrink-0 transition-all duration-150"
          style={{ width: `${sidebarWidth}px` }}
        />
      )}

      {/* 侧边栏 */}
      {sidebarEnableState && (
        <aside
          className={cn(
            'fixed left-0 top-0 h-full transition-all duration-150',
            sidebarTheme,
          )}
          style={{
            overflow: sidebarWidth === 0 ? 'hidden' : undefined,
            width: `${sidebarWidth}px`,
            zIndex: sidebarZIndex,
          }}
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
        >
          <div
            className={cn(
              'h-full',
              isSidebarMixedNav
                ? 'bg-sidebar-deep'
                : 'border-r border-border bg-sidebar',
            )}
            style={{ width: `${sidebarWidth}px` }}
          >
            {sidebarLogo && (
              <div
                className="flex items-center border-b border-border/60"
                style={{ height: `${headerPref.height - 1}px` }}
              >
                {sidebarLogo}
              </div>
            )}
            <div
              className="overflow-y-auto"
              style={{
                height: `calc(100% - ${headerPref.height + 42}px)`,
                paddingTop: '8px',
              }}
            >
              {sidebarMenu}
            </div>
            {/* 底部工具区（对齐官方 collapseStyle 42px + collapse/fixed 按钮） */}
            <div className="relative" style={{ height: '42px' }}>
              {sidebarPref.collapsedButton && (
                <div
                  className="absolute bottom-2 left-3 z-10 flex-center cursor-pointer rounded-sm bg-accent p-1 text-foreground/60 hover:bg-accent-hover hover:text-foreground"
                  onClick={() =>
                    updatePreferences({
                      sidebar: { collapsed: !sidebarPref.collapsed },
                    })
                  }
                >
                  {sidebarPref.collapsed ? (
                    <ChevronsRight className="size-4" />
                  ) : (
                    <ChevronsLeft className="size-4" />
                  )}
                </div>
              )}
              {sidebarPref.fixedButton &&
                !sidebarPref.collapsed &&
                !isSidebarMixedNav && (
                  <div
                    className="absolute right-3 bottom-2 z-10 flex-center cursor-pointer rounded-sm bg-accent p-[5px] text-foreground/60 transition-all duration-300 hover:bg-accent-hover hover:text-foreground"
                    title={
                      sidebarPref.expandOnHover ? '取消固定' : '固定侧边栏'
                    }
                    onClick={() =>
                      updatePreferences({
                        sidebar: { expandOnHover: !sidebarPref.expandOnHover },
                      })
                    }
                  >
                    {sidebarPref.expandOnHover ? (
                      <Pin className="size-3.5" />
                    ) : (
                      <PinOff className="size-3.5" />
                    )}
                  </div>
                )}
            </div>
          </div>
          {/* 拖拽调整宽度 */}
          {sidebarPref.draggable && (
            <div
              className="absolute inset-y-0 -right-px z-1000 w-0.5 cursor-col-resize hover:bg-primary"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = sidebarWidth;
                const onMove = (ev: MouseEvent) => {
                  const next = Math.min(
                    320,
                    Math.max(
                      getSideCollapseWidth,
                      startWidth + ev.clientX - startX,
                    ),
                  );
                  updatePreferences({
                    sidebar: {
                      collapsed: next <= sidebarPref.collapseWidth,
                      width: next,
                    },
                  });
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          )}
        </aside>
      )}

      {/* 主区域（对齐官方 content 容器：flex-1；起始位置由上面的占位 div 决定） */}
      <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in">
        {/* 头部 + 标签栏（fixed 容器）；对齐官方 vben-layout.vue：滚动 > 20px 才有投影 */}
        <div
          className={cn(
            // 对齐官方 vben-layout.vue：SCROLL_FIXED_CLASS 标记，弹窗打开时补偿滚动条宽度
            SCROLL_FIXED_CLASS,
            'overflow-hidden transition-all duration-200',
            windowScrolled && 'shadow-[0_16px_24px_hsl(var(--background))]',
          )}
          style={headerWrapperStyle}
        >
          {/* 对齐官方 headerVisible = enable && !hidden（最大化时 header.hidden=true） */}
          {headerPref.enable && !headerPref.hidden && (
            <header
              className="top-0 flex w-full flex-[0_0_auto] items-center border-b border-border bg-header pl-2 transition-[margin-top] duration-200"
              style={{ height: `${headerPref.height}px` }}
            >
              {headerToggleButton ?? (
                <Button
                  className="my-0 mr-1 rounded-md"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    updatePreferences({
                      sidebar: { collapsed: !sidebarPref.collapsed },
                    })
                  }
                >
                  {/* 对齐官方 vben-layout.vue：ep:fold（☰）/ ep:expand */}
                  <VbenIcon
                    className="size-4"
                    icon={showSidebar ? 'ep:fold' : 'ep:expand'}
                  />
                </Button>
              )}
              {headerLeft}
              <div
                className={cn(
                  'flex h-full min-w-0 flex-1 items-center',
                  headerPref.menuAlign === 'center' && 'justify-center',
                  headerPref.menuAlign === 'end' && 'justify-end',
                )}
              >
                {headerMenu}
              </div>
              <div className="flex h-full min-w-0 shrink-0 items-center">
                {headerRight}
              </div>
            </header>
          )}
          {tabbarPref.enable && (
            <div
              className="border-b border-border"
              style={{ height: `${tabbarPref.height}px` }}
            >
              {tabbar}
            </div>
          )}
        </div>

        {/* 内容 —— 对齐官方 layout-content.vue：<main class="relative bg-background-deep">
            官方 main 是 flex:1 的块级容器（无 flex 布局），内部由 relative h-full 的 div 包裹页面 */}
        <main
          ref={mainRef}
          className="relative bg-background-deep transition-[margin-top] duration-200"
          style={{ ...contentStyle, flex: 1 }}
        >
          {children}
        </main>

        {/* 页脚 */}
        {footer && <div>{footer}</div>}
      </div>

      {extra}
    </div>
  );
}

export default AdminLayout;
