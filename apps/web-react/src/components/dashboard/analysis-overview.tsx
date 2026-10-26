/**
 * AnalysisOverview —— 与官方 @vben/common-ui analysis-overview.vue 1:1 对齐
 * Card + CountToAnimator 数字动画，4 项指标卡片网格
 */
import type { ReactElement, ReactNode, SVGProps } from 'react';
import { cloneElement } from 'react';

import { CountToAnimator } from '#/components/dashboard/count-to-animator';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import { cn } from '#/lib/utils';

export interface AnalysisOverviewItem {
  icon: ReactNode;
  title: string;
  totalTitle: string;
  totalValue: number;
  value: number;
}

export function AnalysisOverview({
  items,
  className,
}: {
  items: AnalysisOverviewItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <Card key={item.title} className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <CountToAnimator
              endVal={item.value}
              startVal={1}
              className="text-xl"
              prefix=""
            />
            {/* 官方 VbenIcon 直接把 class 打到 svg 上（svg 本身 32x32）；
                若外面再套 span，行内基线会给卡片多出 4px 高度 */}
            {cloneElement(item.icon as ReactElement<SVGProps<SVGSVGElement>>, {
              className: 'size-8 shrink-0',
            })}
          </CardContent>
          <CardFooter className="justify-between">
            <span>{item.totalTitle}</span>
            <CountToAnimator endVal={item.totalValue} startVal={1} prefix="" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
