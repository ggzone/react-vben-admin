/**
 * 国际化 —— 与官方 @vben/locales 结构对齐（按文件名作为一级命名空间）
 */
import { useEffect, useState } from 'react';

import authenticationEn from './langs/en-US/authentication.json';
import commonEn from './langs/en-US/common.json';
import demosEn from './langs/en-US/demos.json';
import pageEn from './langs/en-US/page.json';
import preferencesEn from './langs/en-US/preferences.json';
import profileEn from './langs/en-US/profile.json';
import systemEn from './langs/en-US/system.json';
import uiEn from './langs/en-US/ui.json';
import authenticationZh from './langs/zh-CN/authentication.json';
import commonZh from './langs/zh-CN/common.json';
import demosZh from './langs/zh-CN/demos.json';
import pageZh from './langs/zh-CN/page.json';
import preferencesZh from './langs/zh-CN/preferences.json';
import profileZh from './langs/zh-CN/profile.json';
import systemZh from './langs/zh-CN/system.json';
import uiZh from './langs/zh-CN/ui.json';

export type SupportedLanguagesType = 'en-US' | 'zh-CN';

type Messages = Record<string, unknown>;

const messagesMap: Record<SupportedLanguagesType, Messages> = {
  'en-US': {
    authentication: authenticationEn,
    common: commonEn,
    demos: demosEn,
    page: pageEn,
    preferences: preferencesEn,
    profile: profileEn,
    system: systemEn,
    ui: uiEn,
  },
  'zh-CN': {
    authentication: authenticationZh,
    common: commonZh,
    demos: demosZh,
    page: pageZh,
    preferences: preferencesZh,
    profile: profileZh,
    system: systemZh,
    ui: uiZh,
  },
};

let currentLocale: SupportedLanguagesType = 'zh-CN';

function getNestedValue(obj: Messages, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Messages)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function format(template: string, ...args: unknown[]): string {
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const arg = args[Number(index)];
    return arg === undefined ? match : String(arg);
  });
}

/** 翻译函数，与官方 $t 行为对齐 */
export function $t(key: string, ...args: unknown[]): string {
  const messages = messagesMap[currentLocale];
  const value = getNestedValue(messages, key);
  if (typeof value === 'string') {
    return format(value, ...args);
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return key;
}

export function setLocale(locale: SupportedLanguagesType) {
  currentLocale = locale;
  // 触发所有订阅者更新
  localeListeners.forEach((listener) => listener(locale));
}

export function getLocale(): SupportedLanguagesType {
  return currentLocale;
}

const localeListeners = new Set<(locale: SupportedLanguagesType) => void>();

export function useLocale() {
  const [locale, setLocaleState] =
    useState<SupportedLanguagesType>(currentLocale);
  useEffect(() => {
    const listener = (next: SupportedLanguagesType) => setLocaleState(next);
    localeListeners.add(listener);
    return () => {
      localeListeners.delete(listener);
    };
  }, []);
  return locale;
}

/** 切换语言 */
export function toggleLocale(locale?: SupportedLanguagesType) {
  const next: SupportedLanguagesType =
    locale ?? (currentLocale === 'zh-CN' ? 'en-US' : 'zh-CN');
  setLocale(next);
  return next;
}

export { messagesMap };
