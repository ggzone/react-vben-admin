/**
 * 偏好设置抽屉子块 —— 与官方 preferences/blocks 1:1 对齐
 * 包含 PreferenceBlock / SwitchItem / ToggleItem / SelectItem / InputItem /
 * NumberFieldItem / CheckboxItem 及各配置块（主题/布局/侧边栏/头部/导航/面包屑/
 * 标签栏/部件/页脚/版权/通用/动画/快捷键）
 */
import { useMemo, useState } from 'react';
import {
  Circle,
  CircleCheckBig,
  CircleHelp,
  CircleX,
  Minus,
  MoonStar,
  Plus,
  Sun,
  SunMoon,
  UserRoundPen,
} from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Button } from '#/components/ui/button';
import { Switch } from '#/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { Input } from '#/components/ui/input';
import { TIMEZONE_SELECT_ITEMS, SUPPORT_LANGUAGES } from '#/constants';
import { cn } from '#/lib/utils';
import { isWindowsOs } from '#/lib/utils';
import { $t } from '#/locales';
import {
  BUILT_IN_THEME_PRESETS,
  type BuiltinThemeType,
  type LayoutType,
} from '#/preferences/config';
import { usePreferencesStore } from '#/preferences/store';
import {
  ContentCompact,
  FullContent,
  HeaderMixedNav,
  HeaderNav,
  HeaderSidebarNav,
  MixedNav,
  SidebarMixedNav,
  SidebarNav,
} from '#/components/layout/preference-icons';

/** 带标题的设置分组 */
/**
 * `.outline-box` 与 `.outline-box-active` 会被 cn() 的 tailwind-merge 判成同一组
 * `outline-*` 工具而互相覆盖（激活态会把基础类删掉，导致 p-1 / 圆角丢失、描边不渲染）。
 * 这里用纯字符串拼接绕开合并，保证激活态同时保留两个类。
 */
function outlineBoxClass(base: string, active: boolean): string {
  return active ? `${base} outline-box-active` : base;
}

export function PreferenceBlock({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col py-4">
      <h3 className="mb-3 leading-none font-semibold tracking-tight">
        {title}
      </h3>
      {children}
    </div>
  );
}

/** 开关项 */
export function PreferenceSwitchItem({
  className,
  disabled = false,
  tip,
  shortcut,
  checked,
  onChange,
  children,
}: {
  className?: string;
  disabled?: boolean;
  tip?: string;
  shortcut?: React.ReactNode;
  checked: boolean;
  onChange: (val: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'my-1 flex w-full items-center justify-between rounded-md px-2 py-2.5 hover:bg-accent',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <span className="flex items-center text-sm">
        {children}
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="ml-1 size-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {tip.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      {shortcut && (
        <span className="mr-2 ml-auto text-xs opacity-60">{shortcut}</span>
      )}
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/** 切换按钮组项 */
export function PreferenceToggleItem({
  disabled = false,
  items = [],
  value,
  onChange,
  children,
}: {
  disabled?: boolean;
  items?: Array<{ label: string; value: string }>;
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-between rounded-md p-2 hover:bg-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="text-sm">{children}</span>
      <ToggleGroup
        className="gap-2"
        size="sm"
        type="single"
        value={value}
        variant="outline"
        onValueChange={(val) => val && onChange(val)}
      >
        {items.map((item) => (
          <ToggleGroupItem
            key={item.value}
            className="h-7 rounded-sm"
            value={item.value}
          >
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/** 下拉选择项 */
export function PreferenceSelectItem({
  disabled = false,
  items = [],
  placeholder = '',
  tip,
  value,
  onChange,
  children,
}: {
  disabled?: boolean;
  items?: Array<{ label: string; value: string }>;
  placeholder?: string;
  tip?: string;
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'my-1 flex w-full items-center justify-between rounded-md px-2 py-1',
        !tip && 'hover:bg-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="flex items-center text-sm">
        {children}
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="ml-1 size-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {tip.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      <Select disabled={disabled} value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-41.25">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** 文本输入项 */
export function PreferenceInputItem({
  disabled = false,
  placeholder = '',
  tip,
  value,
  onChange,
  children,
}: {
  disabled?: boolean;
  placeholder?: string;
  tip?: string;
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'my-1 flex w-full items-center justify-between rounded-md px-2 py-1',
        !tip && 'hover:bg-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="flex items-center text-sm">
        {children}
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="ml-1 size-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {tip.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      <div className="relative">
        <Input
          className="h-8 w-41.25"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <CircleX
            className="absolute top-1/2 right-2 size-3 -translate-y-1/2 cursor-pointer text-foreground/60 hover:text-foreground"
            onClick={() => onChange('')}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 数字输入控件 —— 对齐官方 @vben-core/shadcn-ui 的 NumberField 组合
 * （NumberFieldInput 是唯一带边框的输入框，h-9 w-full，减/加号绝对定位贴在左右内边距里）
 */
export function PreferenceNumberFieldControl({
  className,
  disabled = false,
  max = 999,
  min = 0,
  step = 1,
  value,
  onChange,
}: {
  className?: string;
  disabled?: boolean;
  max?: number;
  min?: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className={cn('relative', className)}>
      <Input
        className="h-9 w-full rounded-md border-input bg-transparent py-1 pr-5 pl-5 text-center text-sm shadow-xs"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const num = Number(e.target.value);
          if (!Number.isNaN(num)) onChange(num);
        }}
      />
      <button
        className="absolute top-1/2 left-0 -translate-y-1/2 p-3 text-foreground disabled:cursor-not-allowed disabled:opacity-20"
        disabled={disabled || value <= min}
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus className="size-4" />
      </button>
      <button
        className="absolute top-1/2 right-0 -translate-y-1/2 p-3 text-foreground disabled:cursor-not-allowed disabled:opacity-20"
        disabled={disabled || value >= max}
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** 数字输入项 */
export function PreferenceNumberFieldItem({
  disabled = false,
  max = 999,
  min = 0,
  step = 1,
  tip,
  value,
  onChange,
  children,
}: {
  disabled?: boolean;
  max?: number;
  min?: number;
  step?: number;
  tip?: string;
  value: number;
  onChange: (val: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'my-1 flex w-full items-center justify-between rounded-md px-2 py-1',
        !tip && 'hover:bg-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="flex items-center text-sm">
        {children}
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="ml-1 size-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {tip.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      {/* 官方 number-field-item.vue：<NumberField class="w-41.25"> */}
      <PreferenceNumberFieldControl
        className="w-41.25"
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

/** 多选按钮组项 */
export function PreferenceCheckboxItem({
  disabled = false,
  items = [],
  tip,
  value,
  onChange,
  children,
}: {
  disabled?: boolean;
  items?: Array<{ label: string; value: string }>;
  tip?: string;
  value: string[];
  onChange: (val: string[]) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'my-1 flex w-full items-center justify-between rounded-md px-2 py-1',
        !tip && 'hover:bg-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="flex items-center text-sm">
        {children}
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="ml-1 size-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {tip.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      {/* 对齐官方 VbenCheckButtonGroup（size=middle / gap=0 / showIcon）：
          选中 = variant default + CircleCheckBig，未选中 = variant outline + Circle；
          官方 no-gap 规则：button + button 保留 border-left、首个 button 去掉 border-right，
          相邻按钮共用一条 1px 边框，只有两端保留圆角。 */}
      <div className="inline-flex h-8 w-41.25 rounded-md">
        {items.map((item, index) => {
          const active = value.includes(item.value);
          const first = index === 0;
          const last = index === items.length - 1;
          return (
            <Button
              className={cn(
                'border px-2 py-1 text-xs leading-4',
                !last && 'border-r-0',
                active && 'border-primary',
                first &&
                  !last &&
                  'rounded-l-[calc(var(--radius)-2px)] rounded-r-none',
                last &&
                  !first &&
                  'rounded-r-[calc(var(--radius)-2px)] rounded-l-none',
                !first && !last && 'rounded-none',
                first && last && 'rounded-md',
              )}
              disabled={disabled}
              key={item.value}
              size="sm"
              type="button"
              variant={active ? 'default' : 'outline'}
              onClick={() =>
                onChange(
                  active
                    ? value.filter((v) => v !== item.value)
                    : [...value, item.value],
                )
              }
            >
              <span className="mr-[0.2rem] inline-flex items-center">
                {active ? (
                  <CircleCheckBig className="size-3" />
                ) : (
                  <Circle className="size-3" />
                )}
              </span>
              {item.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/* =---------------- 主题 ---------------- */

/** 主题模式（浅色/暗色/跟随系统）+ 半暗色开关 */
export function PreferenceThemeBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const mode = preferences.theme.mode;

  const THEME_PRESET = [
    { name: 'light' as const, label: $t('preferences.theme.light') },
    { name: 'dark' as const, label: $t('preferences.theme.dark') },
    { name: 'auto' as const, label: $t('preferences.followSystem') },
  ];

  return (
    <div className="flex w-full flex-wrap justify-between">
      {THEME_PRESET.map((item) => (
        <div
          key={item.name}
          className="flex cursor-pointer flex-col"
          onClick={() => updatePreferences({ theme: { mode: item.name } })}
        >
          <div
            className={outlineBoxClass(
              'outline-box flex-center py-4',
              mode === item.name,
            )}
          >
            <ThemeModeIcon mode={item.name} />
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {item.label}
          </div>
        </div>
      ))}

      <PreferenceSwitchItem
        checked={preferences.theme.semiDarkSidebar}
        className="mt-6"
        disabled={
          mode === 'dark' ||
          preferences.app.layout === 'header-nav' ||
          preferences.app.layout === 'full-content'
        }
        tip={$t('preferences.theme.darkSidebarTip')}
        onChange={(val) =>
          updatePreferences({ theme: { semiDarkSidebar: val } })
        }
      >
        {$t('preferences.theme.darkSidebar')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={preferences.theme.semiDarkSidebarSub}
        disabled={
          mode === 'dark' ||
          (preferences.app.layout !== 'header-mixed-nav' &&
            preferences.app.layout !== 'sidebar-mixed-nav') ||
          !preferences.theme.semiDarkSidebar
        }
        tip={$t('preferences.theme.darkSidebarSubTip')}
        onChange={(val) =>
          updatePreferences({ theme: { semiDarkSidebarSub: val } })
        }
      >
        {$t('preferences.theme.darkSidebarSub')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={preferences.theme.semiDarkHeader}
        disabled={mode === 'dark'}
        onChange={(val) =>
          updatePreferences({ theme: { semiDarkHeader: val } })
        }
      >
        {$t('preferences.theme.darkHeader')}
      </PreferenceSwitchItem>
    </div>
  );
}

/** 主题模式图标 —— 对齐官方 theme.vue 的 `@vben/icons` Sun / MoonStar / SunMoon（均为 lucide 图标） */
function ThemeModeIcon({ mode }: { mode: 'light' | 'dark' | 'auto' }) {
  const cls = 'mx-9 size-5';
  if (mode === 'light') return <Sun className={cls} />;
  if (mode === 'dark') return <MoonStar className={cls} />;
  return <SunMoon className={cls} />;
}

/** 内置主题色板 */
export function PreferenceBuiltinThemeBlock({ isDark }: { isDark: boolean }) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );

  function typeView(name: BuiltinThemeType) {
    const key = `preferences.theme.builtin.${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
    return $t(key);
  }

  /** 对齐官方 watch：切换主题/亮暗模式时同步主色 */
  function handleSelect(type: BuiltinThemeType) {
    const preset = BUILT_IN_THEME_PRESETS.find((item) => item.type === type);
    const color = preset
      ? (isDark
          ? preset.darkPrimaryColor || preset.primaryColor
          : preset.primaryColor) || preset.color
      : preferences.theme.colorPrimary;
    updatePreferences({
      theme: { builtinType: type, colorPrimary: color },
    });
  }

  return (
    <div className="flex w-full flex-wrap justify-between">
      {BUILT_IN_THEME_PRESETS.map((theme) => (
        <div
          key={theme.type}
          className="flex cursor-pointer flex-col"
          onClick={() => handleSelect(theme.type)}
        >
          <div
            className={outlineBoxClass(
              'group outline-box flex-center cursor-pointer',
              preferences.theme.builtinType === theme.type,
            )}
          >
            {theme.type !== 'custom' ? (
              <div
                className="mx-9 my-2 size-5 rounded-md"
                style={{ backgroundColor: theme.color }}
              />
            ) : (
              <div
                className="size-full px-9 py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('custom-color-input')?.click();
                }}
              >
                <div className="relative flex-center size-5 rounded-sm">
                  <UserRoundPen className="absolute z-1 size-5 opacity-60 group-hover:opacity-100" />
                  <input
                    id="custom-color-input"
                    className="absolute inset-0 opacity-0"
                    type="color"
                    value={preferences.theme.colorPrimary}
                    onChange={(e) =>
                      updatePreferences({
                        theme: {
                          builtinType: 'custom',
                          colorPrimary: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <div className="my-2 text-center text-xs text-muted-foreground">
            {typeView(theme.type)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 圆角 */
export function PreferenceRadiusBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const items = [
    { label: '0', value: '0' },
    { label: '0.25', value: '0.25' },
    { label: '0.5', value: '0.5' },
    { label: '0.75', value: '0.75' },
    { label: '1', value: '1' },
  ];
  return (
    <ToggleGroup
      className="gap-2"
      size="sm"
      type="single"
      value={preferences.theme.radius}
      variant="outline"
      onValueChange={(val) =>
        val && updatePreferences({ theme: { radius: val } })
      }
    >
      {items.map((item) => (
        <ToggleGroupItem
          className="h-7 w-16 rounded-sm"
          key={item.value}
          value={item.value}
        >
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** 字体大小 */
export function PreferenceFontSizeBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  return (
    // 对齐官方 font-size.vue：无标签行，只有 NumberField(w-full) + "px" + 提示文案
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <PreferenceNumberFieldControl
          className="w-full"
          max={22}
          min={15}
          step={1}
          value={preferences.theme.fontSize}
          onChange={(val) => updatePreferences({ theme: { fontSize: val } })}
        />
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          px
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {$t('preferences.theme.fontSizeTip')}
      </div>
    </div>
  );
}

/** 颜色模式（弱色/灰色） */
export function PreferenceColorModeBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  return (
    <>
      <PreferenceSwitchItem
        checked={preferences.app.colorWeakMode}
        onChange={(val) => updatePreferences({ app: { colorWeakMode: val } })}
      >
        {$t('preferences.theme.weakMode')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={preferences.app.colorGrayMode}
        onChange={(val) => updatePreferences({ app: { colorGrayMode: val } })}
      >
        {$t('preferences.theme.grayMode')}
      </PreferenceSwitchItem>
    </>
  );
}

/* =---------------- 布局 ---------------- */

const LAYOUT_COMPONENTS: Record<LayoutType, React.ComponentType> = {
  'full-content': FullContent,
  'header-nav': HeaderNav,
  'header-sidebar-nav': HeaderSidebarNav,
  'header-mixed-nav': HeaderMixedNav,
  'mixed-nav': MixedNav,
  'sidebar-mixed-nav': SidebarMixedNav,
  'sidebar-nav': SidebarNav,
};

/** 布局模式 */
export function PreferenceLayoutBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const PRESET = [
    {
      name: $t('preferences.vertical'),
      tip: $t('preferences.verticalTip'),
      type: 'sidebar-nav' as LayoutType,
    },
    {
      name: $t('preferences.twoColumn'),
      tip: $t('preferences.twoColumnTip'),
      type: 'sidebar-mixed-nav' as LayoutType,
    },
    {
      name: $t('preferences.horizontal'),
      tip: $t('preferences.horizontalTip'),
      type: 'header-nav' as LayoutType,
    },
    {
      name: $t('preferences.headerSidebarNav'),
      tip: $t('preferences.headerSidebarNavTip'),
      type: 'header-sidebar-nav' as LayoutType,
    },
    {
      name: $t('preferences.mixedMenu'),
      tip: $t('preferences.mixedMenuTip'),
      type: 'mixed-nav' as LayoutType,
    },
    {
      name: $t('preferences.headerTwoColumn'),
      tip: $t('preferences.headerTwoColumnTip'),
      type: 'header-mixed-nav' as LayoutType,
    },
    {
      name: $t('preferences.fullContent'),
      tip: $t('preferences.fullContentTip'),
      type: 'full-content' as LayoutType,
    },
  ];
  return (
    <div className="flex w-full flex-wrap gap-5">
      {PRESET.map((item) => {
        const Component = LAYOUT_COMPONENTS[item.type];
        return (
          <div
            key={item.name}
            className="flex w-25 cursor-pointer flex-col"
            onClick={() => updatePreferences({ app: { layout: item.type } })}
          >
            <div
              className={outlineBoxClass(
                'outline-box flex-center',
                preferences.app.layout === item.type,
              )}
            >
              <Component />
            </div>
            <div className="mt-2 flex-center text-center text-xs text-muted-foreground hover:text-foreground">
              {item.name}
              {item.tip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="ml-1 size-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{item.tip}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 内容宽度 */
export function PreferenceContentBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const PRESET = [
    { name: $t('preferences.wide'), type: 'wide' as const },
    { name: $t('preferences.compact'), type: 'compact' as const },
  ];
  return (
    <div className="flex w-full gap-5">
      {PRESET.map((item) => (
        <div
          key={item.name}
          className="flex w-25 cursor-pointer flex-col"
          onClick={() =>
            updatePreferences({ app: { contentCompact: item.type } })
          }
        >
          <div
            className={outlineBoxClass(
              'outline-box flex-center',
              preferences.app.contentCompact === item.type,
            )}
          >
            {/* 对齐官方 icons/index.ts：ContentWide 即 HeaderNav */}
            {item.type === 'wide' ? <HeaderNav /> : <ContentCompact />}
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {item.name}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 侧边栏 */
export function PreferenceSidebarBlock({ disabled }: { disabled: boolean }) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const s = preferences.sidebar;
  // 对齐官方 sidebar.vue：`sidebarButtons` 是纯本地 UI 态，初值 `[]`（官方实测首次展开
  // 两项均为未选中态，onMounted 的同步在官方链路上并未生效）。点击后仍写回偏好，
  // 让「折叠按钮 / 固定按钮」确实作用于侧边栏。
  const [buttons, setButtons] = useState<string[]>([]);

  function handleCheckboxChange(next: string[]) {
    setButtons(next);
    updatePreferences({
      sidebar: {
        collapsedButton: next.includes('collapsed'),
        fixedButton: next.includes('fixed'),
      },
    });
  }

  return (
    <>
      <PreferenceSwitchItem
        checked={s.enable}
        disabled={disabled}
        onChange={(val) => updatePreferences({ sidebar: { enable: val } })}
      >
        {$t('preferences.sidebar.visible')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={s.draggable}
        disabled={!s.enable || disabled}
        onChange={(val) => updatePreferences({ sidebar: { draggable: val } })}
      >
        {$t('preferences.sidebar.draggable')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={s.collapsed}
        disabled={!s.enable || disabled}
        onChange={(val) => updatePreferences({ sidebar: { collapsed: val } })}
      >
        {$t('preferences.sidebar.collapsed')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={s.expandOnHover}
        disabled={!s.enable || disabled || !s.collapsed}
        onChange={(val) =>
          updatePreferences({ sidebar: { expandOnHover: val } })
        }
      >
        {$t('preferences.sidebar.expandOnHover')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={s.collapsedShowTitle}
        disabled={!s.enable || disabled || !s.collapsed}
        onChange={(val) =>
          updatePreferences({ sidebar: { collapsedShowTitle: val } })
        }
      >
        {$t('preferences.sidebar.collapsedShowTitle')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={s.autoActivateChild}
        disabled={
          !s.enable ||
          !['sidebar-mixed-nav', 'mixed-nav', 'header-mixed-nav'].includes(
            preferences.app.layout,
          ) ||
          disabled
        }
        tip={$t('preferences.sidebar.autoActivateChildTip')}
        onChange={(val) =>
          updatePreferences({ sidebar: { autoActivateChild: val } })
        }
      >
        {$t('preferences.sidebar.autoActivateChild')}
      </PreferenceSwitchItem>
      <PreferenceCheckboxItem
        disabled={disabled}
        items={[
          {
            label: $t('preferences.sidebar.buttonCollapsed'),
            value: 'collapsed',
          },
          { label: $t('preferences.sidebar.buttonFixed'), value: 'fixed' },
        ]}
        value={buttons}
        onChange={handleCheckboxChange}
      >
        {$t('preferences.sidebar.buttons')}
      </PreferenceCheckboxItem>
      <PreferenceNumberFieldItem
        disabled={!s.enable || disabled}
        max={320}
        min={160}
        step={10}
        value={s.width}
        onChange={(val) => updatePreferences({ sidebar: { width: val } })}
      >
        {$t('preferences.sidebar.width')}
      </PreferenceNumberFieldItem>
    </>
  );
}

/** 头部 */
export function PreferenceHeaderBlock({ disabled }: { disabled: boolean }) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const h = preferences.header;
  const modeItems = [
    { label: $t('preferences.header.modeStatic'), value: 'static' },
    { label: $t('preferences.header.modeFixed'), value: 'fixed' },
    { label: $t('preferences.header.modeAuto'), value: 'auto' },
    { label: $t('preferences.header.modeAutoScroll'), value: 'auto-scroll' },
  ];
  const alignItems = [
    { label: $t('preferences.header.menuAlignStart'), value: 'start' },
    { label: $t('preferences.header.menuAlignCenter'), value: 'center' },
    { label: $t('preferences.header.menuAlignEnd'), value: 'end' },
  ];
  return (
    <>
      <PreferenceSwitchItem
        checked={h.enable}
        disabled={disabled}
        onChange={(val) => updatePreferences({ header: { enable: val } })}
      >
        {$t('preferences.header.visible')}
      </PreferenceSwitchItem>
      <PreferenceSelectItem
        disabled={!h.enable}
        items={modeItems}
        value={h.mode}
        onChange={(val) => updatePreferences({ header: { mode: val as any } })}
      >
        {$t('preferences.mode')}
      </PreferenceSelectItem>
      <PreferenceToggleItem
        disabled={!h.enable}
        items={alignItems}
        value={h.menuAlign}
        onChange={(val) =>
          updatePreferences({ header: { menuAlign: val as any } })
        }
      >
        {$t('preferences.header.menuAlign')}
      </PreferenceToggleItem>
    </>
  );
}

/** 导航菜单 */
export function PreferenceNavigationBlock({ disabled }: { disabled: boolean }) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const n = preferences.navigation;
  const styleItems = [
    { label: $t('preferences.rounded'), value: 'rounded' },
    { label: $t('preferences.plain'), value: 'plain' },
  ];
  return (
    <>
      <PreferenceToggleItem
        disabled={disabled}
        items={styleItems}
        value={n.styleType}
        onChange={(val) =>
          updatePreferences({ navigation: { styleType: val as any } })
        }
      >
        {$t('preferences.navigationMenu.style')}
      </PreferenceToggleItem>
      <PreferenceSwitchItem
        checked={n.split}
        disabled={disabled}
        tip={$t('preferences.navigationMenu.splitTip')}
        onChange={(val) => updatePreferences({ navigation: { split: val } })}
      >
        {$t('preferences.navigationMenu.split')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={n.accordion}
        disabled={disabled}
        onChange={(val) =>
          updatePreferences({ navigation: { accordion: val } })
        }
      >
        {$t('preferences.navigationMenu.accordion')}
      </PreferenceSwitchItem>
    </>
  );
}

/** 面包屑 */
export function PreferenceBreadcrumbBlock({ disabled }: { disabled: boolean }) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const b = preferences.breadcrumb;
  const typeItems = [
    { label: $t('preferences.normal'), value: 'normal' },
    { label: $t('preferences.breadcrumb.background'), value: 'background' },
  ];
  const itemDisabled = !b.enable || disabled;
  return (
    <>
      <PreferenceSwitchItem
        checked={b.enable}
        disabled={disabled}
        onChange={(val) => updatePreferences({ breadcrumb: { enable: val } })}
      >
        {$t('preferences.breadcrumb.enable')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={b.hideOnlyOne}
        disabled={itemDisabled}
        onChange={(val) =>
          updatePreferences({ breadcrumb: { hideOnlyOne: val } })
        }
      >
        {$t('preferences.breadcrumb.hideOnlyOne')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={b.showIcon}
        disabled={itemDisabled}
        onChange={(val) => updatePreferences({ breadcrumb: { showIcon: val } })}
      >
        {$t('preferences.breadcrumb.icon')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={b.showHome}
        disabled={itemDisabled || !b.showIcon}
        onChange={(val) => updatePreferences({ breadcrumb: { showHome: val } })}
      >
        {$t('preferences.breadcrumb.home')}
      </PreferenceSwitchItem>
      <PreferenceToggleItem
        disabled={itemDisabled}
        items={typeItems}
        value={b.styleType}
        onChange={(val) =>
          updatePreferences({ breadcrumb: { styleType: val as any } })
        }
      >
        {$t('preferences.breadcrumb.style')}
      </PreferenceToggleItem>
    </>
  );
}

/** 标签栏 */
export function PreferenceTabbarBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const t = preferences.tabbar;
  const styleItems = [
    { label: $t('preferences.tabbar.styleType.chrome'), value: 'chrome' },
    { label: $t('preferences.tabbar.styleType.plain'), value: 'plain' },
    { label: $t('preferences.tabbar.styleType.card'), value: 'card' },
    { label: $t('preferences.tabbar.styleType.brisk'), value: 'brisk' },
  ];
  return (
    <>
      <PreferenceSwitchItem
        checked={t.enable}
        onChange={(val) => updatePreferences({ tabbar: { enable: val } })}
      >
        {$t('preferences.tabbar.enable')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.persist}
        disabled={!t.enable}
        onChange={(val) => updatePreferences({ tabbar: { persist: val } })}
      >
        {$t('preferences.tabbar.persist')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.visitHistory}
        disabled={!t.enable}
        tip={$t('preferences.tabbar.visitHistoryTip')}
        onChange={(val) => updatePreferences({ tabbar: { visitHistory: val } })}
      >
        {$t('preferences.tabbar.visitHistory')}
      </PreferenceSwitchItem>
      <PreferenceNumberFieldItem
        disabled={!t.enable}
        max={30}
        min={0}
        step={5}
        tip={$t('preferences.tabbar.maxCountTip')}
        value={t.maxCount}
        onChange={(val) => updatePreferences({ tabbar: { maxCount: val } })}
      >
        {$t('preferences.tabbar.maxCount')}
      </PreferenceNumberFieldItem>
      <PreferenceSwitchItem
        checked={t.draggable}
        disabled={!t.enable}
        onChange={(val) => updatePreferences({ tabbar: { draggable: val } })}
      >
        {$t('preferences.tabbar.draggable')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.wheelable}
        disabled={!t.enable}
        tip={$t('preferences.tabbar.wheelableTip')}
        onChange={(val) => updatePreferences({ tabbar: { wheelable: val } })}
      >
        {$t('preferences.tabbar.wheelable')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.middleClickToClose}
        disabled={!t.enable}
        onChange={(val) =>
          updatePreferences({ tabbar: { middleClickToClose: val } })
        }
      >
        {$t('preferences.tabbar.middleClickClose')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.showIcon}
        disabled={!t.enable}
        onChange={(val) => updatePreferences({ tabbar: { showIcon: val } })}
      >
        {$t('preferences.tabbar.icon')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.showMore}
        disabled={!t.enable}
        onChange={(val) => updatePreferences({ tabbar: { showMore: val } })}
      >
        {$t('preferences.tabbar.showMore')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.showMaximize}
        disabled={!t.enable}
        onChange={(val) => updatePreferences({ tabbar: { showMaximize: val } })}
      >
        {$t('preferences.tabbar.showMaximize')}
      </PreferenceSwitchItem>
      <PreferenceSelectItem
        items={styleItems}
        value={t.styleType}
        onChange={(val) =>
          updatePreferences({ tabbar: { styleType: val as any } })
        }
      >
        {$t('preferences.tabbar.styleType.title')}
      </PreferenceSelectItem>
    </>
  );
}

/** 部件开关 */
export function PreferenceWidgetBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const w = preferences.widget;
  const positionItems = [
    { label: $t('preferences.position.auto'), value: 'auto' },
    { label: $t('preferences.position.header'), value: 'header' },
    { label: $t('preferences.position.fixed'), value: 'fixed' },
    { label: $t('preferences.position.userDropdown'), value: 'user-dropdown' },
  ];
  return (
    <>
      <PreferenceSwitchItem
        checked={w.globalSearch}
        onChange={(val) => updatePreferences({ widget: { globalSearch: val } })}
      >
        {$t('preferences.widget.globalSearch')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={w.themeToggle}
        onChange={(val) => updatePreferences({ widget: { themeToggle: val } })}
      >
        {$t('preferences.widget.themeToggle')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={w.languageToggle}
        onChange={(val) =>
          updatePreferences({ widget: { languageToggle: val } })
        }
      >
        {$t('preferences.widget.languageToggle')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={w.fullscreen}
        onChange={(val) => updatePreferences({ widget: { fullscreen: val } })}
      >
        {$t('preferences.widget.fullscreen')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={w.notification}
        onChange={(val) => updatePreferences({ widget: { notification: val } })}
      >
        {$t('preferences.widget.notification')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={w.lockScreen}
        onChange={(val) => updatePreferences({ widget: { lockScreen: val } })}
      >
        {$t('preferences.widget.lockScreen')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={w.sidebarToggle}
        onChange={(val) =>
          updatePreferences({ widget: { sidebarToggle: val } })
        }
      >
        {$t('preferences.widget.sidebarToggle')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={w.refresh}
        onChange={(val) => updatePreferences({ widget: { refresh: val } })}
      >
        {$t('preferences.widget.refresh')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={w.timezone}
        onChange={(val) => updatePreferences({ widget: { timezone: val } })}
      >
        {$t('preferences.widget.timezone')}
      </PreferenceSwitchItem>
      <PreferenceSelectItem
        items={positionItems}
        value={preferences.app.preferencesButtonPosition}
        onChange={(val) =>
          updatePreferences({ app: { preferencesButtonPosition: val as any } })
        }
      >
        {$t('preferences.position.title')}
      </PreferenceSelectItem>
    </>
  );
}

/** 页脚 */
export function PreferenceFooterBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const f = preferences.footer;
  return (
    <>
      <PreferenceSwitchItem
        checked={f.enable}
        onChange={(val) => updatePreferences({ footer: { enable: val } })}
      >
        {$t('preferences.footer.visible')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={f.fixed}
        disabled={!f.enable}
        onChange={(val) => updatePreferences({ footer: { fixed: val } })}
      >
        {$t('preferences.footer.fixed')}
      </PreferenceSwitchItem>
    </>
  );
}

/** 版权 */
export function PreferenceCopyrightBlock({ disabled }: { disabled: boolean }) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const c = preferences.copyright;
  const itemDisabled = disabled || !c.enable;
  return (
    <>
      <PreferenceSwitchItem
        checked={c.enable}
        disabled={disabled}
        onChange={(val) => updatePreferences({ copyright: { enable: val } })}
      >
        {$t('preferences.copyright.enable')}
      </PreferenceSwitchItem>
      <PreferenceInputItem
        disabled={itemDisabled}
        value={c.companyName}
        onChange={(val) =>
          updatePreferences({ copyright: { companyName: val } })
        }
      >
        {$t('preferences.copyright.companyName')}
      </PreferenceInputItem>
      <PreferenceInputItem
        disabled={itemDisabled}
        value={c.companySiteLink}
        onChange={(val) =>
          updatePreferences({ copyright: { companySiteLink: val } })
        }
      >
        {$t('preferences.copyright.companySiteLink')}
      </PreferenceInputItem>
      <PreferenceInputItem
        disabled={itemDisabled}
        value={c.date}
        onChange={(val) => updatePreferences({ copyright: { date: val } })}
      >
        {$t('preferences.copyright.date')}
      </PreferenceInputItem>
      <PreferenceInputItem
        disabled={itemDisabled}
        value={c.icp}
        onChange={(val) => updatePreferences({ copyright: { icp: val } })}
      >
        {$t('preferences.copyright.icp')}
      </PreferenceInputItem>
      <PreferenceInputItem
        disabled={itemDisabled}
        value={c.icpLink}
        onChange={(val) => updatePreferences({ copyright: { icpLink: val } })}
      >
        {$t('preferences.copyright.icpLink')}
      </PreferenceInputItem>
    </>
  );
}

/* =---------------- 通用 ---------------- */

/** 语言项（与官方 general.vue 使用的 SUPPORT_LANGUAGES 一致） */
const LANGUAGE_ITEMS = SUPPORT_LANGUAGES.map((item) => ({
  label: item.label,
  value: item.value,
}));

/** 通用配置 */
export function PreferenceGeneralBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const a = preferences.app;
  /**
   * 时区选项 —— 对齐官方 general.vue 的 `timezoneStore.getTimezoneOptions()`，
   * 即 DEFAULT_TIME_ZONE_OPTIONS（5 项，label 带 GMT 偏移）
   */
  const timezoneItems = useMemo(() => TIMEZONE_SELECT_ITEMS, []);
  return (
    <>
      <PreferenceSelectItem
        items={LANGUAGE_ITEMS}
        value={a.locale}
        onChange={(val) => updatePreferences({ app: { locale: val as any } })}
      >
        {$t('preferences.language')}
      </PreferenceSelectItem>
      <PreferenceSelectItem
        items={timezoneItems}
        value={a.timezone}
        onChange={(val) =>
          updatePreferences({ app: { timezone: val as string } })
        }
      >
        {$t('preferences.timezone')}
      </PreferenceSelectItem>
      <PreferenceSwitchItem
        checked={a.dynamicTitle}
        onChange={(val) => updatePreferences({ app: { dynamicTitle: val } })}
      >
        {$t('preferences.dynamicTitle')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={a.watermark}
        onChange={(val) =>
          updatePreferences({
            app: {
              watermark: val,
              watermarkContent: val ? a.watermarkContent : '',
            },
          })
        }
      >
        {$t('preferences.watermark')}
      </PreferenceSwitchItem>
      {a.watermark && (
        <PreferenceInputItem
          placeholder={$t('preferences.watermarkContent')}
          value={a.watermarkContent}
          onChange={(val) =>
            updatePreferences({ app: { watermarkContent: val } })
          }
        >
          {$t('preferences.watermarkContent')}
        </PreferenceInputItem>
      )}
      <PreferenceSwitchItem
        checked={a.enableCheckUpdates}
        onChange={(val) =>
          updatePreferences({ app: { enableCheckUpdates: val } })
        }
      >
        {$t('preferences.checkUpdates')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={a.enableCopyPreferences}
        onChange={(val) =>
          updatePreferences({ app: { enableCopyPreferences: val } })
        }
      >
        {$t('preferences.enableCopyPreferences')}
      </PreferenceSwitchItem>
    </>
  );
}

/** 动画 */
export function PreferenceAnimationBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const t = preferences.transition;
  const transitionPreset = ['fade', 'fade-slide', 'fade-up', 'fade-down'];
  return (
    <>
      <PreferenceSwitchItem
        checked={t.progress}
        onChange={(val) => updatePreferences({ transition: { progress: val } })}
      >
        {$t('preferences.animation.progress')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.loading}
        onChange={(val) => updatePreferences({ transition: { loading: val } })}
      >
        {$t('preferences.animation.loading')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={t.enable}
        onChange={(val) => updatePreferences({ transition: { enable: val } })}
      >
        {$t('preferences.animation.transition')}
      </PreferenceSwitchItem>
      {t.enable && (
        <div className="mt-3 mb-2 flex justify-between gap-3 px-2">
          {transitionPreset.map((item) => (
            <div
              key={item}
              className={outlineBoxClass('outline-box p-2', t.name === item)}
              onClick={() => updatePreferences({ transition: { name: item } })}
            >
              <div
                className={cn(`${item}-slow h-10 w-12 rounded-md bg-accent`)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =---------------- 快捷键 ---------------- */

/** 全局快捷键 */
export function PreferenceGlobalShortcutKeysBlock() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const k = preferences.shortcutKeys;
  const altView = isWindowsOs() ? 'Alt' : '⌥';
  // 快捷键文案对齐官方 global.vue：搜索是 `Ctrl + <kbd>K</kbd>`，
  // 退出登录/锁屏是纯文本 `Alt Q` / `Alt L`（官方 slot 里没有 kbd，多余的内框会多出一个方块）
  return (
    <>
      <PreferenceSwitchItem
        checked={k.enable}
        onChange={(val) => updatePreferences({ shortcutKeys: { enable: val } })}
      >
        {$t('preferences.shortcutKeys.title')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={k.globalSearch}
        disabled={!k.enable}
        shortcut={
          <>
            {isWindowsOs() ? 'Ctrl' : '⌘'} <kbd> K </kbd>
          </>
        }
        onChange={(val) =>
          updatePreferences({ shortcutKeys: { globalSearch: val } })
        }
      >
        {$t('preferences.shortcutKeys.search')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={k.globalLogout}
        disabled={!k.enable}
        shortcut={`${altView} Q`}
        onChange={(val) =>
          updatePreferences({ shortcutKeys: { globalLogout: val } })
        }
      >
        {$t('preferences.shortcutKeys.logout')}
      </PreferenceSwitchItem>
      <PreferenceSwitchItem
        checked={k.globalLockScreen}
        disabled={!k.enable}
        shortcut={`${altView} L`}
        onChange={(val) =>
          updatePreferences({ shortcutKeys: { globalLockScreen: val } })
        }
      >
        {$t('ui.widgets.lockScreen.title')}
      </PreferenceSwitchItem>
    </>
  );
}
