/**
 * 个人中心
 * 与官方 apps/web-antd/src/views/_core/profile/index.vue 1:1 对齐
 * 4 个页签：基本设置/安全设置/修改密码/新消息提醒
 */
import * as React from 'react';

import { Profile } from '#/components/profile';
import { useUserStore } from '#/stores/user';
import { ProfileBaseSetting } from '#/views/_core/profile/base-setting';
import { ProfileNotificationSetting } from '#/views/_core/profile/notification-setting';
import { ProfilePasswordSetting } from '#/views/_core/profile/password-setting';
import { ProfileSecuritySetting } from '#/views/_core/profile/security-setting';

const tabs = [
  { label: '基本设置', value: 'basic' },
  { label: '安全设置', value: 'security' },
  { label: '修改密码', value: 'password' },
  { label: '新消息提醒', value: 'notice' },
];

const SECURITY_ITEMS = [
  {
    value: true,
    fieldName: 'accountPassword',
    label: '账户密码',
    description: '当前密码强度：强',
  },
  {
    value: true,
    fieldName: 'securityPhone',
    label: '密保手机',
    description: '已绑定手机：138****8293',
  },
  {
    value: true,
    fieldName: 'securityQuestion',
    label: '密保问题',
    description: '未设置密保问题，密保问题可有效保护账户安全',
  },
  {
    value: true,
    fieldName: 'securityEmail',
    label: '备用邮箱',
    description: '已绑定邮箱：ant***sign.com',
  },
  {
    value: false,
    fieldName: 'securityMfa',
    label: 'MFA 设备',
    description: '未绑定 MFA 设备，绑定后，可以进行二次确认',
  },
];

const NOTIFICATION_ITEMS = [
  {
    value: true,
    fieldName: 'accountPassword',
    label: '账户密码',
    description: '其他用户的消息将以站内信的形式通知',
  },
  {
    value: true,
    fieldName: 'systemMessage',
    label: '系统消息',
    description: '系统消息将以站内信的形式通知',
  },
  {
    value: true,
    fieldName: 'todoTask',
    label: '待办任务',
    description: '待办任务将以站内信的形式通知',
  },
];

export default function ProfilePage() {
  const userStore = useUserStore();
  const [tabsValue, setTabsValue] = React.useState('basic');

  return (
    <Profile
      title="个人中心"
      userInfo={userStore.userInfo}
      tabs={tabs}
      activeTab={tabsValue}
      onTabChange={setTabsValue}
    >
      {tabsValue === 'basic' && <ProfileBaseSetting />}
      {tabsValue === 'security' && (
        <ProfileSecuritySetting items={SECURITY_ITEMS} />
      )}
      {tabsValue === 'password' && <ProfilePasswordSetting />}
      {tabsValue === 'notice' && (
        <ProfileNotificationSetting items={NOTIFICATION_ITEMS} />
      )}
    </Profile>
  );
}
