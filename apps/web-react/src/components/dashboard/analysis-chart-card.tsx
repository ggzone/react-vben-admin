/**
 * AnalysisChartCard —— 与官方 @vben/common-ui analysis-chart-card.vue 1:1 对齐
 */
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { cn } from '#/lib/utils';

export function AnalysisChartCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
