/**
 * 登录页 —— 与官方 apps/web-antd/src/views/_core/authentication/login.vue
 * 以及 common-ui/ui/authentication/login.vue 1:1 对齐
 * 表单字段：快速选择账号 / 账号 / 密码 / 滑块验证码
 */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import GithubSvg from '#/assets/svg/github.svg';
import GoogleSvg from '#/assets/svg/google.svg';
import QQChatSvg from '#/assets/svg/qqchat.svg';
import WeChatSvg from '#/assets/svg/wechat.svg';
import { Button } from '#/components/ui/button';
import { IconButton } from '#/components/ui/icon-button';
import { Input } from '#/components/ui/input';
import { VbenCheckbox } from '#/components/ui/vben-checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { SliderCaptcha } from '#/components/captcha/slider-captcha';
import { $t } from '#/locales';
import { usePreferencesStore } from '#/preferences/store';
import { useAuthStore } from '#/stores/auth';
import { useUserStore } from '#/stores/user';
import { AuthTitle } from '#/views/_core/authentication/auth-title';

/** 记住我 key（与官方一致） */
const REMEMBER_ME_KEY = `REMEMBER_ME_USERNAME_${location.hostname}`;

/** 快速选择账号（与官方 MOCK_USER_OPTIONS 1:1） */
const MOCK_USER_OPTIONS = [
  { label: 'Super', value: 'vben' },
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'jack' },
];

/**
 * 选择账号时自动填充的口令
 *
 * 官方写死 123456（官方 backend-mock 的口令就是这个），但本项目 React 版
 * 固定对接 backend-rust，其种子口令取自 `apps/backend-rust/.env` 的
 * SEED_PASSWORD，两者不一致会导致「选了账号点登录没反应」（401）。
 * 因此改成读 `VITE_DEMO_PASSWORD`，在 apps/web-react/.env.development 里配置。
 */
const DEMO_PASSWORD = (import.meta.env.VITE_DEMO_PASSWORD as string) ?? '';

/**
 * 表单字段外壳 —— 对齐官方 form-field.vue 的实际渲染结构：
 * `<div class="relative flex shrink-0 flex-row items-center pb-4"><div class="flex-auto overflow-hidden p-px">…`
 * 官方 commonConfig 为 hideLabel:true，因此不渲染 label（账号/密码等文字只作为 placeholder）
 */
function FormItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex shrink-0 flex-row items-center pb-4">
      <div className="flex-auto overflow-hidden p-px">{children}</div>
    </div>
  );
}

/** 第三方登录（与官方 third-party-login.vue 1:1 对齐：VbenIconButton + 品牌 SVG + tooltip 在上方） */
function ThirdPartyLogin() {
  const items = [
    { icon: WeChatSvg, label: $t('authentication.wechatLogin') },
    { icon: QQChatSvg, label: $t('authentication.qqLogin') },
    { icon: GithubSvg, label: $t('authentication.githubLogin') },
    { icon: GoogleSvg, label: $t('authentication.googleLogin') },
  ];
  return (
    <div className="w-full sm:mx-auto md:max-w-md">
      <div className="mt-4 flex items-center justify-between">
        <span className="w-[35%] border-b border-input dark:border-gray-600" />
        <span className="text-center text-xs text-muted-foreground uppercase">
          {$t('authentication.thirdPartyLogin')}
        </span>
        <span className="w-[35%] border-b border-input dark:border-gray-600" />
      </div>
      <div className="mt-4 flex flex-wrap justify-center">
        {items.map((item) => (
          <IconButton
            key={item.label}
            className="mb-3"
            tooltip={item.label}
            tooltipSide="top"
          >
            <img alt={item.label} className="size-4.5" src={item.icon} />
          </IconButton>
        ))}
      </div>
    </div>
  );
}

/** 认证登录表单（与官方 AuthenticationLogin 1:1 对齐） */
export function AuthenticationLogin({
  loading = false,
  onSubmit,
}: {
  loading?: boolean;
  onSubmit?: (values: Record<string, any>) => void;
}) {
  const navigate = useNavigate();
  const [selectAccount, setSelectAccount] = useState('vben');
  /**
   * 账号/密码初值 —— 对齐官方 login.vue：
   * selectAccount 默认 'vben'，依赖触发器立即回填 password='123456'、username='vben'；
   * 若本地记住过账号，则 onMounted 用记住的账号覆盖 username。
   */
  const [username, setUsername] = useState(() => {
    return localStorage.getItem(REMEMBER_ME_KEY) || 'vben';
  });
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [captcha, setCaptcha] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => !!localStorage.getItem(REMEMBER_ME_KEY),
  );
  const [error, setError] = useState('');

  /** 选择账号联动填充账号密码（对齐官方 dependencies.trigger） */
  function handleSelectAccount(value: string) {
    setSelectAccount(value);
    const findUser = MOCK_USER_OPTIONS.find((item) => item.value === value);
    if (findUser) {
      setUsername(findUser.value);
      if (DEMO_PASSWORD) setPassword(DEMO_PASSWORD);
    }
  }

  async function handleSubmit() {
    setError('');
    if (!username) {
      setError($t('authentication.usernameTip'));
      return;
    }
    if (!password) {
      setError($t('authentication.passwordTip'));
      return;
    }
    if (!captcha) {
      setError($t('authentication.verifyRequiredTip'));
      return;
    }
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? username : '');
    // 提交失败必须可见：官方后台落错误码不同（401 口令错 / 429 限流 / 403 …），
    // 这里把请求层透传的 message 直接展示；否则 Promise 拒绝被静默吞掉，
    // 表现就是「点登录按钮没反应，也没有任何提示」。
    try {
      await onSubmit?.({ password, username });
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : $t('authentication.passwordErrorTip'),
      );
    }
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
      }}
    >
      <AuthTitle desc={$t('authentication.loginSubtitle')}>
        {$t('authentication.welcomeBack')} 👋🏻
      </AuthTitle>

      {/* 官方 VbenForm 渲染为 <form> + `grid grid-cols-1 gap-x-4 flex-col` */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid grid-cols-1 flex-col gap-x-4">
          <FormItem>
            <Select value={selectAccount} onValueChange={handleSelectAccount}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={$t('authentication.selectAccount')} />
              </SelectTrigger>
              <SelectContent>
                {MOCK_USER_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem>
            <Input
              className="h-10"
              placeholder={$t('authentication.usernameTip')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </FormItem>

          <FormItem>
            <Input
              className="h-10"
              placeholder={$t('authentication.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormItem>

          <FormItem>
            <SliderCaptcha value={captcha} onChange={setCaptcha} />
          </FormItem>
        </div>
      </form>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="mb-6 flex justify-between">
        <div className="flex-center">
          <VbenCheckbox
            checked={rememberMe}
            onCheckedChange={(v) => setRememberMe(!!v)}
          >
            {$t('authentication.rememberMe')}
          </VbenCheckbox>
        </div>
        <span
          className="vben-link cursor-pointer text-sm font-normal"
          onClick={() => navigate('/auth/forget-password')}
        >
          {$t('authentication.forgetPassword')}
        </span>
      </div>

      <Button
        aria-label="login"
        className={`w-full ${loading ? 'cursor-wait' : ''}`}
        loading={loading}
        onClick={handleSubmit}
      >
        {$t('common.login')}
      </Button>

      <div className="mt-4 mb-2 flex items-center justify-between">
        <Button
          className="w-1/2"
          variant="outline"
          onClick={() => navigate('/auth/code-login')}
        >
          {$t('authentication.mobileLogin')}
        </Button>
        <Button
          className="ml-4 w-1/2"
          variant="outline"
          onClick={() => navigate('/auth/qrcode-login')}
        >
          {$t('authentication.qrcodeLogin')}
        </Button>
      </div>

      <ThirdPartyLogin />

      <div className="mt-3 text-center text-sm">
        {$t('authentication.accountTip')}
        <span
          className="vben-link cursor-pointer text-sm font-normal"
          onClick={() => navigate('/auth/register')}
        >
          {$t('authentication.createAccount')}
        </span>
      </div>
    </div>
  );
}

/** 登录视图（与官方 login.vue 1:1 对齐） */
export default function Login() {
  const loginLoading = useAuthStore((state) => state.loginLoading);
  const authLogin = useAuthStore((state) => state.authLogin);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userInfo = useUserStore((state) => state.userInfo);
  const preferences = usePreferencesStore((state) => state.preferences);

  const formSchema = useMemo(() => [], []);

  return (
    <AuthenticationLogin
      loading={loginLoading}
      onSubmit={(values) =>
        // 对齐官方守卫 from.query.redirect 回跳逻辑（官方 guard.ts:110-118）：
        // 登录成功后优先跳 redirect 参数，否则跳 homePath / 默认首页
        authLogin(values, async () => {
          const redirect = searchParams.get('redirect');
          navigate(
            redirect
              ? decodeURIComponent(redirect)
              : userInfo?.homePath || preferences.app.defaultHomePath,
            { replace: true },
          );
        })
      }
    />
  );
}
