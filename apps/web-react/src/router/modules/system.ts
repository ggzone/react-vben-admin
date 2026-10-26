/**
 * 系统管理路由模块 —— 与 playground src/router/routes/modules/system.ts 1:1 对齐
 */
import { lazy } from 'react';

import { $t } from '#/locales';
import type { AppRoute } from '#/router/types';

const routes: AppRoute[] = [
  {
    meta: {
      icon: 'ion:settings-outline',
      order: 9997,
      title: $t('system.title'),
    },
    name: 'System',
    path: '/system',
    children: [
      {
        component: lazy(() => import('#/views/system/user/list')),
        meta: {
          icon: 'mdi:user',
          title: $t('system.user.title'),
        },
        name: 'SystemUser',
        path: '/system/user',
      },
      {
        component: lazy(() => import('#/views/system/role/list')),
        meta: {
          icon: 'mdi:account-group',
          title: $t('system.role.title'),
        },
        name: 'SystemRole',
        path: '/system/role',
      },
      {
        component: lazy(() => import('#/views/system/menu/list')),
        meta: {
          icon: 'mdi:menu',
          title: $t('system.menu.title'),
        },
        name: 'SystemMenu',
        path: '/system/menu',
      },
      {
        component: lazy(() => import('#/views/system/dept/list')),
        meta: {
          icon: 'charm:organisation',
          title: $t('system.dept.title'),
        },
        name: 'SystemDept',
        path: '/system/dept',
      },
    ],
  },
];

export default routes;
