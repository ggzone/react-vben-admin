/**
 * AuthenticationLayoutToggle —— 与官方
 * packages/effects/layouts/src/widgets/layout-toggle.vue 1:1 对齐
 *
 * 触发器图标随 `app.authPageLayout` 变化（PanelLeft / InspectionPanel / PanelRight），
 * 点击展开单选菜单（居左 / 居中 / 居右），选择后写回偏好。
 */
import { InspectionPanel, PanelLeft, PanelRight } from 'lucide-react';

import { IconButton } from '#/components/ui/icon-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { $t } from '#/locales';
import { usePreferencesStore } from '#/preferences/store';

type AuthPageLayoutType = 'panel-center' | 'panel-left' | 'panel-right';

const MENUS: Array<{
  icon: typeof PanelLeft;
  label: string;
  value: AuthPageLayoutType;
}> = [
  {
    icon: PanelLeft,
    label: $t('authentication.layout.alignLeft'),
    value: 'panel-left',
  },
  {
    icon: InspectionPanel,
    label: $t('authentication.layout.center'),
    value: 'panel-center',
  },
  {
    icon: PanelRight,
    label: $t('authentication.layout.alignRight'),
    value: 'panel-right',
  },
];

export function LayoutToggle() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );
  const current = preferences.app.authPageLayout;
  const CurrentIcon =
    MENUS.find((menu) => menu.value === current)?.icon ?? PanelRight;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton>
          <CurrentIcon className="size-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) =>
            updatePreferences({
              app: { authPageLayout: value as AuthPageLayoutType },
            })
          }
        >
          {MENUS.map((menu) => (
            <DropdownMenuRadioItem key={menu.value} value={menu.value}>
              <menu.icon className="mr-2 size-4" />
              {menu.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
