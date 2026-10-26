/**
 * Demos 路由模块 —— 与官方 apps/web-antd/src/router/routes/modules/demos.ts 1:1 对齐
 */
import { lazy } from 'react';

import { $t } from '#/locales';
import type { AppRoute } from '#/router/types';

const routes: AppRoute[] = [
  {
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 1000,
      title: $t('demos.title'),
    },
    name: 'Demos',
    path: '/demos',
    children: [
      {
        component: lazy(() => import('#/views/demos/antd')),
        meta: {
          title: $t('demos.antd'),
        },
        name: 'AntDesignDemos',
        path: '/demos/ant-design',
      },
    ],
  },
];

export default routes;
