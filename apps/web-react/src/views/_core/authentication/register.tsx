/**
 * 注册页 —— 与官方 web-antd register.vue + common-ui register.vue 1:1 对齐
 * 表单字段：账号 / 密码（强度提示）/ 确认密码 / 同意隐私政策
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '#/components/ui/button';
import { Checkbox } from '#/components/ui/checkbox';
import { Input } from '#/components/ui/input';
import { $t } from '#/locales';
import { LOGIN_PATH } from '#/constants';
import { AuthTitle } from '#/views/_core/authentication/auth-title';

/** 密码强度提示（对齐官方 passwordStrength 视觉） */
function PasswordStrength({ value }: { value: string }) {
  const strength = useMemo(() => {
    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }, [value]);

  if (!value) return null;

  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="flex h-1 flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full ${
              i < strength ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {$t('authentication.passwordStrength')}
      </span>
    </div>
  );
}

/** 注册表单（与官方 AuthenticationRegister 1:1 对齐） */
export function AuthenticationRegister({
  loading = false,
  onSubmit,
}: {
  loading?: boolean;
  onSubmit?: (values: Record<string, any>) => void;
}) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit() {
    setError('');
    if (!username) {
      setError($t('authentication.usernameTip'));
      return;
    }
    if (!password) {
      setError($t('authentication.passwordTip'));
      return;
    }
    if (password !== confirmPassword) {
      setError($t('authentication.confirmPasswordTip'));
      return;
    }
    if (!agreePolicy) {
      setError($t('authentication.agreeTip'));
      return;
    }
    onSubmit?.({ password, username });
  }

  return (
    <div>
      <AuthTitle desc={$t('authentication.signUpSubtitle')}>
        {$t('authentication.signUp')} 🚀
      </AuthTitle>

      <div className="mb-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          {$t('authentication.username')}
        </span>
        <Input
          className="h-10"
          placeholder={$t('authentication.usernameTip')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          {$t('authentication.password')}
        </span>
        <Input
          className="h-10"
          placeholder={$t('authentication.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength value={password} />
      </div>

      <div className="mb-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          {$t('authentication.confirmPassword')}
        </span>
        <Input
          className="h-10"
          placeholder={$t('authentication.confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <div className="mb-6 flex items-start gap-2 text-sm">
        <Checkbox
          checked={agreePolicy}
          onCheckedChange={(v) => setAgreePolicy(!!v)}
        />
        <span>
          {$t('authentication.agree')}
          <a className="vben-link ml-1" href="">
            {$t('authentication.privacyPolicy')} & {$t('authentication.terms')}
          </a>
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Button
        className={`w-full ${loading ? 'cursor-wait' : ''}`}
        disabled={loading}
        onClick={handleSubmit}
      >
        {$t('authentication.signUp')}
      </Button>

      <div className="mt-3 text-center text-sm">
        {$t('authentication.alreadyHaveAccount')}
        <span
          className="vben-link cursor-pointer text-sm font-normal"
          onClick={() => navigate(LOGIN_PATH)}
        >
          {$t('authentication.goToLogin')}
        </span>
      </div>
    </div>
  );
}

export default function Register() {
  return <AuthenticationRegister />;
}
