/**
 * 锁屏 —— 与官方
 * packages/effects/layouts/src/widgets/lock-screen/{lock-screen-modal,lock-screen}.vue 对齐
 *
 * 两个组成部分：
 *  1. LockScreenSetupModal：用户下拉点「锁定屏幕」后弹出，输入锁屏密码并确认锁定
 *  2. LockScreen：锁定后的全屏遮罩（时间/日期 + 点击解锁 → 密码校验），
 *     校验通过调用 authStore.unlockScreen()
 *
 * 关键点（踩坑记录）：
 *  - 遮罩根节点必须显式 `inset-0`。官方把 lock-screen 放在 VbenLayout 的 #extra 插槽
 *    （静态位置正好是文档原点），而 React 端挂在 <main> 内；`position:fixed` 只写
 *    `size-full` 时 top/left 仍是 auto → 落在「静态位置」上（实测 x=224、y=1128），
 *    表现为遮罩背景不覆盖、时钟跑到屏幕外。
 *  - 弹窗按官方 VbenModal 结构复刻：520 宽 / top:10vh / header px-5 py-4 + border-b /
 *    body p-3 / 内容 px-10 / 输入框用 InputPassword（h-10 + 眼睛图标），字段外层
 *    `pb-4 + p-px`（对应官方 form-item 的 58px 步进）。
 */
import * as React from 'react';
import { LockKeyhole, X } from 'lucide-react';

import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '#/components/ui/dialog';
import { InputPassword } from '#/components/ui/input-password';
import { VbenAvatar } from '#/components/ui/vben-avatar';
import { $t } from '#/locales';
import { usePreferencesStore } from '#/preferences/store';
import { useAuthStore } from '#/stores/auth';
import { useUserStore } from '#/stores/user';

/** 星期文案按当前语言渲染（官方用 dayjs + locale 的 'YYYY-MM-DD dddd'） */
function useClock() {
  const locale = usePreferencesStore((state) => state.preferences.app.locale);
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  let weekday = '';
  try {
    weekday = new Intl.DateTimeFormat(locale || 'zh-CN', {
      weekday: 'long',
    }).format(now);
  } catch {
    weekday = '';
  }
  return {
    hour: pad(now.getHours()),
    minute: pad(now.getMinutes()),
    meridiem: now.getHours() < 12 ? 'AM' : 'PM',
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${weekday}`.trim(),
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
  const inputRef = React.useRef<HTMLInputElement>(null);

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
      <DialogContent
        className="top-[10vh] w-[520px] max-w-[520px] translate-y-0 gap-0 overflow-hidden p-0"
        showClose={false}
        onOpenAutoFocus={(event) => {
          // 对齐官方 VbenModal.onOpened：打开后把焦点放到密码框
          // （Radix 默认会把焦点交给内容容器，输入框不会自动获得焦点/聚焦环）
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {/* 官方 VbenModal 头部：px-5 py-4 + border-b */}
        <div className="flex flex-col gap-y-1.5 border-b px-5 py-4 text-center sm:text-left">
          <DialogTitle>{$t('ui.widgets.lockScreen.title')}</DialogTitle>
        </div>
        {/* 官方 VbenModal 内容容器：relative min-h-40 flex-1 overflow-y-auto p-3 */}
        <div className="relative min-h-40 flex-1 overflow-y-auto p-3">
          <div
            className="mb-10 flex w-full flex-col items-center px-10"
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
              {/* 官方 form-item：外层 pb-4、内层 p-px（输入 40 → 字段总高 58） */}
              <div className="relative flex shrink-0 flex-row items-center pb-4">
                <div className="flex-auto overflow-hidden p-px">
                  <InputPassword
                    ref={inputRef}
                    placeholder={$t('ui.widgets.lockScreen.placeholder')}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError('');
                    }}
                  />
                </div>
                {error && (
                  <div className="absolute top-[44px] left-1 text-xs text-destructive">
                    {error}
                  </div>
                )}
              </div>
              <Button className="mt-1 w-full" onClick={submit}>
                {$t('ui.widgets.lockScreen.screenButton')}
              </Button>
            </div>
          </div>
          <DialogDescription className="sr-only">
            {$t('ui.widgets.lockScreen.placeholder')}
          </DialogDescription>
        </div>
        {/* 官方 DialogContent 关闭按钮：top-3 right-3 h-6 w-6 rounded-full */}
        <DialogClose className="flex-center absolute top-3 right-3 h-6 w-6 rounded-full px-1 text-lg text-foreground/80 opacity-70 transition-opacity hover:bg-accent hover:text-accent-foreground hover:opacity-100">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
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
  const unlockInputRef = React.useRef<HTMLInputElement>(null);

  // 对齐官方 toggleUnlockForm：展开解锁表单后下一帧聚焦密码框
  React.useEffect(() => {
    if (!showUnlockForm) return;
    const id = requestAnimationFrame(() => unlockInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [showUnlockForm]);

  const submit = () => {
    if (!password) {
      setError($t('authentication.passwordTip'));
      return;
    }
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
    // inset-0 必须显式写：本组件挂载在 <main> 内，仅 size-full 时 fixed 会落在静态位置上
    <div className="fixed inset-0 z-2000 size-full bg-background">
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
              {/* 官方 <Form /> 单字段结构：pb-4 + p-px（输入 40 → 字段总高 58） */}
              <div className="relative flex shrink-0 flex-row items-center pb-4">
                <div className="flex-auto overflow-hidden p-px">
                  <InputPassword
                    ref={unlockInputRef}
                    placeholder={$t('ui.widgets.lockScreen.placeholder')}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError('');
                    }}
                  />
                </div>
                {error && (
                  <div className="absolute top-[44px] left-1 text-xs text-destructive">
                    {error}
                  </div>
                )}
              </div>
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
            {hour}:{minute}{' '}
            <span className="text-base md:text-lg">{meridiem}</span>
          </div>
        )}
        <div className="text-xl md:text-3xl">{date}</div>
      </div>
    </div>
  );
}
