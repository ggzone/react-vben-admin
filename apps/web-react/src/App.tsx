/**
 * 应用根组件 —— 挂载路由，注入导航引用（对齐官方 router + bootstrap 装配）
 */
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { router } from '#/router';
import { setAuthRouter } from '#/stores/auth';
import { setTabbarRouter } from '#/stores/tabbar';

export default function App() {
  useEffect(() => {
    // 通过订阅路由状态保持当前路径最新（对齐官方 router.currentRoute）
    let currentPath = `${window.location.pathname}${window.location.search}`;
    const unsubscribe = router.subscribe((state) => {
      currentPath = `${state.location.pathname}${state.location.search}`;
    });

    const getCurrentPath = () => currentPath;

    setAuthRouter((to, options) => {
      void router.navigate(to, options);
    }, getCurrentPath);

    setTabbarRouter(
      (to, options) => {
        void router.navigate(to, options);
      },
      (to) => {
        // 解析 href（对齐官方 router.resolve）
        const path = typeof to === 'string' ? to : (to?.path ?? '/');
        try {
          return new URL(path, window.location.href).href;
        } catch {
          return path;
        }
      },
      getCurrentPath,
    );

    return unsubscribe;
  }, []);

  return <RouterProvider router={router} />;
}
