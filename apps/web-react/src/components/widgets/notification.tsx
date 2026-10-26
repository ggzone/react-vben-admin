/**
 * 通知组件 —— 与官方 notification.vue 1:1 对齐
 * 铃铛按钮（含未读圆点 + 悬停摇摆动画）+ 弹出面板（列表 + 已读/删除 + 清空/查看全部）
 */
import { Bell, CircleCheckBig, CircleX, MailCheck } from 'lucide-react';

import { Button } from '#/components/ui/button';
import { IconButton } from '#/components/ui/icon-button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import { ScrollArea } from '#/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { $t } from '#/locales';

export interface NotificationItem {
  avatar?: string;
  date: string;
  id: number | string;
  isRead: boolean;
  link?: string;
  message: string;
  title: string;
}

interface NotificationProps {
  dot?: boolean;
  notifications: NotificationItem[];
  onClear?: () => void;
  onClick?: (item: NotificationItem) => void;
  onMakeAll?: () => void;
  onRead?: (item: NotificationItem) => void;
  onRemove?: (item: NotificationItem) => void;
  onViewAll?: () => void;
}

export function Notification({
  dot = false,
  notifications,
  onClear,
  onClick,
  onMakeAll,
  onRead,
  onRemove,
  onViewAll,
}: NotificationProps) {
  function handleViewAll() {
    onViewAll?.();
  }

  return (
    <Popover>
      {/* 对齐官方 notification.vue：外层 div.mr-2.flex-center.h-full 只做布局，
          触发器是里面的图标按钮（锚点高度 32px，弹层据此算 sideOffset） */}
      <div className="mr-2 flex-center h-full">
        <PopoverTrigger asChild>
          <IconButton
            aria-label={$t('ui.widgets.notifications')}
            className="bell-button relative text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {dot && (
              <span className="absolute top-0.5 right-0.5 size-2 rounded-sm bg-primary" />
            )}
            <Bell className="size-4" />
          </IconButton>
        </PopoverTrigger>
      </div>
      {/* 对齐官方：弹层不自动聚焦内部按钮，避免焦点触发「全部标记为已读」tooltip */}
      <PopoverContent
        className="relative right-2 w-90 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative">
          <div className="flex items-center justify-between p-4 py-3">
            <div className="text-foreground">
              {$t('ui.widgets.notifications')}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={notifications.length <= 0}
                  onClick={onMakeAll}
                  size="icon"
                  variant="ghost"
                >
                  <MailCheck className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{$t('ui.widgets.markAllAsRead')}</TooltipContent>
            </Tooltip>
          </div>
          {notifications.length > 0 ? (
            <ScrollArea className="max-h-90">
              <ul className="flex! max-h-90 w-full flex-col">
                {notifications.map((item) => (
                  <li
                    key={item.id ?? item.title}
                    className="relative flex w-full cursor-pointer items-start gap-5 border-t border-border p-3 hover:bg-accent"
                    onClick={() => onClick?.(item)}
                  >
                    {!item.isRead && (
                      <span className="absolute top-2 right-2 size-2 rounded-sm bg-primary" />
                    )}
                    <span className="relative flex size-10 shrink-0 overflow-hidden rounded-full">
                      {item.avatar ? (
                        <img
                          alt=""
                          className="aspect-square size-full object-cover"
                          src={item.avatar}
                        />
                      ) : null}
                    </span>
                    <div className="flex flex-col gap-1 leading-none">
                      <p className="font-semibold">{item.title}</p>
                      <p className="my-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.message}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.date}
                      </p>
                    </div>
                    <div className="absolute top-1/2 right-3 flex -translate-y-1/2 flex-row gap-1">
                      {!item.isRead ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              className="h-6 px-2"
                              size="xs"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRead?.(item);
                              }}
                            >
                              <CircleCheckBig className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {$t('common.confirm')}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              className="h-6 px-2 text-destructive"
                              size="xs"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove?.(item);
                              }}
                            >
                              <CircleX className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{$t('common.delete')}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <div className="flex-center min-h-37.5 w-full text-muted-foreground">
              {$t('common.noData')}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <Button
              disabled={notifications.length <= 0}
              onClick={onClear}
              size="sm"
              variant="ghost"
            >
              {$t('ui.widgets.clearNotifications')}
            </Button>
            <Button onClick={handleViewAll} size="sm">
              {$t('ui.widgets.viewAll')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default Notification;
