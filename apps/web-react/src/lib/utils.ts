import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isHttpUrl(str: string) {
  return /^https?:\/\//.test(str);
}

export function isWindowsOs() {
  return (
    typeof navigator !== 'undefined' &&
    /win32|win64|windows|windows nt/i.test(navigator.userAgent)
  );
}

/** window.open 的 features 参数（对齐官方 WindowFeatures 类型） */
export type WindowFeatures = string | Record<string, string | number | boolean>;

export function openWindow(url: string, options?: WindowFeatures) {
  let features: string | undefined;
  if (typeof options === 'string') {
    features = options;
  } else if (options && typeof options === 'object') {
    features = Object.entries(options)
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
  }
  window.open(url, '_blank', features);
}
