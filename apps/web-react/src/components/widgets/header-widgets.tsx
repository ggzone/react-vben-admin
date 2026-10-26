/**
 * 头部小部件 —— 与官方 layouts/widgets 1:1 对齐
 *
 * 官方实现均以 VbenIconButton（= Button variant="icon" size="icon" + rounded-full）为基座，
 * 图标统一 `size-4 text-foreground`，hover 带 `animate-[shrink_0.3s_ease-in-out]`。
 *
 * 对应源码：
 * - packages/effects/layouts/src/widgets/language-toggle.vue
 * - packages/@core/ui-kit/shadcn-ui/src/components/full-screen/full-screen.vue
 * - packages/effects/layouts/src/basic/header/header.vue（refresh 插槽）
 */
import { useState } from 'react';
import { Check, Languages, Maximize, Minimize, RotateCw } from 'lucide-react';

import { IconButton } from '#/components/ui/icon-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { SUPPORT_LANGUAGES } from '#/constants';
import { cn } from '#/lib/utils';
import { setLocale, type SupportedLanguagesType } from '#/locales';
import { usePreferencesStore } from '#/preferences/store';
import { useTabbarStore } from '#/stores/tabbar';

/**
 * 语言切换 —— 对齐官方 VbenDropdownRadioMenu（单选态，选中项带勾选标记）
 */
export function LanguageToggle({ className }: { className?: string }) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );

  function handleUpdate(value: SupportedLanguagesType) {
    updatePreferences({ app: { locale: value } });
    setLocale(value);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          className={cn('hover:animate-[shrink_0.3s_ease-in-out]', className)}
        >
          <Languages className="size-4 text-foreground" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-30">
        {SUPPORT_LANGUAGES.map((item) => (
          <button
            key={item.value}
            className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            type="button"
            onClick={() => handleUpdate(item.value)}
          >
            <span>{item.label}</span>
            {preferences.app.locale === item.value && (
              <span className="absolute right-2 flex size-3.5 items-center justify-center">
                <Check className="size-4" />
              </span>
            )}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 全屏切换 —— 对齐官方 full-screen.vue（useFullscreen），图标 Minimize/Maximize size-4 text-foreground */
export function FullscreenButton({ className }: { className?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(
    () => !!document.fullscreenElement,
  );

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // 浏览器拒绝全屏时不抛出，保持状态与 document 一致
      setIsFullscreen(!!document.fullscreenElement);
    }
  }

  return (
    <IconButton
      className={cn('hover:animate-[shrink_0.3s_ease-in-out]', className)}
      onClick={(e) => {
        e.stopPropagation();
        void toggleFullscreen();
      }}
    >
      {isFullscreen ? (
        <Minimize className="size-4 text-foreground" />
      ) : (
        <Maximize className="size-4 text-foreground" />
      )}
    </IconButton>
  );
}

/** 刷新按钮 —— 对齐官方 header.vue refresh 插槽（rounded-md 覆盖 rounded-full） */
export function RefreshButton({ className }: { className?: string }) {
  const refresh = useTabbarStore((state) => state.refresh);
  return (
    <IconButton
      className={cn('my-0 mr-1 rounded-md', className)}
      onClick={(e) => {
        e.stopPropagation();
        refresh();
      }}
    >
      <RotateCw className="size-4" />
    </IconButton>
  );
}

export { SUPPORT_LANGUAGES } from '#/constants';
