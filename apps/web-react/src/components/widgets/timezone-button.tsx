/**
 * 时区设置按钮 —— 与官方 packages/effects/layouts/src/widgets/timezone/timezone-button.vue 1:1 对齐
 *
 * - 触发：VbenIconButton（variant=icon / size=icon / rounded-full）+ tooltip `ui.widgets.timezone.setTimezone`
 * - 图标：iconify `fluent-mdl2:world-clock`（内联等价 SVG），`size-4 text-foreground`
 * - 弹窗：标题同 tooltip，内容为单选列表（官方 DEFAULT_TIME_ZONE_OPTIONS 5 项），容器 `pl-5`
 * - 确认后写入 preferences.app.timezone（官方为 timezoneStore.setTimezone 持久化）
 */
import { useMemo, useState } from 'react';

import { IconButton } from '#/components/ui/icon-button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { Button } from '#/components/ui/button';
import { TIMEZONE_SELECT_ITEMS } from '#/constants';
import { cn } from '#/lib/utils';
import { $t } from '#/locales';
import { usePreferencesStore } from '#/preferences/store';

/**
 * fluent-mdl2:world-clock（取自 Iconify API：https://api.iconify.design/fluent-mdl2/world-clock.svg）
 * 官方通过 createIconifyIcon('fluent-mdl2:world-clock') 渲染，这里内联同一份 path 保证 1:1
 */
function WorldClockIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 2048 2048"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M896 768H512V256h128v384h256zm1152 640q0 87-22 168t-64 152t-100 130t-128 101t-152 66t-168 23q-134 0-251-49t-205-136t-139-204t-51-251q0-132 50-248t138-204t203-137t249-51q132 0 248 50t204 138t137 203t51 249m-640 512q21 0 37-15t29-40t21-53t15-58t9-53t5-37h-230q1 13 5 37t10 52t15 58t21 54t27 39t36 16m125-384q3-64 3-128q0-63-3-128h-250q-3 65-3 128q0 64 3 128zm-637-128q0 32 4 64t12 64h243q-6-128 0-256H912q-8 32-12 64t-4 64m512-512q-19 0-34 15t-27 40t-21 54t-15 58t-11 53t-5 36h225q-1-11-5-34t-11-52t-16-59t-21-54t-27-41t-32-16m253 384q3 64 3 128t-2 128h242q8-32 12-64t4-64t-4-64t-12-64zm190-128q-43-75-108-131t-145-89q20 53 32 108t20 112zm-637-218q-78 32-142 88t-107 130h200q7-56 18-110t31-108m-249 730q42 73 105 129t142 88q-20-52-30-107t-17-110zm643 215q77-32 139-87t104-128h-198q-5 55-15 109t-30 106M640 0q88 0 170 23t153 64t129 100t100 130t65 153t23 170h-128q0-106-40-199t-110-162t-163-110t-199-41t-199 40t-162 110t-110 163t-41 199t40 199t110 162t163 110t199 41v128q-88 0-170-23t-153-64t-129-100T88 963T23 810T0 640q0-132 50-248t138-204T391 51T640 0" />
    </svg>
  );
}

interface TimezoneButtonProps {
  className?: string;
}

export function TimezoneButton({ className }: TimezoneButtonProps) {
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore(
    (state) => state.updatePreferences,
  );

  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState<string>(preferences.app.timezone);
  const title = $t('ui.widgets.timezone.setTimezone');

  const options = useMemo(() => TIMEZONE_SELECT_ITEMS, []);

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      // 官方 onOpenChange(true) 时把当前时区回填到单选值
      setTimezone(preferences.app.timezone);
    }
    setOpen(isOpen);
  }

  function handleConfirm() {
    updatePreferences({ app: { timezone } });
    setOpen(false);
  }

  return (
    <>
      <IconButton
        className={cn('hover:animate-[shrink_0.3s_ease-in-out]', className)}
        tooltip={title}
        onClick={(e) => {
          e.stopPropagation();
          handleOpen(true);
        }}
      >
        <WorldClockIcon className="size-4 text-foreground" />
      </IconButton>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="timezone-container pl-5">
            <div className="flex flex-col gap-2" role="radiogroup">
              {options.map((item) => {
                const checked = timezone === item.value;
                return (
                  <div
                    key={item.value}
                    className="flex cursor-pointer items-center gap-2"
                    onClick={() => setTimezone(item.value)}
                  >
                    <button
                      aria-checked={checked}
                      className={cn(
                        'aspect-square size-4 shrink-0 rounded-full border border-primary text-primary shadow-sm outline-none',
                        'flex items-center justify-center',
                      )}
                      role="radio"
                      type="button"
                    >
                      {checked && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </button>
                    <label
                      className="cursor-pointer text-sm"
                      htmlFor={item.value}
                    >
                      {item.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {$t('common.cancel')}
            </Button>
            <Button onClick={handleConfirm}>{$t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TimezoneButton;
