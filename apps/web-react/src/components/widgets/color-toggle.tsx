/**
 * AuthenticationColorToggle —— 与官方
 * packages/effects/layouts/src/widgets/color-toggle.vue 1:1 对齐
 *
 * 结构：`group relative flex items-center overflow-hidden`
 *  - 色板条：`flex w-0 overflow-hidden transition-all duration-500 ease-out group-hover:w-60`
 *    （默认收起，hover 展开到 240px）
 *  - 每个预设：VbenIconButton（32×32）内含 20×20 圆形色块，选中时叠加白色对勾
 *  - 触发器：Palette 图标（text-primary）
 */
import { Check, Palette } from 'lucide-react';

import { IconButton } from '#/components/ui/icon-button';
import { BUILT_IN_THEME_PRESETS } from '#/preferences/config';
import { usePreferencesStore } from '#/preferences/store';
import type { BuiltinThemeType } from '#/preferences/config';

export function ColorToggle() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );

  const handleUpdate = (colorPrimary: string, type: BuiltinThemeType) => {
    updatePreferences({ theme: { builtinType: type, colorPrimary } });
  };

  return (
    <div className="group relative flex items-center overflow-hidden">
      <div className="flex w-0 overflow-hidden transition-all duration-500 ease-out group-hover:w-60">
        {BUILT_IN_THEME_PRESETS.map((preset) => (
          <IconButton
            key={preset.type}
            className="flex-center shrink-0"
            onClick={() =>
              handleUpdate(preset.primaryColor ?? preset.color, preset.type)
            }
          >
            <div
              className="relative flex-center size-5 rounded-full hover:scale-110"
              style={{ backgroundColor: preset.color }}
            >
              {preferences.theme.builtinType === preset.type && (
                <Check className="size-3.5 text-white" strokeWidth={2} />
              )}
            </div>
          </IconButton>
        ))}
      </div>

      <IconButton>
        <Palette className="size-4 text-primary" />
      </IconButton>
    </div>
  );
}
