/**
 * iconify 图标集离线注册
 *
 * 官方 Vue 端用 @iconify/vue 在运行时向 api.iconify.design 按需拉取图标集；
 * 本机外网并不稳定（实测 3 次请求里有 1 次 12s 超时），表现为侧边栏/菜单图标偶发空白，
 * 并让截图对比在 0.8% ~ 5.8% 之间抖动（03-workspace-dark 复现过）。
 *
 * 这里在应用启动前把前端实际用到的图标集整包注册进 iconify 本地存储：
 * 渲染确定、零网络依赖，视觉结果与在线拉取完全一致。
 */
import { addCollection } from '@iconify/react';

import bx from '@iconify-json/bx/icons.json';
import carbon from '@iconify-json/carbon/icons.json';
import charm from '@iconify-json/charm/icons.json';
import ep from '@iconify-json/ep/icons.json';
import fluentMdl2 from '@iconify-json/fluent-mdl2/icons.json';
import ic from '@iconify-json/ic/icons.json';
import ion from '@iconify-json/ion/icons.json';
import logos from '@iconify-json/logos/icons.json';
import lucide from '@iconify-json/lucide/icons.json';
import mdi from '@iconify-json/mdi/icons.json';

const COLLECTIONS = [
  lucide,
  carbon,
  mdi,
  ep,
  ic,
  ion,
  bx,
  charm,
  fluentMdl2,
  logos,
];

for (const collection of COLLECTIONS) {
  addCollection(collection as Parameters<typeof addCollection>[0]);
}
