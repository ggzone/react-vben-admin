/**
 * InputPassword 组件 —— 与官方 @vben-core/shadcn-ui input-password.vue 1:1 对齐
 * 含密码强度条（password-strength.vue：5 项检查，颜色阶梯对齐官方 strengthList）
 */
import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '#/components/ui/input';
import { cn } from '#/lib/utils';

const STRENGTH_LIST = [
  '',
  '#e74242',
  '#ED6F6F',
  '#EFBD47',
  '#55D18780',
  '#55D187',
];

/** 与官方 checkPasswordStrength 完全一致 */
function checkPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^\da-z]/i.test(password)) strength++;
  return strength;
}

function PasswordStrength({ password }: { password?: string }) {
  const currentStrength = checkPasswordStrength(password ?? '');
  const currentColor = STRENGTH_LIST[currentStrength];

  return (
    <div className="relative mt-2 flex items-center justify-between">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="bg-heavy dark:bg-input-background relative mr-1 h-1.5 w-1/5 rounded-sm last:mr-0"
        >
          <span
            style={{
              backgroundColor: currentColor,
              width: currentStrength >= index + 1 ? '100%' : '',
            }}
            className="absolute left-0 h-full w-0 rounded-sm transition-all duration-500"
          />
        </div>
      ))}
    </div>
  );
}

export interface InputPasswordProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 是否显示密码强度 */
  passwordStrength?: boolean;
  strengthText?: React.ReactNode;
}

export const InputPassword = React.forwardRef<
  HTMLInputElement,
  InputPasswordProps
>(
  (
    {
      className,
      passwordStrength = false,
      strengthText,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [show, setShow] = React.useState(false);
    const [innerValue, setInnerValue] = React.useState('');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? String(value) : innerValue;

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          className={cn(className)}
          type={show ? 'text' : 'password'}
          value={currentValue}
          onChange={(e) => {
            if (!isControlled) setInnerValue(e.target.value);
            onChange?.(e);
          }}
          {...props}
        />
        {passwordStrength && (
          <>
            <PasswordStrength password={currentValue} />
            {strengthText && (
              <p className="text-muted-foreground mt-1.5 text-xs">
                {strengthText}
              </p>
            )}
          </>
        )}
        <div
          className={cn(
            'text-foreground/60 hover:text-foreground absolute inset-y-0 right-0 flex cursor-pointer pr-3 text-lg leading-5',
            passwordStrength
              ? 'top-3'
              : 'top-1/2 -translate-y-1/2 items-center',
          )}
          onClick={() => setShow(!show)}
        >
          {show ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </div>
      </div>
    );
  },
);
InputPassword.displayName = 'InputPassword';
