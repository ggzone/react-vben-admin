/**
 * 偏好设置抽屉 —— 与官方 preferences.vue + preferences-drawer.vue 1:1 对齐
 * 右侧滑出抽屉：外观/布局/快捷键/通用/Antd 拓展 五个页签 + 重置/固定钉 + 复制偏好/清空并退出登录
 * 另提供 PreferencesButton（固定悬浮按钮）与全局打开方法 openPreferencesDrawer()
 */
import { create } from 'zustand';
import { useMemo, useState } from 'react';
import { Copy, Pin, PinOff, RotateCw, Settings, X } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { Button } from '#/components/ui/button';
import { Tabs, TabsContent } from '#/components/ui/tabs';
import { Segmented } from '#/components/ui/segmented';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { cn } from '#/lib/utils';
import { $t } from '#/locales';
import { isDarkTheme } from '#/preferences/update-css-variables';
import { usePreferencesStore } from '#/preferences/store';
import {
  PreferenceAnimationBlock,
  PreferenceBlock,
  PreferenceBreadcrumbBlock,
  PreferenceBuiltinThemeBlock,
  PreferenceColorModeBlock,
  PreferenceContentBlock,
  PreferenceCopyrightBlock,
  PreferenceFontSizeBlock,
  PreferenceFooterBlock,
  PreferenceGeneralBlock,
  PreferenceGlobalShortcutKeysBlock,
  PreferenceHeaderBlock,
  PreferenceInputItem,
  PreferenceLayoutBlock,
  PreferenceNavigationBlock,
  PreferenceNumberFieldItem,
  PreferenceRadiusBlock,
  PreferenceSelectItem,
  PreferenceSidebarBlock,
  PreferenceSwitchItem,
  PreferenceTabbarBlock,
  PreferenceThemeBlock,
  PreferenceWidgetBlock,
} from '#/components/layout/preferences-blocks';
import { useAuthStore } from '#/stores/auth';

/** 抽屉开关状态（供 user-dropdown 等远程打开） */
const useDrawerStore = create<{ open: boolean }>()(() => ({ open: false }));

export function openPreferencesDrawer() {
  useDrawerStore.setState({ open: true });
}

/** 深比较：当前偏好与初始偏好的差异（对齐官方 diffPreference） */
function diffPreferences(
  current: any,
  initial: any,
): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(initial)) {
    const a = current?.[key];
    const b = initial[key];
    if (a === undefined) continue;
    if (typeof b === 'object' && b !== null && !Array.isArray(b)) {
      const sub: Record<string, unknown> = {};
      for (const subKey of Object.keys(b)) {
        if (JSON.stringify(a?.[subKey]) !== JSON.stringify(b[subKey])) {
          sub[subKey] = a?.[subKey];
        }
      }
      if (Object.keys(sub).length > 0) result[key] = sub;
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      result[key] = a;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** 偏好设置抽屉 */
export function PreferencesDrawer({
  onClearPreferencesAndLogout,
}: {
  onClearPreferencesAndLogout?: () => void;
}) {
  const open = useDrawerStore((state) => state.open);
  const preferences = usePreferencesStore((state) => state.preferences);
  const initialPreferences = usePreferencesStore(
    (state) => state.initialPreferences,
  );
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const customPreferences = usePreferencesStore(
    (state) => state.customPreferences,
  );
  const updateCustomPreferences = usePreferencesStore(
    (state) => state.updateCustomPreferences,
  );
  const resetPreferences = usePreferencesStore(
    (state) => state.resetPreferences,
  );
  const clearCache = usePreferencesStore((state) => state.clearCache);
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState('appearance');
  /** 对齐官方：固定页签是 app 偏好（默认 true），不是组件局部状态 */
  const stickyNav = preferences.app.enableStickyPreferencesNavigationBar;

  const isDark = isDarkTheme(preferences.theme.mode);
  const isFullContent = preferences.app.layout === 'full-content';
  const isMixedNav = preferences.app.layout === 'mixed-nav';
  const isHeaderNav = preferences.app.layout === 'header-nav';

  const diffPreference = useMemo(
    () => diffPreferences(preferences, initialPreferences),
    [preferences, initialPreferences],
  );

  const showBreadcrumbConfig =
    !isFullContent && !isMixedNav && !isHeaderNav && preferences.header.enable;

  async function handleReset() {
    await resetPreferences();
  }

  async function handleClearCache() {
    await resetPreferences();
    await clearCache();
    useDrawerStore.setState({ open: false });
    if (onClearPreferencesAndLogout) onClearPreferencesAndLogout();
    else await logout(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(diffPreference, null, 2),
      );
    } catch {
      // 剪贴板不可用时忽略
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => useDrawerStore.setState({ open: val })}
    >
      <DialogContent
        className="inset-y-0 right-0 left-auto top-0 h-full max-h-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none border-0! p-0 sm:max-w-sm data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
        showClose={false}
      >
        {/* 对齐官方 drawer.vue：SheetHeader + 'flex! flex-row items-center justify-between border-b px-4 py-3'
            标题与副标题同一行（官方 h2 与 p 都在 div.flex.items-center 内） */}
        <DialogHeader className="flex! flex-row items-center justify-between border-b px-4 py-3">
          <div className="flex items-center">
            <DialogTitle className="text-base leading-[1.15] font-medium tracking-normal">
              {$t('preferences.title')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {$t('preferences.subtitle')}
            </DialogDescription>
          </div>
          <div className="flex-center">
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="relative"
                    disabled={!diffPreference}
                    size="icon"
                    variant="ghost"
                    onClick={handleReset}
                  >
                    {diffPreference && (
                      <span className="absolute top-0.5 right-0.5 size-2 rounded-sm bg-primary" />
                    )}
                    <RotateCw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{$t('preferences.resetTip')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="relative"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      updatePreferences({
                        app: {
                          enableStickyPreferencesNavigationBar: !stickyNav,
                        },
                      })
                    }
                  >
                    {stickyNav ? (
                      <PinOff className="size-4" />
                    ) : (
                      <Pin className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {stickyNav
                    ? $t('preferences.disableStickyPreferencesNavigationBar')
                    : $t('preferences.enableStickyPreferencesNavigationBar')}
                </TooltipContent>
              </Tooltip>
            </div>
            {/* 官方 SheetClose：32x32 圆形图标按钮（VbenIconButton） */}
            <DialogClose className="ml-0.5 flex size-8 cursor-pointer items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="relative flex-1 overflow-y-auto p-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* 对齐官方 VbenSegmented（分段控件 + 滑动指示器） */}
            <Segmented
              className={cn(stickyNav && 'sticky -top-3 z-9999')}
              items={[
                { label: $t('preferences.appearance'), value: 'appearance' },
                { label: $t('preferences.layout'), value: 'layout' },
                {
                  label: $t('preferences.shortcutKeys.title'),
                  value: 'shortcutKey',
                },
                { label: $t('preferences.general'), value: 'general' },
                // 对齐官方 web-antd 注册的 preferencesExtension（tabLabel=preferences.antd.tabLabel）
                { label: $t('preferences.antd.tabLabel'), value: 'custom' },
              ]}
              value={activeTab}
              onValueChange={setActiveTab}
            />

            {/* 外观 */}
            <TabsContent value="appearance">
              <PreferenceBlock title={$t('preferences.theme.title')}>
                <PreferenceThemeBlock />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.theme.builtin.title')}>
                <PreferenceBuiltinThemeBlock isDark={isDark} />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.theme.radius')}>
                <PreferenceRadiusBlock />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.theme.fontSize')}>
                <PreferenceFontSizeBlock />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.other')}>
                <PreferenceColorModeBlock />
              </PreferenceBlock>
            </TabsContent>

            {/* 布局 */}
            <TabsContent value="layout">
              <PreferenceBlock title={$t('preferences.layout')}>
                <PreferenceLayoutBlock />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.content')}>
                <PreferenceContentBlock />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.sidebar.title')}>
                <PreferenceSidebarBlock
                  disabled={
                    !isMixedNav && preferences.app.layout !== 'sidebar-nav'
                  }
                />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.header.title')}>
                <PreferenceHeaderBlock disabled={isFullContent} />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.navigationMenu.title')}>
                <PreferenceNavigationBlock disabled={isFullContent} />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.breadcrumb.title')}>
                <PreferenceBreadcrumbBlock
                  disabled={
                    !showBreadcrumbConfig ||
                    !(
                      preferences.app.layout === 'sidebar-nav' ||
                      preferences.app.layout === 'sidebar-mixed-nav' ||
                      preferences.app.layout === 'header-sidebar-nav'
                    )
                  }
                />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.tabbar.title')}>
                <PreferenceTabbarBlock />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.widget.title')}>
                <PreferenceWidgetBlock />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.footer.title')}>
                <PreferenceFooterBlock />
              </PreferenceBlock>
              {preferences.copyright.settingShow && (
                <PreferenceBlock title={$t('preferences.copyright.title')}>
                  <PreferenceCopyrightBlock
                    disabled={!preferences.footer.enable}
                  />
                </PreferenceBlock>
              )}
            </TabsContent>

            {/* 快捷键 */}
            <TabsContent value="shortcutKey">
              <PreferenceBlock title={$t('preferences.shortcutKeys.global')}>
                <PreferenceGlobalShortcutKeysBlock />
              </PreferenceBlock>
            </TabsContent>

            {/* 通用 */}
            <TabsContent value="general">
              <PreferenceBlock title={$t('preferences.general')}>
                <PreferenceGeneralBlock />
              </PreferenceBlock>
              <PreferenceBlock title={$t('preferences.animation.title')}>
                <PreferenceAnimationBlock />
              </PreferenceBlock>
            </TabsContent>

            {/* Antd 拓展（对齐官方 apps/web-antd/src/preferences.ts 的 preferencesExtension） */}
            <TabsContent value="custom">
              <PreferenceBlock title={$t('preferences.antd.title')}>
                <PreferenceSwitchItem
                  checked={Boolean(customPreferences.enableFormFullscreen)}
                  tip={$t('preferences.antd.fields.enableFormFullscreen.tip')}
                  onChange={(val) =>
                    updateCustomPreferences({ enableFormFullscreen: val })
                  }
                >
                  {$t('preferences.antd.fields.enableFormFullscreen.label')}
                </PreferenceSwitchItem>
                <PreferenceSelectItem
                  items={[
                    {
                      label: $t(
                        'preferences.antd.fields.tenantMode.options.single.label',
                      ),
                      value: 'single',
                    },
                    {
                      label: $t(
                        'preferences.antd.fields.tenantMode.options.multi.label',
                      ),
                      value: 'multi',
                    },
                  ]}
                  value={String(customPreferences.tenantMode ?? 'single')}
                  onChange={(val) =>
                    updateCustomPreferences({
                      tenantMode: val as 'multi' | 'single',
                    })
                  }
                >
                  {$t('preferences.antd.fields.tenantMode.label')}
                </PreferenceSelectItem>
                <PreferenceNumberFieldItem
                  max={200}
                  min={10}
                  step={10}
                  value={Number(customPreferences.defaultTableSize ?? 20)}
                  onChange={(val) =>
                    updateCustomPreferences({ defaultTableSize: val })
                  }
                >
                  {$t('preferences.antd.fields.defaultTableSize.label')}
                </PreferenceNumberFieldItem>
                <PreferenceInputItem
                  placeholder={$t(
                    'preferences.antd.fields.reportTitle.placeholder',
                  )}
                  value={String(customPreferences.reportTitle ?? '')}
                  onChange={(val) =>
                    updateCustomPreferences({ reportTitle: val })
                  }
                >
                  {$t('preferences.antd.fields.reportTitle.label')}
                </PreferenceInputItem>
              </PreferenceBlock>
            </TabsContent>
          </Tabs>
        </div>

        {/* 对齐官方 footer：'w-full flex-row items-center justify-end border-t p-2 px-3'，
            两个按钮并排（各自 w-full + mx-4/mr-4，官方实测均为 152x32） */}
        <DialogFooter className="w-full flex-row items-center justify-end gap-x-2 border-t p-2 px-3">
          {preferences.app.enableCopyPreferences && (
            <Button
              className="mx-4 w-full"
              disabled={!diffPreference}
              size="sm"
              variant="default"
              onClick={handleCopy}
            >
              <Copy className="mr-2 size-3" />
              {$t('preferences.copyPreferences')}
            </Button>
          )}
          <Button
            className="mr-4 w-full"
            disabled={!diffPreference}
            size="sm"
            variant="ghost"
            onClick={handleClearCache}
          >
            {$t('preferences.clearAndLogout')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 偏好设置按钮（对齐官方 preferences.vue 的触发按钮）
 * position=fixed 时由布局渲染到右侧固定位置；header 位置由头部渲染
 */
export function PreferencesButton({
  className,
  onClearPreferencesAndLogout,
}: {
  className?: string;
  onClearPreferencesAndLogout?: () => void;
}) {
  const preferences = usePreferencesStore((state) => state.preferences);
  if (!preferences.app.enablePreferences) return null;
  return (
    <>
      <PreferencesDrawer
        onClearPreferencesAndLogout={onClearPreferencesAndLogout}
      />
      <Button
        className={cn(
          'flex-col-center size-10 cursor-pointer rounded-l-lg rounded-r-none border-none bg-primary',
          className,
        )}
        title={$t('preferences.title')}
        onClick={() => useDrawerStore.setState({ open: true })}
      >
        <Settings className="size-5" />
      </Button>
    </>
  );
}

export default PreferencesDrawer;
