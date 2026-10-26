/**
 * AnalysisChartsTabs —— 与官方 @vben/common-ui analysis-charts-tabs.vue 1:1 对齐
 * card-box 容器 + Tabs，按 tab.value 命名插槽（React 用 Record 映射）
 */
import type { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs';
import { cn } from '#/lib/utils';

export interface TabOption {
  label: string;
  value: string;
}

export function AnalysisChartsTabs({
  tabs,
  className,
  children,
}: {
  tabs: TabOption[];
  className?: string;
  /** key 为 tab.value，value 为对应内容 */
  children: Record<string, ReactNode>;
}) {
  const defaultValue = tabs?.[0]?.value;

  return (
    <div className={cn('card-box w-full px-4 pt-3 pb-5', className)}>
      <Tabs defaultValue={defaultValue}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.label} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.label} value={tab.value} className="pt-4">
            {children[tab.value]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
