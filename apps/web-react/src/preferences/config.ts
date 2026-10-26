/**
 * 偏好设置默认配置 —— 与官方 @vben-core/preferences 1:1 对齐
 */

export type ThemeMode = 'light' | 'dark' | 'auto';
export type LayoutType =
  | 'sidebar-nav'
  | 'sidebar-mixed-nav'
  | 'header-nav'
  | 'header-sidebar-nav'
  | 'mixed-nav'
  | 'header-mixed-nav'
  | 'full-content';
export type BuiltinThemeType =
  | 'default'
  | 'violet'
  | 'pink'
  | 'rose'
  | 'sky-blue'
  | 'deep-blue'
  | 'green'
  | 'deep-green'
  | 'orange'
  | 'yellow'
  | 'zinc'
  | 'neutral'
  | 'slate'
  | 'gray'
  | 'custom';
export type ContentCompactType = 'wide' | 'compact';
export type BreadcrumbStyleType = 'normal' | 'background';
export type NavigationStyleType = 'plain' | 'rounded';
export type LayoutHeaderModeType = 'static' | 'fixed' | 'auto' | 'auto-scroll';
export type LayoutHeaderMenuAlignType = 'start' | 'center' | 'end';
export type PreferencesButtonPositionType =
  | 'auto'
  | 'header'
  | 'fixed'
  | 'user-dropdown';

export interface Preferences {
  app: {
    accessMode: 'frontend' | 'backend';
    authPageLayout: 'panel-left' | 'panel-center' | 'panel-right';
    colorGrayMode: boolean;
    colorWeakMode: boolean;
    contentCompact: ContentCompactType;
    contentCompactWidth: number;
    contentPadding: number;
    contentPaddingBottom: number;
    contentPaddingLeft: number;
    contentPaddingRight: number;
    contentPaddingTop: number;
    defaultAvatar: string;
    defaultHomePath: string;
    dynamicTitle: boolean;
    enableCheckUpdates: boolean;
    enableCopyPreferences: boolean;
    enablePreferences: boolean;
    enableStickyPreferencesNavigationBar: boolean;
    layout: LayoutType;
    locale: 'zh-CN' | 'en-US';
    name: string;
    preferencesButtonPosition: PreferencesButtonPositionType;
    timezone: string;
    watermark: boolean;
    watermarkContent: string;
    zIndex: number;
  };
  breadcrumb: {
    enable: boolean;
    hideOnlyOne: boolean;
    showHome: boolean;
    showIcon: boolean;
    styleType: BreadcrumbStyleType;
  };
  copyright: {
    companyName: string;
    companySiteLink: string;
    date: string;
    enable: boolean;
    icp: string;
    icpLink: string;
    settingShow: boolean;
  };
  footer: {
    enable: boolean;
    fixed: boolean;
    height: number;
  };
  header: {
    enable: boolean;
    height: number;
    hidden: boolean;
    menuAlign: LayoutHeaderMenuAlignType;
    mode: LayoutHeaderModeType;
  };
  logo: {
    enable: boolean;
    fit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    source: string;
    sourceDark: string;
  };
  navigation: {
    accordion: boolean;
    split: boolean;
    styleType: NavigationStyleType;
  };
  shortcutKeys: {
    enable: boolean;
    globalLockScreen: boolean;
    globalLogout: boolean;
    globalSearch: boolean;
  };
  sidebar: {
    autoActivateChild: boolean;
    collapsed: boolean;
    collapsedButton: boolean;
    collapsedShowTitle: boolean;
    collapseWidth: number;
    draggable: boolean;
    enable: boolean;
    expandOnHover: boolean;
    extraCollapse: boolean;
    extraCollapsedWidth: number;
    fixedButton: boolean;
    hidden: boolean;
    mixedWidth: number;
    width: number;
  };
  tabbar: {
    draggable: boolean;
    enable: boolean;
    height: number;
    keepAlive: boolean;
    maxCount: number;
    middleClickToClose: boolean;
    persist: boolean;
    showIcon: boolean;
    showMaximize: boolean;
    showMore: boolean;
    showRefresh: boolean;
    styleType: 'chrome' | 'button' | 'plain' | 'brisk';
    visitHistory: boolean;
    wheelable: boolean;
  };
  theme: {
    builtinType: BuiltinThemeType;
    colorDestructive: string;
    colorPrimary: string;
    colorSuccess: string;
    colorWarning: string;
    fontSize: number;
    mode: ThemeMode;
    radius: string;
    semiDarkHeader: boolean;
    semiDarkSidebar: boolean;
    semiDarkSidebarSub: boolean;
  };
  transition: {
    enable: boolean;
    loading: boolean;
    name: string;
    progress: boolean;
  };
  widget: {
    fullscreen: boolean;
    globalSearch: boolean;
    languageToggle: boolean;
    lockScreen: boolean;
    notification: boolean;
    refresh: boolean;
    sidebarToggle: boolean;
    themeToggle: boolean;
    timezone: boolean;
  };
}

export const defaultPreferences: Preferences = {
  app: {
    accessMode: 'frontend',
    authPageLayout: 'panel-right',
    colorGrayMode: false,
    colorWeakMode: false,
    contentCompact: 'wide',
    contentCompactWidth: 1200,
    contentPadding: 0,
    contentPaddingBottom: 0,
    contentPaddingLeft: 0,
    contentPaddingRight: 0,
    contentPaddingTop: 0,
    defaultAvatar:
      'https://unpkg.com/@vbenjs/static-source@0.1.7/source/avatar-v1.webp',
    defaultHomePath: '/analytics',
    dynamicTitle: true,
    enableCheckUpdates: true,
    enableCopyPreferences: true,
    enablePreferences: true,
    enableStickyPreferencesNavigationBar: true,
    layout: 'sidebar-nav',
    locale: 'zh-CN',
    name: 'Vben Admin',
    preferencesButtonPosition: 'auto',
    timezone: 'Asia/Shanghai',
    watermark: false,
    watermarkContent: '',
    zIndex: 200,
  },
  breadcrumb: {
    enable: true,
    hideOnlyOne: false,
    showHome: false,
    showIcon: true,
    styleType: 'normal',
  },
  copyright: {
    companyName: 'Vben',
    companySiteLink: 'https://www.vben.pro',
    date: '2024',
    enable: true,
    icp: '',
    icpLink: '',
    settingShow: true,
  },
  footer: {
    enable: false,
    fixed: false,
    height: 32,
  },
  header: {
    enable: true,
    height: 50,
    hidden: false,
    menuAlign: 'start',
    mode: 'fixed',
  },
  logo: {
    enable: true,
    fit: 'contain',
    source: 'https://unpkg.com/@vbenjs/static-source@0.1.7/source/logo-v1.webp',
    sourceDark:
      'https://unpkg.com/@vbenjs/static-source@0.1.7/source/logo-v1.webp',
  },
  navigation: {
    accordion: true,
    split: true,
    styleType: 'rounded',
  },
  shortcutKeys: {
    enable: true,
    globalLockScreen: true,
    globalLogout: true,
    globalSearch: true,
  },
  sidebar: {
    autoActivateChild: false,
    collapsed: false,
    collapsedButton: true,
    collapsedShowTitle: false,
    collapseWidth: 60,
    draggable: true,
    enable: true,
    expandOnHover: true,
    extraCollapse: false,
    extraCollapsedWidth: 60,
    fixedButton: true,
    hidden: false,
    mixedWidth: 80,
    width: 224,
  },
  tabbar: {
    draggable: true,
    enable: true,
    height: 38,
    keepAlive: true,
    maxCount: 0,
    middleClickToClose: false,
    persist: true,
    showIcon: true,
    showMaximize: true,
    showMore: true,
    showRefresh: true,
    styleType: 'chrome',
    visitHistory: true,
    wheelable: true,
  },
  theme: {
    builtinType: 'default',
    colorDestructive: 'hsl(348 100% 61%)',
    colorPrimary: 'hsl(212 100% 45%)',
    colorSuccess: 'hsl(144 57% 58%)',
    colorWarning: 'hsl(42 84% 61%)',
    fontSize: 16,
    mode: 'dark',
    radius: '0.5',
    semiDarkHeader: false,
    semiDarkSidebar: false,
    semiDarkSidebarSub: false,
  },
  transition: {
    enable: true,
    loading: true,
    name: 'fade-slide',
    progress: true,
  },
  widget: {
    fullscreen: true,
    globalSearch: true,
    languageToggle: true,
    lockScreen: true,
    notification: true,
    refresh: true,
    sidebarToggle: true,
    themeToggle: true,
    timezone: true,
  },
};

/** 内置主题预设 —— 与官方 BUILT_IN_THEME_PRESETS 对齐 */
export interface BuiltinThemePreset {
  type: BuiltinThemeType;
  color: string;
  primaryColor?: string;
  darkPrimaryColor?: string;
}

export const BUILT_IN_THEME_PRESETS: BuiltinThemePreset[] = [
  { type: 'default', color: 'hsl(212 100% 45%)' },
  { type: 'violet', color: 'hsl(245 82% 67%)' },
  { type: 'pink', color: 'hsl(347 77% 60%)' },
  { type: 'yellow', color: 'hsl(42 84% 61%)' },
  { type: 'sky-blue', color: 'hsl(231 98% 65%)' },
  { type: 'green', color: 'hsl(161 90% 43%)' },
  {
    type: 'zinc',
    color: 'hsl(240 5% 26%)',
    darkPrimaryColor: 'hsl(0 0% 98%)',
    primaryColor: 'hsl(240 5.9% 10%)',
  },
  { type: 'deep-green', color: 'hsl(181 84% 32%)' },
  { type: 'deep-blue', color: 'hsl(211 91% 39%)' },
  { type: 'orange', color: 'hsl(18 89% 40%)' },
  { type: 'rose', color: 'hsl(0 75% 42%)' },
  {
    type: 'neutral',
    color: 'hsl(0 0% 25%)',
    darkPrimaryColor: 'hsl(0 0% 98%)',
    primaryColor: 'hsl(240 5.9% 10%)',
  },
  {
    type: 'slate',
    color: 'hsl(215 25% 27%)',
    darkPrimaryColor: 'hsl(0 0% 98%)',
    primaryColor: 'hsl(240 5.9% 10%)',
  },
  {
    type: 'gray',
    color: 'hsl(217 19% 27%)',
    darkPrimaryColor: 'hsl(0 0% 98%)',
    primaryColor: 'hsl(240 5.9% 10%)',
  },
  { type: 'custom', color: '' },
];

/** web-antd 拓展偏好（与官方 overridesPreferences/extension 对齐） */
export interface WebReactPreferencesExtension {
  enableFormFullscreen: boolean;
  tenantMode: 'multi' | 'single';
  defaultTableSize: number;
  reportTitle: string;
}

export const defaultCustomPreferences: WebReactPreferencesExtension = {
  enableFormFullscreen: true,
  tenantMode: 'single',
  defaultTableSize: 20,
  reportTitle: '',
};
