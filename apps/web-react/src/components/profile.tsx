/**
 * Profile 组件 —— 与官方 @vben/common-ui profile.vue（ProfileUI）1:1 对齐
 * 左侧用户信息卡片（头像/用户名/账号 + 竖向页签）+ 右侧内容卡片
 */
import type { ReactNode } from 'react';

import { Page } from '#/components/page';
import { Avatar } from '#/components/ui/avatar';
import { Card } from '#/components/ui/card';
import { Separator } from '#/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs';
import { usePreferences } from '#/preferences/store';
import type { UserInfo } from '#/api/core/user';

export interface ProfileTab {
  label: string;
  value: string;
}

export function Profile({
  title = '关于项目',
  userInfo,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  title?: string;
  userInfo: UserInfo | null;
  tabs: ProfileTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  children?: ReactNode;
}) {
  const preferences = usePreferences();

  return (
    // 官方 profile.vue 声明了 title prop 但未透传给 Page（`<Page auto-content-height>`），
    // 因此内容区不渲染标题栏 —— 这里保持一致
    <Page autoContentHeight>
      <div className="flex size-full">
        <Card className="w-1/6 flex-none">
          <div className="mt-4 flex-col-center h-40 gap-4">
            <Avatar
              alt=""
              className="size-20"
              src={userInfo?.avatar ?? preferences.app.defaultAvatar}
            />
            <span className="text-lg font-semibold">
              {userInfo?.realName ?? ''}
            </span>
            <span className="text-sm text-foreground/80">
              {userInfo?.username ?? ''}
            </span>
          </div>
          <Separator className="my-4" />
          <Tabs
            orientation="vertical"
            value={activeTab}
            onValueChange={onTabChange}
            className="m-4"
          >
            <TabsList className="grid w-full grid-cols-1 bg-card">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-12 justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </Card>
        <Card className="ml-4 w-5/6 flex-auto p-8">{children}</Card>
      </div>
    </Page>
  );
}
