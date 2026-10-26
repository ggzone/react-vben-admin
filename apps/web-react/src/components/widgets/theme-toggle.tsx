/**
 * 主题切换按钮 —— 与官方 theme-toggle/theme-button.vue 1:1 对齐
 * 含 View Transition 圆形扩散动画
 */
import { MoonStar, Sun, SunMoon } from 'lucide-react';

import { Button } from '#/components/ui/button';
import { cn } from '#/lib/utils';
import { usePreferencesStore } from '#/preferences/store';
import { isDarkTheme } from '#/preferences/update-css-variables';
import { $t } from '#/locales';

/** 主题切换按钮（icon 类型，带头部动画） */
export function ThemeButton({ type = 'icon' }: { type?: 'icon' | 'normal' }) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const isDark = isDarkTheme(preferences.theme.mode);
  const theme = isDark ? 'light' : 'dark';

  const isIconType = type === 'icon';
  const bindProps = isIconType
    ? {
        size: 'icon' as const,
        style: { padding: '7px' },
        variant: 'icon' as const,
      }
    : { variant: 'heavy' as const };

  function toggleTheme(event: React.MouseEvent) {
    const isAppearanceTransition =
      // @ts-expect-error - startViewTransition 类型未定义
      document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isAppearanceTransition || !event) {
      updatePreferences({ theme: { mode: isDark ? 'light' : 'dark' } });
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    );

    const transition = document.startViewTransition(async () => {
      updatePreferences({ theme: { mode: isDark ? 'light' : 'dark' } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      const animate = document.documentElement.animate(
        {
          clipPath: isDark ? ([...clipPath].reverse() as string[]) : clipPath,
        },
        {
          duration: 450,
          easing: 'ease-in',
          pseudoElement: isDark
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)',
        },
      );
      animate.onfinish = () => {
        transition.skipTransition();
      };
    });
  }

  return (
    <Button
      aria-label={theme}
      aria-live="polite"
      className={cn(
        'theme-toggle cursor-pointer border-none bg-none hover:animate-[shrink_0.3s_ease-in-out]',
        `is-${theme}`,
        isIconType && 'rounded-full',
      )}
      onClick={(e) => {
        e.stopPropagation();
        toggleTheme(e);
      }}
      {...bindProps}
    >
      <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
        <mask id="theme-toggle-moon" className="theme-toggle__moon">
          <rect fill="white" height="100%" width="100%" x="0" y="0" />
          <circle cx="40" cy="8" fill="black" r="11" />
        </mask>
        <circle
          id="sun"
          className="theme-toggle__sun fill-foreground/90"
          cx="12"
          cy="12"
          mask="url(#theme-toggle-moon)"
          r="11"
        />
        <g className="theme-toggle__sun-beams stroke-foreground/90 stroke-2">
          <line x1="12" x2="12" y1="1" y2="3" />
          <line x1="12" x2="12" y1="21" y2="23" />
          <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
          <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
          <line x1="1" x2="3" y1="12" y2="12" />
          <line x1="21" x2="23" y1="12" y2="12" />
          <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
          <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
        </g>
      </svg>
    </Button>
  );
}

/** 头部主题切换（hover 显示浅色/暗色/跟随系统选项） */
export function ThemeToggle({
  className,
  shouldOnHover = false,
}: {
  className?: string;
  shouldOnHover?: boolean;
}) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );

  const PRESETS = [
    { icon: Sun, name: 'light' as const, title: $t('preferences.theme.light') },
    {
      icon: MoonStar,
      name: 'dark' as const,
      title: $t('preferences.theme.dark'),
    },
    {
      icon: SunMoon,
      name: 'auto' as const,
      title: $t('preferences.followSystem'),
    },
  ];

  // 官方：<VbenTooltip :disabled="!shouldOnHover">，即头部（shouldOnHover=false）不弹任何面板
  if (!shouldOnHover) {
    return <div className={className}>{<ThemeButton type="icon" />}</div>;
  }

  // 偏好设置等处使用：hover 展开浅色/暗色/跟随系统（对齐官方 ToggleGroup）
  return (
    <div className={className}>
      <div className="group relative flex items-center">
        <ThemeButton type="icon" />
        <div className="absolute top-full right-0 hidden pt-1 group-hover:block">
          <div className="flex gap-2 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
            {PRESETS.map((item) => (
              <button
                key={item.name}
                className={`flex size-8 items-center justify-center rounded-md border ${
                  preferences.theme.mode === item.name
                    ? 'border-primary bg-accent'
                    : 'border-input hover:bg-accent'
                }`}
                title={item.title}
                onClick={(e) => {
                  e.stopPropagation();
                  updatePreferences({ theme: { mode: item.name } });
                }}
              >
                <item.icon className="size-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemeToggle;
