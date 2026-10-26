/**
 * 常量 —— 与官方 @vben/constants 1:1 对齐
 */

/** @zh_CN 登录页面 url 地址 */
export const LOGIN_PATH = '/auth/login';

export interface LanguageOption {
  label: string;
  value: 'en-US' | 'zh-CN';
}

/** 支持的语言 */
export const SUPPORT_LANGUAGES: LanguageOption[] = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
];

export interface TimezoneOption {
  label: string;
  offset: number;
  timezone: string;
}

/**
 * 时区选项 —— 与官方 packages/@core/preferences/src/constants.ts 的
 * DEFAULT_TIME_ZONE_OPTIONS 1:1 对齐（label 带 GMT 偏移，供时区弹窗与偏好设置共用）
 */
export const DEFAULT_TIME_ZONE_OPTIONS: TimezoneOption[] = [
  {
    label: 'America/New_York(GMT-5)',
    offset: -5,
    timezone: 'America/New_York',
  },
  { label: 'Europe/London(GMT0)', offset: 0, timezone: 'Europe/London' },
  { label: 'Asia/Shanghai(GMT+8)', offset: 8, timezone: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo(GMT+9)', offset: 9, timezone: 'Asia/Tokyo' },
  { label: 'Asia/Seoul(GMT+9)', offset: 9, timezone: 'Asia/Seoul' },
];

/** 时区选项的 {label,value} 形态（官方 timezoneStore.getTimezoneOptions() 的返回结构） */
export const TIMEZONE_SELECT_ITEMS = DEFAULT_TIME_ZONE_OPTIONS.map((item) => ({
  label: item.label,
  value: item.timezone,
}));

/** @zh_CN GITHUB 仓库地址 */
export const VBEN_GITHUB_URL = 'https://github.com/vbenjs/vue-vben-admin';

/** @zh_CN 文档地址 */
export const VBEN_DOC_URL = 'https://doc.vben.pro';

/** @zh_CN Vben Logo */
export const VBEN_LOGO_URL =
  'https://unpkg.com/@vbenjs/static-source@0.1.7/source/logo-v1.webp';

/** @zh_CN Vben Admin 首页地址 */
export const VBEN_PREVIEW_URL = 'https://www.vben.pro';

export const VBEN_ANTDV_NEXT_PREVIEW_URL = 'https://antdv-next.vben.pro';

export const VBEN_ELE_PREVIEW_URL = 'https://ele.vben.pro';

export const VBEN_NAIVE_PREVIEW_URL = 'https://naive.vben.pro';

export const VBEN_ANT_PREVIEW_URL = 'https://ant.vben.pro';

export const VBEN_TD_PREVIEW_URL = 'https://tdesign.vben.pro';
