/**
 * Logo 组件 —— 与官方 @vben-core/shadcn-ui VbenLogo 1:1 对齐
 */
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { cn } from '#/lib/utils';

export interface LogoProps {
  collapsed?: boolean;
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  src?: string;
  srcDark?: string;
  text: string;
  theme?: 'dark' | 'light';
  className?: string;
}

export function Logo({
  collapsed = false,
  fit = 'cover',
  src = '',
  srcDark = '',
  text,
  theme = 'light',
  className,
}: LogoProps) {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const logoSrc = isDark && srcDark ? srcDark : src;

  return (
    <div className={cn(theme, 'flex h-full items-center text-lg')}>
      <a
        className={cn(
          'flex h-full items-center gap-2 overflow-hidden px-3 text-lg leading-normal transition-all duration-500',
          className,
        )}
        href="javascript:void 0"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
      >
        {logoSrc && (
          <Avatar
            alt={text}
            className="relative size-8 rounded-none bg-transparent"
          >
            <AvatarImage src={logoSrc} style={{ objectFit: fit }} />
            <AvatarFallback className="rounded-none bg-transparent">
              {text?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
        {!collapsed && (
          <span className="text-foreground truncate font-semibold text-nowrap">
            {text}
          </span>
        )}
      </a>
    </div>
  );
}

export default Logo;
