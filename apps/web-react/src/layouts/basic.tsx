/**
 * 基础布局 —— 与官方 layouts/basic + header.vue（main 分支）1:1 对齐
 * 装配：侧边栏（logo + 菜单）+ 头部（面包屑 / 全局搜索/偏好/主题/语言/时区/全屏/刷新/通知/锁屏/退出/用户下拉）+ 标签栏 + 内容
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenText,
  CircleHelp,
  Github,
  LockKeyhole,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

import { AdminLayout } from '#/components/layout/admin-layout';
import { VbenMenu } from '#/components/layout/menu';
import { PageTransition } from '#/components/layout/page-transition';
import { Logo } from '#/components/layout/logo';
import {
  PreferencesDrawer,
  openPreferencesDrawer,
} from '#/components/layout/preferences';
import { LayoutTabbar } from '#/components/layout/tabbar';
import { Breadcrumb } from '#/components/widgets/breadcrumb';
import { GlobalSearch } from '#/components/widgets/global-search';
import {
  FullscreenButton,
  LanguageToggle,
  RefreshButton,
} from '#/components/widgets/header-widgets';
import {
  Notification,
  type NotificationItem,
} from '#/components/widgets/notification';
import { ThemeToggle } from '#/components/widgets/theme-toggle';
import {
  LockScreen,
  LockScreenSetupModal,
} from '#/components/widgets/lock-screen';
import { TimezoneButton } from '#/components/widgets/timezone-button';
import { UserDropdown } from '#/components/widgets/user-dropdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { IconButton } from '#/components/ui/icon-button';
import { Button } from '#/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { VBEN_DOC_URL, VBEN_GITHUB_URL } from '#/constants';
import { $t } from '#/locales';
import { openWindow } from '#/lib/utils';
import { usePreferencesStore } from '#/preferences/store';
import { isDarkTheme } from '#/preferences/update-css-variables';
import { useAccessStore } from '#/stores/access';
import { useAuthStore } from '#/stores/auth';
import { useUserStore } from '#/stores/user';

/** 初始通知数据（与官方 basic.vue 1:1） */
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    avatar: 'https://avatar.vercel.sh/vercel.svg?text=VB',
    date: '3小时前',
    id: 1,
    isRead: true,
    message: '描述信息描述信息描述信息',
    title: '收到了 14 份新周报',
  },
  {
    avatar: 'https://avatar.vercel.sh/1',
    date: '刚刚',
    id: 2,
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '朱偏右 回复了你',
  },
  {
    avatar: 'https://avatar.vercel.sh/1',
    date: '2024-01-01',
    id: 3,
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '曲丽丽 评论了你',
  },
  {
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1天前',
    id: 4,
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '代办提醒',
  },
  {
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1天前',
    id: 5,
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '跳转Workspace示例',
    link: '/workspace',
  },
  {
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1天前',
    id: 6,
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '跳转外部链接示例',
    link: 'https://doc.vben.pro',
  },
];

export function BasicLayout() {
  const navigate = useNavigate();
  const userInfo = useUserStore((state) => state.userInfo);
  const accessMenus = useAccessStore((state) => state.accessMenus);
  const preferences = usePreferencesStore((state) => state.preferences);
  const logout = useAuthStore((state) => state.logout);
  const isLocked = useAuthStore((state) => state.isLocked);

  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS,
  );
  // 对齐官方 main 分支 header.vue：锁屏/退出按钮（含 Alt+L / Alt+Q 快捷键）
  const [lockOpen, setLockOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const lockScreenPassword = useAuthStore((state) => state.lockScreen);

  const isDark = isDarkTheme(preferences.theme.mode);

  const avatar = userInfo?.avatar ?? preferences.app.defaultAvatar;

  /** 用户下拉菜单（与官方 menus computed 1:1） */
  const menus = useMemo(
    () => [
      {
        handler: () => navigate('/profile'),
        icon: UserIcon,
        text: $t('page.auth.profile'),
      },
      {
        handler: () => openWindow(VBEN_DOC_URL, { target: '_blank' }),
        icon: BookOpenText,
        text: $t('ui.widgets.document'),
      },
      {
        handler: () => openWindow(VBEN_GITHUB_URL, { target: '_blank' }),
        icon: Github,
        text: 'GitHub',
      },
      {
        handler: () =>
          openWindow(`${VBEN_GITHUB_URL}/issues`, { target: '_blank' }),
        icon: CircleHelp,
        text: $t('ui.widgets.qa'),
      },
    ],
    [navigate],
  );

  /** 侧边栏主题（对齐 sidebarTheme computed） */
  const sidebarTheme =
    isDark || preferences.theme.semiDarkSidebar ? 'dark' : 'light';
  const logoTheme = sidebarTheme === 'dark' ? 'dark' : 'light';

  /** 通知红点 */
  const showDot = notifications.some((item) => !item.isRead);

  const w = preferences.widget;

  // 对齐官方 main 分支 header.vue：header 锁屏/退出快捷键（Alt+L / Alt+Q）
  const enableLockShortcut =
    w.lockScreen &&
    preferences.shortcutKeys.enable &&
    preferences.shortcutKeys.globalLockScreen;
  const enableLogoutShortcut =
    preferences.shortcutKeys.enable && preferences.shortcutKeys.globalLogout;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.code === 'KeyL' && enableLockShortcut) {
        e.preventDefault();
        setLockOpen(true);
      } else if (e.code === 'KeyQ' && enableLogoutShortcut) {
        e.preventDefault();
        setLogoutOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enableLockShortcut, enableLogoutShortcut]);

  /** 头部右侧部件顺序（对齐官方 main 分支 widget.order：
      global-search → preferences → theme → language → timezone → fullscreen → refresh → notification → lock-screen → logout → user-dropdown；每个图标均带 tooltip） */
  const buttonPosition = preferences.app.preferencesButtonPosition;

  /** tooltip 包裹 helper（对齐官方 VbenTooltip side="bottom" + VbenIconButton delayDuration=200）。
      统一用 inline-flex span 承载触发器：自定义部件（ThemeToggle/FullscreenButton 等）
      不透传 ref/事件 props，asChild 直接包会挂不上 hover 事件导致 tooltip 不出现。 */
  const withTip = (text: string, node: React.ReactNode, key?: string) => (
    <Tooltip delayDuration={200} key={key}>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center">{node}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{text}</TooltipContent>
    </Tooltip>
  );

  const headerRight = (
    <>
      {w.globalSearch && (
        <GlobalSearch className="mr-1 sm:mr-4" menus={accessMenus} />
      )}
      {(buttonPosition === 'header' || buttonPosition === 'auto') &&
        withTip(
          $t('preferences.title'),
          <IconButton
            className="mr-1 hover:animate-[shrink_0.3s_ease-in-out]"
            onClick={() => openPreferencesDrawer()}
          >
            <SettingsIcon />
          </IconButton>,
          'preferences',
        )}
      {w.themeToggle &&
        withTip(
          $t('preferences.theme.title'),
          <ThemeToggle className="mt-0.5 mr-1" />,
          'theme',
        )}
      {/* LanguageToggle 自带 tooltip（受控），下拉展开时会强制关掉 tooltip，
          因此这里不再套 withTip——套两层会出现气泡与下拉并存 */}
      {w.languageToggle && <LanguageToggle className="mr-1" />}
      {w.timezone && <TimezoneButton className="mt-0.5 mr-1" />}
      {w.fullscreen &&
        withTip(
          $t('preferences.widget.fullscreen'),
          <FullscreenButton className="mr-1" />,
          'fullscreen',
        )}
      {w.notification &&
        withTip(
          $t('preferences.widget.notification'),
          <Notification
            dot={showDot}
            notifications={notifications}
            onClear={() => setNotifications([])}
            onClick={(item) => {
              if (item.link) {
                if (item.link.startsWith('http'))
                  window.open(item.link, '_blank');
                else navigate(item.link);
              }
            }}
            onMakeAll={() =>
              setNotifications((prev) =>
                prev.map((item) => ({ ...item, isRead: true })),
              )
            }
            onRead={(item) =>
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === item.id ? { ...n, isRead: true } : n,
                ),
              )
            }
            onRemove={(item) =>
              setNotifications((prev) => prev.filter((n) => n.id !== item.id))
            }
          />,
          'notification',
        )}
      {w.lockScreen &&
        withTip(
          $t('ui.widgets.lockScreen.title'),
          <IconButton
            className="mr-1 hover:animate-[shrink_0.3s_ease-in-out]"
            onClick={() => setLockOpen(true)}
          >
            <LockKeyhole className="size-4 text-foreground" />
          </IconButton>,
          'lock-screen',
        )}
      {withTip(
        $t('common.logout'),
        <IconButton
          className="mr-1 hover:animate-[shrink_0.3s_ease-in-out]"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="size-4 text-foreground" />
        </IconButton>,
        'logout',
      )}
      <UserDropdown
        menus={menus}
        onOpenPreferences={() => openPreferencesDrawer()}
      />
    </>
  );

  return (
    <AdminLayout
      footer={undefined}
      headerLeft={
        <>
          {/* 对齐官方 header.vue 的 leftSlots：refresh 索引 0，排在面包屑之前、且不带 tooltip */}
          {w.refresh && <RefreshButton className="my-0 mr-1 rounded-md" />}
          {preferences.breadcrumb.enable && (
            <div className="hidden lg:block">
              <Breadcrumb
                hideWhenOnlyOne={preferences.breadcrumb.hideOnlyOne}
                showHome={preferences.breadcrumb.showHome}
                showIcon={preferences.breadcrumb.showIcon}
                type={preferences.breadcrumb.styleType}
              />
            </div>
          )}
        </>
      }
      headerRight={headerRight}
      sidebarLogo={
        preferences.logo.enable ? (
          <Logo
            collapsed={preferences.sidebar.collapsed}
            fit={preferences.logo.fit}
            src={preferences.logo.source}
            srcDark={preferences.logo.sourceDark}
            text={preferences.app.name}
            theme={logoTheme}
          />
        ) : undefined
      }
      sidebarMenu={
        <VbenMenu
          accordion={preferences.navigation.accordion}
          collapse={preferences.sidebar.collapsed}
          collapseShowTitle={preferences.sidebar.collapsedShowTitle}
          menus={accessMenus}
          rounded={preferences.navigation.styleType === 'rounded'}
          theme={sidebarTheme}
        />
      }
      sidebarTheme={sidebarTheme}
      tabbar={<LayoutTabbar />}
      extra={
        <>
          {/* 偏好设置抽屉（远程打开，全局唯一） */}
          <PreferencesDrawer
            onClearPreferencesAndLogout={() => {
              void logout(true);
            }}
          />
          {/* position=fixed 时渲染右侧悬浮按钮（对齐官方 #extra 插槽） */}
          {preferences.app.preferencesButtonPosition === 'fixed' && (
            <div className="fixed top-1/2 right-0 z-100 -translate-y-1/2">
              <button
                className="flex-col-center size-10 cursor-pointer rounded-l-lg rounded-r-none border-none bg-primary"
                title={$t('preferences.title')}
                onClick={() => openPreferencesDrawer()}
              >
                <SettingsIcon />
              </button>
            </div>
          )}
        </>
      }
    >
      {/* 对齐官方 content/content.vue：<div class="relative h-full"> 包裹页面，
          内层按 preferences.transition 驱动页面切换动画 */}
      <div className="relative h-full">
        <PageTransition />
      </div>
      {/* 锁屏遮罩（对齐官方 layout.vue 中的 <LockScreen v-if="isLocked" />） */}
      {isLocked && <LockScreen />}
      {/* header 锁屏弹窗（对齐官方 main 分支 header.vue 的 <LockModal>） */}
      <LockScreenSetupModal
        onLock={(password) => lockScreenPassword(password)}
        onOpenChange={setLockOpen}
        open={lockOpen}
      />
      {/* header 退出确认弹窗（对齐官方 main 分支 header.vue 的 <LogoutModal>） */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="px-8 pb-3" showClose={false}>
          <DialogHeader>
            <DialogTitle>{$t('common.prompt')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="min-h-10 py-2">
            {$t('ui.widgets.logoutTip')}
          </DialogDescription>
          <DialogFooter className="mr-3 border-none pb-3">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              {$t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                setLogoutOpen(false);
                logout(true);
              }}
            >
              {$t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

/** 设置图标（避免循环依赖，内联实现） */
function SettingsIcon() {
  return (
    <svg
      className="size-4 text-foreground"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default BasicLayout;
