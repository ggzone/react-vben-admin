/**
 * 应用入口 —— 与官方 apps/web-antd/src/main.ts 初始化流程 1:1 对齐
 *
 * 1. 初始化偏好设置（namespace 隔离）
 * 2. 初始化 stores 命名空间
 * 3. 设置语言
 * 4. 挂载 React 应用
 * 5. 移除全局 loading
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { setAccessNamespace } from './stores/access';
import { usePreferencesStore } from './preferences/store';
import { setLocale } from './locales';
import './assets/index.css';
import './assets/nprogress.css';
// 注册 svg: 前缀自定义图标（对齐官方 packages/icons/src/svg/load.ts）
import './lib/svg-icons';
// 离线注册 iconify 图标集（避免运行时拉取 api.iconify.design 造成的图标空白/截图抖动）
import './lib/iconify-offline';

/** 命名空间：与官方 `${VITE_APP_NAMESPACE}-${version}-${env}` 一致 */
const appVersion = import.meta.env.VITE_APP_VERSION ?? '5.7.0';
const env = import.meta.env.PROD ? 'prod' : 'dev';
const namespace = `${import.meta.env.VITE_APP_NAMESPACE ?? 'vben-web-react'}-${appVersion}-${env}`;

async function initApplication() {
  // app 偏好设置初始化
  await usePreferencesStore.getState().initPreferences({
    namespace,
    overrides: {
      app: {
        name: import.meta.env.VITE_APP_TITLE ?? 'Vben Admin',
      },
    },
  });

  // stores 命名空间（与官方 initStores({ namespace }) 对齐，内部会重新加载 token）
  setAccessNamespace(namespace);

  // 语言初始化
  setLocale(usePreferencesStore.getState().preferences.app.locale);

  // 挂载应用
  const root = createRoot(document.getElementById('app')!);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // 移除全局 loading（对齐官方 unmountGlobalLoading）
  const loading = document.querySelector('.app-loading');
  if (loading) {
    loading.remove();
  }
}

void initApplication();
