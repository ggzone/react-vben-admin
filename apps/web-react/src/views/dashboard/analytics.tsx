/**
 * 仪表盘 —— 数据分析页
 * 与官方 apps/web-antd/src/views/dashboard/analytics/index.vue 1:1 对齐
 * 结构：p-5 + AnalysisOverview 4 卡片 + AnalysisChartsTabs（流量趋势/月访问量）+ 3 个 AnalysisChartCard
 */
import {
  AnalysisChartCard,
  AnalysisChartsTabs,
  AnalysisOverview,
} from '#/components/dashboard';
import {
  AnalyticsTrends,
  AnalyticsVisits,
  AnalyticsVisitsData,
  AnalyticsVisitsSales,
  AnalyticsVisitsSource,
} from '#/components/dashboard/analytics-charts';
import {
  SvgBellIcon,
  SvgCakeIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from '#/components/dashboard/overview-icons';

const overviewItems = [
  {
    icon: <SvgCardIcon />,
    title: '用户量',
    totalTitle: '总用户量',
    totalValue: 120_000,
    value: 2000,
  },
  {
    icon: <SvgCakeIcon />,
    title: '访问量',
    totalTitle: '总访问量',
    totalValue: 500_000,
    value: 20_000,
  },
  {
    icon: <SvgDownloadIcon />,
    title: '下载量',
    totalTitle: '总下载量',
    totalValue: 120_000,
    value: 8000,
  },
  {
    icon: <SvgBellIcon />,
    title: '使用量',
    totalTitle: '总使用量',
    totalValue: 50_000,
    value: 5000,
  },
];

const chartTabs = [
  { label: '流量趋势', value: 'trends' },
  { label: '月访问量', value: 'visits' },
];

export default function Analytics() {
  return (
    <div className="p-5">
      <AnalysisOverview items={overviewItems} />
      <AnalysisChartsTabs tabs={chartTabs} className="mt-5">
        {{
          trends: <AnalyticsTrends />,
          visits: <AnalyticsVisits />,
        }}
      </AnalysisChartsTabs>

      <div className="mt-5 w-full md:flex">
        <AnalysisChartCard
          className="mt-5 md:mt-0 md:mr-4 md:w-1/3"
          title="访问数量"
        >
          <AnalyticsVisitsData />
        </AnalysisChartCard>
        <AnalysisChartCard
          className="mt-5 md:mt-0 md:mr-4 md:w-1/3"
          title="访问来源"
        >
          <AnalyticsVisitsSource />
        </AnalysisChartCard>
        <AnalysisChartCard className="mt-5 md:mt-0 md:w-1/3" title="访问来源">
          <AnalyticsVisitsSales />
        </AnalysisChartCard>
      </div>
    </div>
  );
}
