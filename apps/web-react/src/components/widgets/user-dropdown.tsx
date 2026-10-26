/**
 * 用户下拉菜单 —— 与官方 user-dropdown.vue 1:1 对齐
 * 头像触发 + 用户信息头部（含 Pro 标签）+ 菜单项 + 偏好设置 + 退出登录（确认弹窗）
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenText,
  CircleHelp,
  LockKeyhole,
  LogOut,
  Settings,
  Github,
  User as UserIcon,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { VbenAvatar } from '#/components/ui/vben-avatar';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { LockScreenSetupModal } from '#/components/widgets/lock-screen';
import { VbenIcon } from '#/components/icon';
import { $t } from '#/locales';
import { VBEN_DOC_URL, VBEN_GITHUB_URL } from '#/constants';
import { usePreferencesStore } from '#/preferences/store';
import { useAuthStore } from '#/stores/auth';
import { useUserStore } from '#/stores/user';

export interface UserDropdownMenuItem {
  handler: () => void;
  icon?: React.ComponentType<{ className?: string }> | string;
  text: string;
}

export function UserDropdown({
  menus = [],
  onOpenPreferences,
}: {
  menus?: UserDropdownMenuItem[];
  onOpenPreferences?: () => void;
}) {
  const navigate = useNavigate();
  const userInfo = useUserStore((state) => state.userInfo);
  const preferences = usePreferencesStore((state) => state.preferences);
  const preferencesButtonPosition = preferences.app.preferencesButtonPosition;
  const logout = useAuthStore((state) => state.logout);
  const lockScreen = useAuthStore((state) => state.lockScreen);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);

  // 对齐官方 `altView = isWindowsOs() ? 'Alt' : '⌥'`（平台标识由 preferences 初始化写入）
  const altView =
    typeof document !== 'undefined' &&
    document.documentElement.dataset.platform === 'macOs'
      ? '⌥'
      : 'Alt';
  const enableShortcutKey = preferences.shortcutKeys.enable;

  const avatar = userInfo?.avatar ?? preferences.app.defaultAvatar;
  const text = userInfo?.realName ?? '';

  function handleLogout() {
    setLogoutOpen(false);
    logout(true);
  }

  return (
    <>
      {/* 退出登录确认弹窗（对齐官方 useVbenModal） */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="px-8 pb-3" showClose={false}>
          <DialogHeader>
            <DialogTitle>{$t('common.prompt')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="min-h-10 py-2">
            {$t('ui.widgets.logoutTip')}
          </DialogDescription>
          <DialogFooter className="mr-3 border-none pb-3">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              {$t('common.cancel')}
            </Button>
            <Button onClick={handleLogout}>{$t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 锁屏密码设置弹窗（对齐官方 LockScreenModal） */}
      <LockScreenSetupModal
        onLock={(password) => lockScreen(password)}
        onOpenChange={setLockOpen}
        open={lockOpen}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="mr-2 ml-1 cursor-pointer rounded-full p-1.5 hover:bg-accent">
            <div className="flex-center hover:text-accent-foreground">
              <VbenAvatar alt={text} className="size-8" dot src={avatar} />
            </div>
          </div>
        </DropdownMenuTrigger>
        {/* 官方 reka-ui 用 `mr-2` 让内容右缘对齐触发器右缘（wrapper 会多算 8px margin）；
            Radix 的对齐基于 wrapper，再加 mr-2 会额外左移 8px，故此处省略以取得一致几何 */}
        <DropdownMenuContent align="end" className="min-w-60 p-0 pb-1">
          <DropdownMenuLabel className="flex items-center p-3">
            <VbenAvatar
              alt={text}
              className="size-12"
              dot
              dotClass="right-1 bottom-0 size-4 border-2 bg-green-500"
              src={avatar}
            />
            <div className="ml-2 w-full">
              <div className="mb-1 flex items-center text-sm font-medium text-foreground">
                {text}
                <Badge className="ml-2 text-green-400">Pro</Badge>
              </div>
              <div className="text-xs font-normal text-muted-foreground">
                ann.vben@gmail.com
              </div>
            </div>
          </DropdownMenuLabel>
          {menus.length > 0 && <DropdownMenuSeparator />}
          {menus.map((menu) => (
            <DropdownMenuItem
              key={menu.text}
              className="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
              onClick={menu.handler}
            >
              {typeof menu.icon === 'string' ? (
                <VbenIcon className="mr-2 size-4" icon={menu.icon} />
              ) : menu.icon ? (
                <menu.icon className="mr-2 size-4" />
              ) : null}
              {menu.text}
            </DropdownMenuItem>
          ))}
          {/* 对齐官方：menus 之后的无条件分隔线 */}
          <DropdownMenuSeparator />
          {/* 对齐官方：仅当 preferencesButtonPosition.userDropdown 时展示 */}
          {preferencesButtonPosition === 'user-dropdown' && (
            <DropdownMenuItem
              className="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
              onClick={onOpenPreferences}
            >
              <Settings className="mr-2 size-4" />
              {$t('preferences.title')}
            </DropdownMenuItem>
          )}
          {preferences.widget.lockScreen && (
            <DropdownMenuItem
              className="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
              onClick={() => setLockOpen(true)}
            >
              <LockKeyhole className="mr-2 size-4" />
              {$t('ui.widgets.lockScreen.title')}
              {enableShortcutKey &&
                preferences.shortcutKeys.globalLockScreen && (
                  <DropdownMenuShortcut>{altView} L</DropdownMenuShortcut>
                )}
            </DropdownMenuItem>
          )}
          {preferences.widget.lockScreen && <DropdownMenuSeparator />}
          <DropdownMenuItem
            className="mx-1 flex cursor-pointer items-center rounded-sm py-1 leading-8"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="mr-2 size-4" />
            {$t('common.logout')}
            {enableShortcutKey && preferences.shortcutKeys.globalLogout && (
              <DropdownMenuShortcut>{altView} Q</DropdownMenuShortcut>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default UserDropdown;
