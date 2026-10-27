import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

import { viteMockPlugin } from './vite-mock/index';

export default defineConfig(({ mode }) => {
  // 后端切换开关：
  // - 未设置 VITE_API_TARGET：沿用内置 vite-mock 插件（默认开发态，无需外部服务）
  // - 设置 VITE_API_TARGET（如 http://127.0.0.1:5330）：停用内置 mock，全部 /api 代理到真实后端
  const apiTarget = process.env.VITE_API_TARGET;
  console.log('[vite-config] VITE_API_TARGET =', JSON.stringify(apiTarget));
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(apiTarget ? [] : [viteMockPlugin()]),
    ],
    resolve: {
      alias: {
        '#': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5667,
      host: true,
      // 系统管理接口走 backend-mock（与 playground 同一数据源，保证两端数据一致）
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
