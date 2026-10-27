import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

import { viteMockPlugin } from './vite-mock/index';

export default defineConfig(({ mode }) => {
  // 后端选择：
  // - 默认：backend-rust（http://127.0.0.1:5330）—— 本项目 React 版固定与 rust 后端搭配
  // - VITE_API_TARGET=<url>：改用指定的其他后端
  // - VITE_API_TARGET=off：停用代理、启用内置 vite-mock（仅用于无后端时看静态页面；
  //   该模式权限码只有 AC_* 演示码，不含 system:*:list，系统管理菜单不可见，属预期）
  const rawTarget = process.env.VITE_API_TARGET;
  const apiTarget =
    rawTarget === 'off' ? undefined : rawTarget || 'http://127.0.0.1:5330';
  console.log(
    '[vite-config] VITE_API_TARGET =',
    JSON.stringify(apiTarget ?? 'off'),
  );
  return {
    plugins: [react(), tailwindcss(), ...(apiTarget ? [] : [viteMockPlugin()])],
    resolve: {
      alias: {
        '#': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5667,
      host: true,
      proxy: apiTarget
        ? {
            '/api': {
              changeOrigin: true,
              target: apiTarget,
            },
          }
        : {
            '/api/system': {
              changeOrigin: true,
              target: 'http://localhost:5320',
            },
          },
    },
    // 两种模式各用独立依赖预构建缓存：切后端时不互相触发全量 re-optimize，
    // 也避免 Vite 去整目录删除 node_modules/.vite/deps
    cacheDir: apiTarget ? 'node_modules/.vite-rust-api' : 'node_modules/.vite',
    preview: {
      port: 5667,
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify('5.7.0'),
      // 对齐官方 vite inject-metadata 插件注入的 __VBEN_ADMIN_METADATA__.buildTime
      'import.meta.env.VITE_APP_BUILD_TIME': JSON.stringify(
        new Date().toLocaleString('zh-CN', { hour12: false }),
      ),
    },
    envPrefix: 'VITE_',
  };
});
