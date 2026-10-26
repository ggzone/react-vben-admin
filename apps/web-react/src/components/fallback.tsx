/**
 * Fallback 组件 —— 与官方 @vben/common-ui fallback.vue 1:1 对齐
 * 支持 403/404/500/coming-soon/offline 五种状态
 */
import { ArrowLeft, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '#/components/ui/button';
import { $t } from '#/locales';
import {
  Icon403,
  Icon404,
  Icon500,
  IconComingSoon,
  IconOffline,
} from '#/views/_core/fallback/icons';

export type FallbackStatus = '403' | '404' | '500' | 'coming-soon' | 'offline';

const TITLE_MAP: Record<FallbackStatus, string> = {
  '403': 'ui.fallback.forbidden',
  '404': 'ui.fallback.pageNotFound',
  '500': 'ui.fallback.internalError',
  'coming-soon': 'ui.fallback.comingSoon',
  offline: 'ui.fallback.offlineError',
};

const DESC_MAP: Record<FallbackStatus, string> = {
  '403': 'ui.fallback.forbiddenDesc',
  '404': 'ui.fallback.pageNotFoundDesc',
  '500': 'ui.fallback.internalErrorDesc',
  'coming-soon': 'ui.fallback.comingSoon',
  offline: 'ui.fallback.offlineErrorDesc',
};

const ICON_MAP: Record<
  FallbackStatus,
  React.FC<React.SVGProps<SVGSVGElement>> | null
> = {
  '403': Icon403,
  '404': Icon404,
  '500': Icon500,
  'coming-soon': IconComingSoon,
  offline: IconOffline,
};

export function Fallback({
  status = 'coming-soon',
  title,
  description,
  homePath = '/',
}: {
  status?: FallbackStatus;
  title?: string;
  description?: string;
  homePath?: string;
}) {
  const navigate = useNavigate();
  const titleText = title || $t(TITLE_MAP[status]);
  const descText = description || $t(DESC_MAP[status]);
  const FallbackIcon = ICON_MAP[status];
  const showBack = status === '403' || status === '404';
  const showRefresh = status === '500' || status === 'offline';

  return (
    <div className="flex-col-center size-full duration-300">
      {FallbackIcon && <FallbackIcon className="md:1/3 h-1/3 w-1/2 lg:w-1/4" />}
      <div className="flex-col-center">
        {titleText && (
          <p className="mt-8 text-2xl text-foreground md:text-3xl lg:text-4xl">
            {titleText}
          </p>
        )}
        {descText && (
          <p className="md:text-md my-4 text-muted-foreground lg:text-lg">
            {descText}
          </p>
        )}
        {showBack && (
          <Button size="lg" onClick={() => navigate(homePath)}>
            <ArrowLeft className="mr-2 size-4" />
            {$t('common.backToHome')}
          </Button>
        )}
        {showRefresh && (
          <Button size="lg" onClick={() => location.reload()}>
            <RotateCw className="mr-2 size-4" />
            {$t('common.refresh')}
          </Button>
        )}
      </div>
    </div>
  );
}
