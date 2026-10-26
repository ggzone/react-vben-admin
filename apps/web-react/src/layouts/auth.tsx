/**
 * 认证页布局 —— 与官方 packages/effects/layouts/src/authentication 1:1 对齐
 * 左侧/右侧/居中 三种面板布局（authPageLayout 偏好）+ 系统介绍区 + 工具栏 + 版权
 */
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Copyright } from '#/components/layout/copyright';
import { Slogan } from '#/components/layout/slogan';
import { LanguageToggle } from '#/components/widgets/header-widgets';
import { ColorToggle } from '#/components/widgets/color-toggle';
import { LayoutToggle } from '#/components/widgets/layout-toggle';
import { ThemeToggle } from '#/components/widgets/theme-toggle';
import { LOGIN_PATH } from '#/constants';
import { $t } from '#/locales';
import { usePreferencesStore } from '#/preferences/store';
import { isDarkTheme } from '#/preferences/update-css-variables';
import { useAccessStore } from '#/stores/access';
import { useUserStore } from '#/stores/user';

/**
 * 认证表单视图容器 —— 对齐官方 packages/effects/layouts/src/authentication/form.vue
 * 给路由页统一套上 `side-content mt-6 w-full sm:mx-auto md:max-w-md` 与入场动画 side
 */
function AuthFormView({
  side,
  children,
}: {
  side: 'bottom' | 'left' | 'right' | 'top';
  children: ReactNode;
}) {
  return (
    <div
      className="side-content mt-6 w-full sm:mx-auto md:max-w-md"
      data-side={side}
    >
      {children}
    </div>
  );
}

export function AuthLayout() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const isDark = isDarkTheme(preferences.theme.mode);
  const accessToken = useAccessStore((state) => state.accessToken);
  const userHomePath = useUserStore((state) => state.userInfo?.homePath);
  const location = useLocation();

  const authPanelLeft = preferences.app.authPageLayout === 'panel-left';
  const authPanelRight = preferences.app.authPageLayout === 'panel-right';
  const authPanelCenter = preferences.app.authPageLayout === 'panel-center';

  const appName = preferences.app.name;
  const logo =
    isDark && preferences.logo.sourceDark
      ? preferences.logo.sourceDark
      : preferences.logo.source;
  const pageTitle = $t('authentication.pageTitle');
  const pageDescription = $t('authentication.pageDesc');

  const copyright = preferences.copyright.enable ? <Copyright /> : null;

  /**
   * 已登录访问登录页 → 跳转（对齐官方 guard.ts：
   * `redirect || userInfo.homePath || app.defaultHomePath`）
   */
  if (accessToken && location.pathname === LOGIN_PATH) {
    const redirect = new URLSearchParams(location.search).get('redirect');
    const target = redirect
      ? decodeURIComponent(redirect)
      : (userHomePath ?? preferences.app.defaultHomePath);
    return <Navigate replace to={target} />;
  }

  return (
    <div
      className={`flex min-h-full flex-1 overflow-x-hidden select-none ${isDark ? 'dark' : ''}`}
    >
      {/* 工具栏 —— 对齐官方 authentication/toolbar.vue：
          `absolute top-4 right-2 z-10 flex-center`，多项时补 `rounded-3xl bg-accent px-3 py-1`；
          颜色/布局切换放在 `hidden md:flex` 内，语言/主题常显 */}
      <div className="absolute top-4 right-2 z-10 flex-center rounded-3xl bg-accent px-3 py-1">
        <div className="hidden md:flex">
          <ColorToggle />
          <LayoutToggle />
        </div>
        {preferences.widget.languageToggle && <LanguageToggle />}
        {preferences.widget.themeToggle && <ThemeToggle shouldOnHover />}
      </div>

      {/* 左侧认证面板 */}
      {authPanelLeft && (
        <div className="relative flex-col-center bg-background px-6 py-10 lg:flex-initial lg:px-8 dark:bg-background-deep min-h-full w-2/5 flex-1">
          <AuthFormView side="left">
            <Outlet />
          </AuthFormView>
          <div className="absolute bottom-3 flex text-center text-xs text-muted-foreground">
            {copyright}
          </div>
        </div>
      )}

      {/* 头部 Logo 和应用名称 */}
      <div className="absolute top-0 left-0 z-10 flex flex-1">
        <div className="mt-4 ml-4 flex flex-1 items-center text-foreground sm:top-6 sm:left-6">
          {logo && <img alt={appName} className="mr-2" src={logo} width="42" />}
          {appName && <p className="m-0 text-xl font-medium">{appName}</p>}
        </div>
      </div>

      {/* 系统介绍 */}
      {!authPanelCenter && (
        <div className="relative hidden w-0 flex-1 lg:block">
          <div className="absolute inset-0 size-full bg-background-deep dark:bg-[#070709]">
            <div className="login-background absolute top-0 left-0 size-full" />
            <div
              className={`mr-20 flex-col-center h-full ${
                authPanelLeft ? 'enter-x' : authPanelRight ? '-enter-x' : ''
              }`}
            >
              <Slogan alt={appName} className="h-64 w-2/5 animate-float" />
              <div className="text-1xl mt-6 font-sans text-foreground lg:text-2xl">
                {pageTitle}
              </div>
              <div className="mt-2 dark:text-muted-foreground">
                {pageDescription}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 中心认证面板 */}
      {authPanelCenter && (
        <div className="relative flex-center w-full">
          <div className="login-background absolute top-0 left-0 size-full" />
          <div className="w-full rounded-3xl pb-20 shadow-float shadow-primary/5 md:w-2/3 md:bg-background lg:w-1/2 xl:w-[36%]">
            <div className="relative flex-col-center bg-background px-6 py-10 dark:bg-background-deep">
              <AuthFormView side="bottom">
                <Outlet />
              </AuthFormView>
              <div className="absolute bottom-3 flex text-center text-xs text-muted-foreground">
                {copyright}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 右侧认证面板（默认） */}
      {authPanelRight && (
        <div className="relative flex-col-center bg-background px-6 py-10 lg:flex-initial lg:px-8 dark:bg-background-deep min-h-full w-2/5 flex-1">
          <AuthFormView side="right">
            <Outlet />
          </AuthFormView>
          <div className="absolute bottom-3 flex text-center text-xs text-muted-foreground">
            {copyright}
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthLayout;
