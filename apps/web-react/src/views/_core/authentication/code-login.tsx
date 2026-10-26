/**
 * 手机号登录 —— 与官方 web-antd code-login.vue + common-ui code-login.vue 1:1 对齐
 * 表单字段：手机号（11 位校验）+ 6 位验证码 PinInput
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { $t } from '#/locales';
import { AuthTitle } from '#/views/_core/authentication/auth-title';

const CODE_LENGTH = 6;

/** 验证码输入（对齐官方 VbenPinInput 视觉） */
function PinInput({
  codeLength,
  createText,
  value,
  onChange,
}: {
  codeLength: number;
  createText: (countdown: number) => string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [countdown, setCountdown] = useState(0);

  function handleSend() {
    if (countdown > 0) return;
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        className="h-10 flex-1 tracking-[0.5em]"
        inputMode="numeric"
        maxLength={codeLength}
        placeholder={$t('authentication.code')}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
      <Button
        className="h-10 whitespace-nowrap"
        disabled={countdown > 0}
        variant="outline"
        onClick={handleSend}
      >
        {createText(countdown)}
      </Button>
    </div>
  );
}

/** 手机号登录（与官方 AuthenticationCodeLogin 1:1 对齐） */
export function AuthenticationCodeLogin({
  loading = false,
  onSubmit,
}: {
  loading?: boolean;
  onSubmit?: (values: Record<string, any>) => void;
}) {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    setError('');
    if (!phoneNumber) {
      setError($t('authentication.mobileTip'));
      return;
    }
    if (!/^\d{11}$/.test(phoneNumber)) {
      setError($t('authentication.mobileErrortip'));
      return;
    }
    if (code.length !== CODE_LENGTH) {
      setError($t('authentication.codeTip', [CODE_LENGTH]));
      return;
    }
    onSubmit?.({ code, phoneNumber });
  }

  return (
    <div>
      <AuthTitle desc={$t('authentication.codeSubtitle')}>
        {$t('authentication.welcomeBack')} 📲
      </AuthTitle>

      <div className="mb-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          {$t('authentication.mobile')}
        </span>
        <Input
          className="h-10"
          placeholder={$t('authentication.mobile')}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="mb-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          {$t('authentication.code')}
        </span>
        <PinInput
          codeLength={CODE_LENGTH}
          createText={(countdown) =>
            countdown > 0
              ? $t('authentication.sendText', [countdown])
              : $t('authentication.sendCode')
          }
          value={code}
          onChange={setCode}
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Button
        className={`w-full ${loading ? 'cursor-wait' : ''}`}
        disabled={loading}
        onClick={handleSubmit}
      >
        {$t('common.login')}
      </Button>
      <Button
        className="mt-4 w-full"
        variant="outline"
        onClick={() => navigate('/auth/login')}
      >
        {$t('common.back')}
      </Button>
    </div>
  );
}

export default function CodeLogin() {
  return <AuthenticationCodeLogin />;
}
