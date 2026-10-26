/**
 * 仪表盘 —— 工作台页
 * 与官方 apps/web-antd/src/views/dashboard/workspace/index.vue 1:1 对齐
 * 结构：p-5 + WorkbenchHeader + 左列（项目/最新动态）+ 右列（快捷导航/待办事项/访问来源饼图）
 */
import { useNavigate } from 'react-router-dom';

import {
  AnalysisChartCard,
  WorkbenchHeader,
  WorkbenchProject,
  WorkbenchQuickNav,
  WorkbenchTodo,
  WorkbenchTrends,
} from '#/components/dashboard';
import { AnalyticsVisitsSource } from '#/components/dashboard/analytics-charts';
import { openWindow } from '#/lib/utils';
import { defaultPreferences } from '#/preferences/config';
import { useUserStore } from '#/stores/user';

// 示例数据，与官方一致（url 支持内部路由与外部链接）
const projectItems = [
  {
    color: '',
    content: '不要等待机会，而要创造机会。',
    date: '2021-04-01',
    group: '开源组',
    icon: 'carbon:logo-github',
    title: 'Github',
    url: 'https://github.com',
  },
  {
    color: '#3fb27f',
    content: '现在的你决定将来的你。',
    date: '2021-04-01',
    group: '算法组',
    icon: 'ion:logo-vue',
    title: 'Vue',
    url: 'https://vuejs.org',
  },
  {
    color: '#e18525',
    content: '没有什么才能比努力更重要。',
    date: '2021-04-01',
    group: '上班摸鱼',
    icon: 'ion:logo-html5',
    title: 'Html5',
    url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTML',
  },
  {
    color: '#bf0c2c',
    content: '热情和欲望可以突破一切难关。',
    date: '2021-04-01',
    group: 'UI',
    icon: 'ion:logo-angular',
    title: 'Angular',
    url: 'https://angular.io',
  },
  {
    color: '#00d8ff',
    content: '健康的身体是实现目标的基石。',
    date: '2021-04-01',
    group: '技术牛',
    icon: 'bx:bxl-react',
    title: 'React',
    url: 'https://reactjs.org',
  },
  {
    color: '#EBD94E',
    content: '路是走出来的，而不是空想出来的。',
    date: '2021-04-01',
    group: '架构组',
    icon: 'ion:logo-javascript',
    title: 'Js',
    url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript',
  },
];

const quickNavItems = [
  { color: '#1fdaca', icon: 'ion:home-outline', title: '首页', url: '/' },
  {
    color: '#bf0c2c',
    icon: 'ion:grid-outline',
    title: '仪表盘',
    url: '/dashboard',
  },
  {
    color: '#e18525',
    icon: 'ion:layers-outline',
    title: '组件',
    url: '/demos/features/icons',
  },
  {
    color: '#3fb27f',
    icon: 'ion:settings-outline',
    title: '系统管理',
    url: '/demos/features/login-expired',
  },
  {
    color: '#4daf1bc9',
    icon: 'ion:key-outline',
    title: '权限管理',
    url: '/demos/access/page-control',
  },
  {
    color: '#00d8ff',
    icon: 'ion:bar-chart-outline',
    title: '图表',
    url: '/analytics',
  },
];

const todoItems = [
  {
    completed: false,
    content: `审查最近提交到Git仓库的前端代码，确保代码质量和规范。`,
    date: '2024-07-30 11:00:00',
    title: '审查前端代码提交',
  },
  {
    completed: true,
    content: `检查并优化系统性能，降低CPU使用率。`,
    date: '2024-07-30 11:00:00',
    title: '系统性能优化',
  },
  {
    completed: false,
    content: `进行系统安全检查，确保没有安全漏洞或未授权的访问。 `,
    date: '2024-07-30 11:00:00',
    title: '安全检查',
  },
  {
    completed: false,
    content: `更新项目中的所有npm依赖包，确保使用最新版本。`,
    date: '2024-07-30 11:00:00',
    title: '更新项目依赖',
  },
  {
    completed: false,
    content: `修复用户报告的页面UI显示问题，确保在不同浏览器中显示一致。 `,
    date: '2024-07-30 11:00:00',
    title: '修复UI显示问题',
  },
];

const trendItems = [
  {
    avatar: 'svg:avatar-1',
    content: `在 <a>开源组</a> 创建了项目 <a>Vue</a>`,
    date: '刚刚',
    title: '威廉',
  },
  {
    avatar: 'svg:avatar-2',
    content: `关注了 <a>威廉</a> `,
    date: '1个小时前',
    title: '艾文',
  },
  {
    avatar: 'svg:avatar-3',
    content: `发布了 <a>个人动态</a> `,
    date: '1天前',
    title: '克里斯',
  },
  {
    avatar: 'svg:avatar-4',
    content: `发表文章 <a>如何编写一个Vite插件</a> `,
    date: '2天前',
    title: 'Vben',
  },
  {
    avatar: 'svg:avatar-1',
    content: `回复了 <a>杰克</a> 的问题 <a>如何进行项目优化？</a>`,
    date: '3天前',
    title: '皮特',
  },
  {
    avatar: 'svg:avatar-2',
    content: `关闭了问题 <a>如何运行项目</a> `,
    date: '1周前',
    title: '杰克',
  },
  {
    avatar: 'svg:avatar-3',
    content: `发布了 <a>个人动态</a> `,
    date: '1周前',
    title: '威廉',
  },
  {
    avatar: 'svg:avatar-4',
    content: `推送了代码到 <a>Github</a>`,
    date: '2021-04-01 20:00',
    title: '威廉',
  },
  {
    avatar: 'svg:avatar-4',
    content: `发表文章 <a>如何编写使用 Admin Vben</a> `,
    date: '2021-03-01 20:00',
    title: 'Vben',
  },
];

export default function Workspace() {
  const userStore = useUserStore();
  const navigate = useNavigate();

  /** 与官方 navTo 一致：http 外链新窗口，内部路由 push */
  const navTo = (nav: { title: string; url?: string }) => {
    if (nav.url?.startsWith('http')) {
      openWindow(nav.url);
      return;
    }
    if (nav.url?.startsWith('/')) {
      void Promise.resolve(navigate(nav.url)).catch((error: unknown) => {
        console.error('Navigation failed:', error);
      });
      return;
    }
    console.warn(`Unknown URL for navigation item: ${nav.title} -> ${nav.url}`);
  };

  return (
    <div className="p-5">
      <WorkbenchHeader
        avatar={
          userStore.userInfo?.avatar || defaultPreferences.app.defaultAvatar
        }
        title={`早安, ${userStore.userInfo?.realName ?? ''}, 开始您一天的工作吧！`}
        description="今日晴，20℃ - 32℃！"
      />

      <div className="mt-5 flex flex-col lg:flex-row">
        <div className="mr-4 w-full lg:w-3/5">
          <WorkbenchProject items={projectItems} title="项目" onClick={navTo} />
          <WorkbenchTrends
            items={trendItems}
            className="mt-5"
            title="最新动态"
          />
        </div>
        <div className="w-full lg:w-2/5">
          <WorkbenchQuickNav
            items={quickNavItems}
            className="mt-5 lg:mt-0"
            title="快捷导航"
            onClick={navTo}
          />
          <WorkbenchTodo items={todoItems} className="mt-5" title="待办事项" />
          <AnalysisChartCard className="mt-5" title="访问来源">
            <AnalyticsVisitsSource />
          </AnalysisChartCard>
        </div>
      </div>
    </div>
  );
}
