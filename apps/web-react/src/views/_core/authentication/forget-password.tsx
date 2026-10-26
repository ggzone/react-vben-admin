/**
 * 忘记密码 —— 与官方 web-antd forget-password.vue + common-ui forget-password.vue 1:1 对齐
 * 表单字段：邮箱
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { $t } from '#/locales';
import { LOGIN_PATH } from '#/constants';
import { AuthTitle } from '#/views/_core/authentication/auth-title';

/** 忘记密码表单（与官方 AuthenticationForgetPassword 1:1 对齐） */
export function AuthenticationForgetPassword({
  loading = false,
  onSubmit,
}: {
  loading?: boolean;
  onSubmit?: (values: Record<string, any>) => void;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    setError('');
    if (!email) {
      setError($t('authentication.emailTip'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError($t('authentication.emailValidErrorTip'));
      return;
    }
    onSubmit?.({ email });
  }

  return (
    <div>
      <AuthTitle desc={$t('authentication.forgetPasswordSubtitle')}>
        {$t('authentication.forgetPassword')} 🔒
      </AuthTitle>

      <div className="mb-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          {$t('authentication.email')}
        </span>
        <Input
          className="h-10"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Button
        className={`w-full ${loading ? 'cursor-wait' : ''}`}
        disabled={loading}
        onClick={handleSubmit}
      >
        {$t('authentication.sendResetLink')}
      </Button>
      <Button
        className="mt-4 w-full"
        variant="outline"
        onClick={() => navigate(LOGIN_PATH)}
      >
        {$t('common.back')}
      </Button>
    </div>
  );
}

export default function ForgetPassword() {
  return <AuthenticationForgetPassword />;
}
