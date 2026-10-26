/**
 * 锁屏 —— 与官方
 * packages/effects/layouts/src/widgets/lock-screen/{lock-screen-modal,lock-screen}.vue 对齐
 *
 * 两个组成部分：
 *  1. LockScreenSetupModal：用户下拉点「锁定屏幕」后弹出，输入锁屏密码并确认锁定
 *  2. LockScreen：锁定后的全屏遮罩（时间/日期 + 点击解锁 → 密码校验），
 *     校验通过调用 authStore.unlockScreen()
 */
import * as React from 'react';
import { LockKeyhole } from 'lucide-react';

import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { VbenAvatar } from '#/components/ui/vben-avatar';
import { $t } from '#/locales';
import { usePreferencesStore } from '#/preferences/store';
import { useAuthStore } from '#/stores/auth';
import { useUserStore } from '#/stores/user';

const WEEKDAYS = [
  '星期日',
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
];

function useClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    hour: pad(now.getHours()),
    minute: pad(now.getMinutes()),
    meridiem: now.getHours() < 12 ? 'AM' : 'PM',
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${WEEKDAYS[now.getDay()]}`,
  };
}

/** 设置锁屏密码的弹窗（官方 lock-screen-modal.vue） */
export function LockScreenSetupModal({
  onLock,
  onOpenChange,
  open,
}: {
  onLock: (password: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const userInfo = useUserStore((state) => state.userInfo);
  const preferences = usePreferencesStore((state) => state.preferences);
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
    }
  }, [open]);

  const submit = () => {
    if (!password) {
      setError($t('authentication.passwordTip'));
      return;
    }
    onLock(password);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-8 pb-3">
        <DialogHeader className="border-none">
          <DialogTitle>{$t('ui.widgets.lockScreen.title')}</DialogTitle>
        </DialogHeader>
        <div
          className="mb-10 flex w-full flex-col items-center px-2"
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
        >
          <div className="w-full">
            <div className="ml-2 flex w-full flex-col items-center">
              <VbenAvatar
                alt={userInfo?.realName ?? ''}
                className="size-20"
                dot
                dotClass="right-1 bottom-0 size-4 border-2 bg-green-500"
                src={userInfo?.avatar ?? preferences.app.defaultAvatar}
              />
              <div className="my-6 flex items-center font-medium text-foreground">
                {userInfo?.realName ?? ''}
              </div>
            </div>
            <input
              className="h-8 w-full rounded-lg border border-input bg-card px-[11px] text-sm leading-[22px] outline-none placeholder:text-[var(--antd-placeholder)]"
              placeholder={$t('ui.widgets.lockScreen.placeholder')}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />
            {error && (
              <div className="mt-1 text-xs text-destructive">{error}</div>
            )}
            <Button className="mt-3 w-full" onClick={submit}>
              {$t('ui.widgets.lockScreen.screenButton')}
            </Button>
          </div>
        </div>
        <DialogDescription className="sr-only">
          {$t('ui.widgets.lockScreen.placeholder')}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

/** 锁屏遮罩（官方 lock-screen.vue） */
export function LockScreen() {
  const userInfo = useUserStore((state) => state.userInfo);
  const preferences = usePreferencesStore((state) => state.preferences);
  const lockScreenPassword = useAuthStore((state) => state.lockScreenPassword);
  const unlockScreen = useAuthStore((state) => state.unlockScreen);
  const logout = useAuthStore((state) => state.logout);
  const { date, hour, meridiem, minute } = useClock();
  const [showUnlockForm, setShowUnlockForm] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = () => {
    if (password === lockScreenPassword) {
      setPassword('');
      setError('');
      setShowUnlockForm(false);
      unlockScreen();
    } else {
      setError($t('authentication.passwordErrorTip'));
    }
  };

  return (
    <div className="fixed z-2000 size-full bg-background">
      {!showUnlockForm ? (
        <div className="size-full">
          <div
            className="group fixed top-6 left-1/2 z-2001 flex-col-center -translate-x-1/2 cursor-pointer text-xl font-semibold text-foreground/80 hover:text-foreground"
            onClick={() => setShowUnlockForm(true)}
          >
            <LockKeyhole className="size-5 transition-all duration-300 group-hover:scale-125" />
            <span>{$t('ui.widgets.lockScreen.unlock')}</span>
          </div>
          <div className="flex-center size-full">
            <div className="flex w-full justify-center gap-4 px-4 sm:gap-6 md:gap-8">
              <div className="relative flex-center h-35 w-35 rounded-xl bg-accent text-[36px] sm:h-40 sm:w-40 sm:text-[42px] md:h-50 md:w-50 md:text-[72px]">
                <span className="absolute top-3 left-3 text-xs font-semibold sm:text-sm md:text-xl">
                  {meridiem}
                </span>
                {hour}
              </div>
              <div className="flex-center h-35 w-35 rounded-xl bg-accent text-[36px] sm:h-40 sm:w-40 sm:text-[42px] md:h-50 md:w-50 md:text-[72px]">
                {minute}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex-center size-full"
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
        >
          <div className="mb-10 flex-col-center w-[90%] max-w-75 px-4">
            <VbenAvatar
              alt={userInfo?.realName ?? ''}
              className="enter-x mb-6 size-20"
              src={userInfo?.avatar ?? preferences.app.defaultAvatar}
            />
            <div className="enter-x mb-2 w-full items-center">
              <input
                autoFocus
                className="h-8 w-full rounded-lg border border-input bg-card px-[11px] text-sm leading-[22px] outline-none"
                placeholder={$t('ui.widgets.lockScreen.placeholder')}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
              {error && (
                <div className="mt-1 text-xs text-destructive">{error}</div>
              )}
            </div>
            <Button className="enter-x w-full" onClick={submit}>
              {$t('ui.widgets.lockScreen.entry')}
            </Button>
            <Button
              className="enter-x my-2 w-full"
              variant="ghost"
              onClick={() => void logout(true)}
            >
              {$t('ui.widgets.lockScreen.backToLogin')}
            </Button>
            <Button
              className="enter-x mr-2 w-full"
              variant="ghost"
              onClick={() => setShowUnlockForm(false)}
            >
              {$t('common.back')}
            </Button>
          </div>
        </div>
      )}

      <div className="enter-y absolute bottom-5 w-full text-center text-xl md:text-2xl xl:text-xl 2xl:text-3xl">
        {showUnlockForm && (
          <div className="enter-x mb-2 text-2xl md:text-3xl">
            {hour}:{minute}
            <span className="text-base md:text-lg">{meridiem}</span>
          </div>
        )}
        <div className="text-xl md:text-3xl">{date}</div>
      </div>
    </div>
  );
}
