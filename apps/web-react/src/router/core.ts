/**
 * 核心路由 —— 与官方 apps/web-antd/src/router/routes/core.ts 1:1 对齐
 */
import { lazy } from 'react';

import { LOGIN_PATH } from '#/constants';
import { $t } from '#/locales';
import { defaultPreferences } from '#/preferences/config';
import type { AppRoute } from '#/router/types';

const BasicLayout = lazy(() => import('#/layouts/basic'));
const AuthPageLayout = lazy(() => import('#/layouts/auth'));

/** 全局404页面 */
const fallbackNotFoundRoute: AppRoute = {
  component: lazy(() => import('#/views/_core/fallback/not-found')),
  meta: {
    hideInBreadcrumb: true,
    hideInMenu: true,
    hideInTab: true,
    title: '404',
  },
  name: 'FallbackNotFound',
  path: '*',
};

/** 基本路由，这些路由是必须存在的 */
const coreRoutes: AppRoute[] = [
  {
    component: BasicLayout,
    meta: {
      hideInBreadcrumb: true,
      title: 'Root',
    },
    name: 'Root',
    path: '/',
    redirect: defaultPreferences.app.defaultHomePath,
    children: [],
  },
  {
    component: AuthPageLayout,
    meta: {
      hideInTab: true,
      title: 'Authentication',
    },
    name: 'Authentication',
    path: '/auth',
    redirect: LOGIN_PATH,
    children: [
      {
        component: lazy(() => import('#/views/_core/authentication/login')),
        meta: { title: $t('page.auth.login') },
        name: 'Login',
        path: 'login',
      },
      {
        component: lazy(
          () => import('#/views/_core/authentication/code-login'),
        ),
        meta: { title: $t('page.auth.codeLogin') },
        name: 'CodeLogin',
        path: 'code-login',
      },
      {
        component: lazy(
          () => import('#/views/_core/authentication/qrcode-login'),
        ),
        meta: { title: $t('page.auth.qrcodeLogin') },
        name: 'QrCodeLogin',
        path: 'qrcode-login',
      },
      {
        component: lazy(
          () => import('#/views/_core/authentication/forget-password'),
        ),
        meta: { title: $t('page.auth.forgetPassword') },
        name: 'ForgetPassword',
        path: 'forget-password',
      },
      {
        component: lazy(() => import('#/views/_core/authentication/register')),
        meta: { title: $t('page.auth.register') },
        name: 'Register',
        path: 'register',
      },
    ],
  },
];

export { coreRoutes, fallbackNotFoundRoute };
