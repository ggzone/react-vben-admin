import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

import { viteMockPlugin } from './vite-mock/index';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss(), viteMockPlugin()],
    resolve: {
      alias: {
        '#': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5667,
      host: true,
      // 系统管理接口走 backend-mock（与 playground 同一数据源，保证两端数据一致）
      proxy: {
        '/api/system': {
          changeOrigin: true,
          target: 'http://localhost:5320',
        },
      },
    },
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
