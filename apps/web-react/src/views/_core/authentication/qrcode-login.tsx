/**
 * 二维码登录 —— 与官方 web-antd qrcode-login.vue + common-ui qrcode-login.vue 1:1 对齐
 * 二维码内容：https://vben.vvbin.cn（errorCorrectionLevel H, margin 4）
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

import { Button } from '#/components/ui/button';
import { $t } from '#/locales';
import { LOGIN_PATH } from '#/constants';
import { AuthTitle } from '#/views/_core/authentication/auth-title';

/** 认证二维码登录（与官方 AuthenticationQrCodeLogin 1:1 对齐） */
export function AuthenticationQrCodeLogin({
  loginPath = LOGIN_PATH,
}: {
  loginPath?: string;
}) {
  const navigate = useNavigate();
  const [qrcode, setQrcode] = useState('');

  useEffect(() => {
    QRCode.toDataURL('https://vben.vvbin.cn', {
      errorCorrectionLevel: 'H',
      margin: 4,
      width: 160,
    })
      .then(setQrcode)
      .catch(() => setQrcode(''));
  }, []);

  return (
    <div>
      <AuthTitle desc={$t('authentication.qrcodeSubtitle')}>
        {$t('authentication.welcomeBack')} 📱
      </AuthTitle>

      <div className="mt-6 flex-col-center">
        {qrcode && <img alt="qrcode" className="w-1/2" src={qrcode} />}
        <p className="mt-4 text-sm text-muted-foreground">
          {$t('authentication.qrcodePrompt')}
        </p>
      </div>

      <Button
        className="mt-4 w-full"
        variant="outline"
        onClick={() => navigate(loginPath)}
      >
        {$t('common.back')}
      </Button>
    </div>
  );
}

export default function QrCodeLogin() {
  return <AuthenticationQrCodeLogin />;
}
