/**
 * Dashboard 路由模块 —— 与官方 apps/web-antd/src/router/routes/modules/dashboard.ts 1:1 对齐
 */
import { lazy } from 'react';

import { $t } from '#/locales';
import type { AppRoute } from '#/router/types';

const routes: AppRoute[] = [
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: $t('page.dashboard.title'),
    },
    name: 'Dashboard',
    path: '/dashboard',
    children: [
      {
        component: lazy(() => import('#/views/dashboard/analytics')),
        meta: {
          affixTab: true,
          icon: 'lucide:area-chart',
          title: $t('page.dashboard.analytics'),
        },
        name: 'Analytics',
        path: '/analytics',
      },
      {
        component: lazy(() => import('#/views/dashboard/workspace')),
        meta: {
          icon: 'carbon:workspace',
          title: $t('page.dashboard.workspace'),
        },
        name: 'Workspace',
        path: '/workspace',
      },
    ],
  },
];

export default routes;
