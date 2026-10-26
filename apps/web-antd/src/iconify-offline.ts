/**
 * iconify 图标集离线注册（仅用于本地截图对比的确定性渲染）
 *
 * 官方 Vue 端用 @iconify/vue 在运行时向 api.iconify.design 按需拉取图标；
 * 本机外网不稳定（实测 3 次请求 1 次超时），导致工作台项目图标等偶发缺失，
 * 让双端像素对比产生非实现性抖动。这里把前端用到的图标集整包注册进本地存储，
 * 渲染结果与"网络良好时的官方在线渲染"一致。
 */
import { addCollection } from '@iconify/vue';

import bx from '@iconify-json/bx/icons.json';
import carbon from '@iconify-json/carbon/icons.json';
import ep from '@iconify-json/ep/icons.json';
import fluentMdl2 from '@iconify-json/fluent-mdl2/icons.json';
import ic from '@iconify-json/ic/icons.json';
import ion from '@iconify-json/ion/icons.json';
import logos from '@iconify-json/logos/icons.json';
import lucide from '@iconify-json/lucide/icons.json';
import mdi from '@iconify-json/mdi/icons.json';

const COLLECTIONS = [lucide, carbon, mdi, ep, ic, ion, bx, fluentMdl2, logos];

for (const collection of COLLECTIONS) {
  addCollection(collection as Parameters<typeof addCollection>[0]);
}
