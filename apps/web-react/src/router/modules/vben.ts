/**
 * Vben 项目路由模块 —— 与官方 apps/web-antd/src/router/routes/modules/vben.ts 1:1 对齐
 */
import { lazy } from 'react';

import {
  VBEN_ANTDV_NEXT_PREVIEW_URL,
  VBEN_DOC_URL,
  VBEN_ELE_PREVIEW_URL,
  VBEN_GITHUB_URL,
  VBEN_LOGO_URL,
  VBEN_NAIVE_PREVIEW_URL,
  VBEN_TD_PREVIEW_URL,
} from '#/constants';
import { $t } from '#/locales';
import type { AppRoute } from '#/router/types';

const IFrameView = lazy(() => import('#/layouts/iframe'));

const routes: AppRoute[] = [
  {
    meta: {
      badgeType: 'dot',
      icon: VBEN_LOGO_URL,
      order: 9998,
      title: $t('demos.vben.title'),
    },
    name: 'VbenProject',
    path: '/vben-admin',
    children: [
      {
        component: IFrameView,
        meta: {
          icon: 'lucide:book-open-text',
          link: VBEN_DOC_URL,
          title: $t('demos.vben.document'),
        },
        name: 'VbenDocument',
        path: '/vben-admin/document',
      },
      {
        component: IFrameView,
        meta: {
          icon: 'mdi:github',
          link: VBEN_GITHUB_URL,
          title: 'Github',
        },
        name: 'VbenGithub',
        path: '/vben-admin/github',
      },
      {
        component: IFrameView,
        meta: {
          badgeType: 'dot',
          icon: 'logos:ant-design-vue',
          link: VBEN_ANTDV_NEXT_PREVIEW_URL,
          title: $t('demos.vben.antdv-next'),
        },
        name: 'VbenAntdVNext',
        path: '/vben-admin/antdv-next',
      },
      {
        component: IFrameView,
        meta: {
          badgeType: 'dot',
          icon: 'logos:naiveui',
          link: VBEN_NAIVE_PREVIEW_URL,
          title: $t('demos.vben.naive-ui'),
        },
        name: 'VbenNaive',
        path: '/vben-admin/naive',
      },
      {
        component: IFrameView,
        meta: {
          badgeType: 'dot',
          icon: 'logos:tdesign',
          link: VBEN_TD_PREVIEW_URL,
          title: $t('demos.vben.tdesign'),
        },
        name: 'VbenTDesign',
        path: '/vben-admin/tdesign',
      },
      {
        component: IFrameView,
        meta: {
          badgeType: 'dot',
          icon: 'logos:element',
          link: VBEN_ELE_PREVIEW_URL,
          title: $t('demos.vben.element-plus'),
        },
        name: 'VbenElementPlus',
        path: '/vben-admin/ele',
      },
    ],
  },
  {
    component: lazy(() => import('#/views/_core/about')),
    meta: {
      icon: 'lucide:copyright',
      order: 9999,
      title: $t('demos.vben.about'),
    },
    name: 'VbenAbout',
    path: '/vben-admin/about',
  },
  {
    component: lazy(() => import('#/views/_core/profile')),
    meta: {
      hideInMenu: true,
      icon: 'lucide:user',
      title: $t('page.auth.profile'),
    },
    name: 'Profile',
    path: '/profile',
  },
];

export default routes;
