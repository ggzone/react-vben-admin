/**
 * 个人中心 —— 新消息提醒
 * 与官方 apps/web-antd/src/views/_core/profile/notification-setting.vue 1:1 对齐
 * 3 个开关项（与安全设置同构）
 */
import { Switch } from '#/components/ui/switch';

export interface NotificationSettingItem {
  value: boolean;
  fieldName: string;
  label: string;
  description: string;
}

export function ProfileNotificationSetting({
  items,
}: {
  items: NotificationSettingItem[];
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.fieldName}
            className="flex flex-row items-center justify-between rounded-lg border p-4"
          >
            <div className="space-y-0.5">
              <div className="text-base">{item.label}</div>
              <p className="text-muted-foreground text-sm">
                {item.description}
              </p>
            </div>
            <Switch defaultChecked={item.value} />
          </div>
        ))}
      </div>
    </div>
  );
}
