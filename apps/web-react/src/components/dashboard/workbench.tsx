/**
 * Workbench 组件群 —— 与官方 packages/effects/common-ui/src/ui/dashboard/workbench/ 1:1 对齐
 * 含 WorkbenchHeader / WorkbenchProject / WorkbenchQuickNav / WorkbenchTodo / WorkbenchTrends
 */
import type { ReactNode } from 'react';

import { VbenIcon } from '#/components/icon';
import { Avatar } from '#/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { Checkbox } from '#/components/ui/checkbox';
import { cn } from '#/lib/utils';

export interface WorkbenchProjectItem {
  color?: string;
  content: string;
  date: string;
  group: string;
  icon: string;
  title: string;
  url?: string;
}

export interface WorkbenchTrendItem {
  avatar: string;
  content: string;
  date: string;
  title: string;
}

export interface WorkbenchTodoItem {
  completed: boolean;
  content: string;
  date: string;
  title: string;
}

export interface WorkbenchQuickNavItem {
  color?: string;
  icon: string;
  title: string;
  url?: string;
}

/** WorkbenchHeader —— 官方 workbench-header.vue */
export function WorkbenchHeader({
  avatar,
  title,
  description,
}: {
  avatar?: string;
  title?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="card-box flex flex-col p-4 py-6 lg:flex-row">
      <Avatar alt="" className="size-20" src={avatar} />
      <div className="flex flex-col justify-center md:mt-0 md:ml-6">
        {title && <h1 className="text-md font-semibold md:text-xl">{title}</h1>}
        {description && (
          <span className="mt-1 text-foreground/80">{description}</span>
        )}
      </div>
      <div className="mt-4 flex flex-1 justify-end md:mt-0">
        <div className="flex flex-col justify-center text-right">
          <span className="text-foreground/80"> 待办 </span>
          <span className="text-2xl">2/10</span>
        </div>
        <div className="mx-12 flex flex-col justify-center text-right md:mx-16">
          <span className="text-foreground/80"> 项目 </span>
          <span className="text-2xl">8</span>
        </div>
        <div className="mr-4 flex flex-col justify-center text-right md:mr-10">
          <span className="text-foreground/80"> 团队 </span>
          <span className="text-2xl">300</span>
        </div>
      </div>
    </div>
  );
}

/** WorkbenchProject —— 官方 workbench-project.vue */
export function WorkbenchProject({
  items = [],
  title,
  className,
  onClick,
}: {
  items?: WorkbenchProjectItem[];
  title: string;
  className?: string;
  onClick?: (item: WorkbenchProjectItem) => void;
}) {
  return (
    <Card className={className}>
      <CardHeader className="py-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap p-0">
        {items.map((item, index) => (
          <div
            key={item.title}
            className={cn(
              'group w-full cursor-pointer border-t border-r border-border p-4 transition-all hover:shadow-xl md:w-1/2 lg:w-1/3',
              {
                'border-r-0': index % 3 === 2,
                'border-b-0': index < 3,
                'pb-4': index > 2,
                'rounded-bl-xl': index === items.length - 3,
                'rounded-br-xl': index === items.length - 1,
              },
            )}
            onClick={() => onClick?.(item)}
          >
            <div className="flex items-center">
              <VbenIcon
                color={item.color}
                icon={item.icon}
                className="size-8 transition-all duration-300 group-hover:scale-110"
              />
              <span className="ml-4 text-lg font-medium">{item.title}</span>
            </div>
            <div className="mt-4 flex h-10 text-foreground/80">
              {item.content}
            </div>
            <div className="flex justify-between text-foreground/80">
              <span>{item.group}</span>
              <span>{item.date}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** WorkbenchQuickNav —— 官方 workbench-quick-nav.vue */
export function WorkbenchQuickNav({
  items = [],
  title,
  className,
  onClick,
}: {
  items?: WorkbenchQuickNavItem[];
  title: string;
  className?: string;
  onClick?: (item: WorkbenchQuickNavItem) => void;
}) {
  return (
    <Card className={className}>
      <CardHeader className="py-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap p-0">
        {items.map((item, index) => (
          <div
            key={item.title}
            className={cn(
              'group flex-col-center w-1/3 cursor-pointer border-t border-r border-border py-8 hover:shadow-xl',
              {
                'border-r-0': index % 3 === 2,
                'border-b-0': index < 3,
                'pb-4': index > 2,
                'rounded-bl-xl': index === items.length - 3,
                'rounded-br-xl': index === items.length - 1,
              },
            )}
            onClick={() => onClick?.(item)}
          >
            <VbenIcon
              color={item.color}
              icon={item.icon}
              className="size-7 transition-all duration-300 group-hover:scale-125"
            />
            <span className="text-md mt-2 truncate">{item.title}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** WorkbenchTodo —— 官方 workbench-todo.vue（content 含 <a> 标签，与官方 v-html 一致用原始 HTML） */
export function WorkbenchTodo({
  items = [],
  title,
  className,
}: {
  items?: WorkbenchTodoItem[];
  title: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="py-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap p-5 pt-0">
        <ul className="w-full divide-y divide-border" role="list">
          {items.map((item) => (
            <li
              key={item.title}
              className={cn(
                'flex cursor-pointer justify-between gap-x-6 py-5',
                item.completed && 'line-through opacity-60 select-none',
              )}
            >
              <div className="flex min-w-0 items-center gap-x-4">
                {/* 对齐官方 VbenCheckbox：Checkbox 外层还有 div.flex.items-center 与一个空 label.ml-2，
                    这个 8px 的 label 内距会推开右侧文字，直接渲染 Checkbox 会让整块文本左移 8px */}
                <div className="flex items-center">
                  <Checkbox defaultChecked={item.completed} name="completed" />
                  <label className="ml-2 cursor-pointer text-sm" />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="text-sm/6 font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p
                    className="mt-1 truncate text-xs/5 text-foreground/80 *:text-primary"
                    // 与官方 v-html 一致：content 为可信静态数据，含 <a> 标签
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </div>
              </div>
              <div className="hidden h-full shrink-0 sm:flex sm:flex-col sm:items-end">
                <span className="mt-6 text-xs/6 text-foreground/80">
                  {item.date}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** WorkbenchTrends —— 官方 workbench-trends.vue */
export function WorkbenchTrends({
  items = [],
  title,
  className,
}: {
  items?: WorkbenchTrendItem[];
  title: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="py-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap p-5 pt-0">
        <ul className="w-full divide-y divide-border" role="list">
          {items.map((item) => (
            <li
              key={`${item.title}-${item.date}`}
              className="flex justify-between gap-x-6 py-5"
            >
              <div className="flex min-w-0 items-center gap-x-4">
                <VbenIcon
                  icon={item.avatar}
                  alt=""
                  className="size-10 flex-none rounded-full"
                />
                <div className="min-w-0 flex-auto">
                  <p className="text-sm/6 font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p
                    className="mt-1 truncate text-xs/5 text-foreground/80 *:text-primary"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </div>
              </div>
              <div className="hidden h-full shrink-0 sm:flex sm:flex-col sm:items-end">
                <span className="mt-6 text-xs/6 text-foreground/80">
                  {item.date}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
