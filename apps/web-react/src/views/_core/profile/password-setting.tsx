/**
 * 个人中心 —— 修改密码
 * 与官方 apps/web-antd/src/views/_core/profile/password-setting.vue 1:1 对齐
 * 旧密码/新密码（强度条）/确认密码（强度条 + 与新密码一致性提示）+ 更新密码按钮
 */
import * as React from 'react';

import { Button } from '#/components/ui/button';
import { InputPassword } from '#/components/ui/input-password';

function FormItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start">
      <label className="w-[130px] shrink-0 pt-2 text-right text-sm font-medium">
        {label}
      </label>
      <div className="flex-1 pl-3">{children}</div>
    </div>
  );
}

export function ProfilePasswordSetting() {
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写完整的密码信息');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setError('');
    // 对齐官方 message.success('密码修改成功')
    console.log('密码修改成功');
  };

  return (
    <div>
      <FormItem label="旧密码">
        <InputPassword
          placeholder="请输入旧密码"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </FormItem>
      <FormItem label="新密码">
        <InputPassword
          passwordStrength
          placeholder="请输入新密码"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </FormItem>
      <FormItem label="确认密码">
        <InputPassword
          passwordStrength
          placeholder="请再次输入新密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </FormItem>
      {error && (
        <p className="mb-4 ml-[130px] text-sm text-destructive">{error}</p>
      )}
      <Button className="mt-4 ml-[130px]" onClick={handleSubmit}>
        更新密码
      </Button>
    </div>
  );
}
