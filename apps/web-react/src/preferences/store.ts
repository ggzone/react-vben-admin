/**
 * 偏好设置 Store —— 与官方 PreferenceManager 1:1 对齐
 * zustand 实现，localStorage 持久化，CSS 变量同步更新
 */
import { create } from 'zustand';

import { merge } from '#/lib/merge';
import { StorageManager } from '#/lib/storage';
import {
  BUILT_IN_THEME_PRESETS,
  defaultCustomPreferences,
  defaultPreferences,
  type Preferences,
  type WebReactPreferencesExtension,
} from '#/preferences/config';
import { updateThemeCSSVariables } from '#/preferences/update-css-variables';

const STORAGE_KEYS = {
  CUSTOM: 'preferences-custom',
  MAIN: 'preferences',
  LOCALE: 'preferences-locale',
  THEME: 'preferences-theme',
} as const;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

interface PreferencesState {
  /** 当前偏好设置 */
  preferences: Preferences;
  /** 拓展偏好设置 */
  customPreferences: Partial<WebReactPreferencesExtension>;
  /** 初始化偏好设置 */
  initialPreferences: Preferences;
  /** 初始化拓展偏好设置 */
  initialCustomPreferences: WebReactPreferencesExtension;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 命名空间 */
  namespace: string;

  /** 初始化偏好设置 */
  initPreferences: (options: {
    namespace: string;
    overrides?: DeepPartial<Preferences>;
  }) => Promise<void>;
  /** 更新偏好设置 */
  updatePreferences: (updates: DeepPartial<Preferences>) => void;
  /** 更新拓展偏好设置（对齐官方 updateCustomPreferences） */
  updateCustomPreferences: (
    updates: Partial<WebReactPreferencesExtension>,
  ) => void;
  /** 重置偏好设置 */
  resetPreferences: () => Promise<void>;
  /** 清除缓存 */
  clearCache: () => Promise<void>;
}

let cache: StorageManager = new StorageManager();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function isMacOs() {
  return (
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  );
}

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveToCache();
  }, 150);
}

async function saveToCache() {
  const state = usePreferencesStore.getState();
  try {
    await cache.setItem(STORAGE_KEYS.MAIN, state.preferences);
    await cache.setItem(STORAGE_KEYS.LOCALE, state.preferences.app.locale);
    await cache.setItem(STORAGE_KEYS.THEME, state.preferences.theme.mode);
    await cache.setItem(STORAGE_KEYS.CUSTOM, { ...state.customPreferences });
  } catch (error) {
    console.error('Failed to save preferences to cache:', error);
  }
}

/**
 * 处理更新（CSS 变量 / 颜色模式）
 */
function handleUpdates(
  state: PreferencesState,
  updates: DeepPartial<Preferences>,
) {
  const { theme, app } = updates;

  if (theme && Object.keys(theme).length > 0) {
    updateThemeCSSVariables(state.preferences);
  }

  if (app && ('colorGrayMode' in app || 'colorWeakMode' in app)) {
    const { colorGrayMode, colorWeakMode } = state.preferences.app;
    const dom = document.documentElement;
    dom.classList.toggle('invert-mode', !!colorWeakMode);
    dom.classList.toggle('grayscale-mode', !!colorGrayMode);
  }
}

export const usePreferencesStore = create<PreferencesState>()((set, get) => ({
  customPreferences: {},
  initialCustomPreferences: defaultCustomPreferences,
  initialPreferences: defaultPreferences,
  isInitialized: false,
  namespace: '',
  preferences: { ...defaultPreferences },

  clearCache: async () => {
    await Promise.all(
      Object.values(STORAGE_KEYS).map((key) => cache.removeItem(key)),
    );
  },

  initPreferences: async ({ namespace, overrides }) => {
    const state = get();
    if (state.isInitialized) return;

    cache = new StorageManager({ prefix: namespace });

    // 合并初始偏好设置：前面的对象优先，后面的对象仅补齐缺失字段
    const initialPreferences = merge(
      {},
      overrides ?? {},
      defaultPreferences,
    ) as unknown as Preferences;

    // 加载缓存的偏好设置，并仅用缓存补齐初始化配置中未显式设置的字段
    const cachedPreferences =
      (await cache.getItem<DeepPartial<Preferences>>(STORAGE_KEYS.MAIN)) || {};
    const mergedPreference = merge(
      {},
      initialPreferences,
      cachedPreferences,
    ) as unknown as Preferences;

    // 拓展偏好
    const cachedCustom =
      (await cache.getItem<Partial<WebReactPreferencesExtension>>(
        STORAGE_KEYS.CUSTOM,
      )) || {};
    const customPreferences = merge(
      {},
      cachedCustom,
      defaultCustomPreferences,
    ) as unknown as WebReactPreferencesExtension;

    set({
      customPreferences,
      initialCustomPreferences: defaultCustomPreferences,
      initialPreferences,
      isInitialized: true,
      namespace,
      preferences: mergedPreference,
    });

    await saveToCache();

    // 应用 CSS 变量
    updateThemeCSSVariables(mergedPreference);

    // 初始化平台标识
    document.documentElement.dataset.platform = isMacOs() ? 'macOs' : 'window';

    // 监听系统主题变化
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', ({ matches: isDark }) => {
        const { preferences } = get();
        if (preferences.theme.mode === 'auto') {
          get().updatePreferences({
            theme: { mode: isDark ? 'dark' : 'light' },
          });
          get().updatePreferences({ theme: { mode: 'auto' } });
        }
      });

    // 监听断点（移动端）
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const onBreakpointChange = (e: MediaQueryListEvent) => {
      get().updatePreferences({ app: { isMobile: e.matches } as never });
    };
    mediaQuery.addEventListener('change', onBreakpointChange);
  },

  resetPreferences: async () => {
    const state = get();
    set({
      preferences: { ...state.initialPreferences },
      customPreferences: { ...state.initialCustomPreferences },
    });
    await saveToCache();
    handleUpdates(get(), get().preferences as DeepPartial<Preferences>);
  },

  updatePreferences: (updates) => {
    const state = get();
    const mergedState = merge(
      {},
      updates,
      state.preferences,
    ) as unknown as Preferences;
    set({ preferences: mergedState });
    handleUpdates(get(), updates);
    debouncedSave();
  },

  updateCustomPreferences: (updates) => {
    set({ customPreferences: { ...get().customPreferences, ...updates } });
    debouncedSave();
  },
}));

/** 便捷 hooks —— 与官方 usePreferences 对齐 */
export function usePreferences() {
  return usePreferencesStore((state) => state.preferences);
}

export function usePreferenceActions() {
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const resetPreferences = usePreferencesStore(
    (state) => state.resetPreferences,
  );
  const initPreferences = usePreferencesStore((state) => state.initPreferences);
  const clearCache = usePreferencesStore((state) => state.clearCache);
  return { clearCache, initPreferences, resetPreferences, updatePreferences };
}

/** 主题模式切换（与官方 theme-toggle 逻辑一致） */
export function toggleDarkMode() {
  const { preferences, updatePreferences } = usePreferencesStore.getState();
  const isDark = document.documentElement.classList.contains('dark');
  updatePreferences({ theme: { mode: isDark ? 'light' : 'dark' } });
  void preferences;
}

/** 获取当前内置主题的主色（与官方 getBuiltinThemeColor 逻辑一致） */
export function getBuiltinThemeColor(
  type: Preferences['theme']['builtinType'],
  isDark: boolean,
) {
  const preset = BUILT_IN_THEME_PRESETS.find((item) => item.type === type);
  if (!preset) return defaultPreferences.theme.colorPrimary;
  const color = isDark
    ? preset.darkPrimaryColor || preset.primaryColor
    : preset.primaryColor;
  return color || preset.color;
}

export { STORAGE_KEYS };
