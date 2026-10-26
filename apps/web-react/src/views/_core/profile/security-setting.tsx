/**
 * 个人中心 —— 安全设置
 * 与官方 apps/web-antd/src/views/_core/profile/security-setting.vue 1:1 对齐
 * 5 个开关项（border p-4，左标签+描述，右 Switch）
 */
import { Switch } from '#/components/ui/switch';

export interface SecuritySettingItem {
  value: boolean;
  fieldName: string;
  label: string;
  description: string;
}

export function ProfileSecuritySetting({
  items,
}: {
  items: SecuritySettingItem[];
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
