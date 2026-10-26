/**
 * Analytics 图表组件群 —— 与官方 apps/web-antd/src/views/dashboard/analytics/ 1:1 对齐
 * 每个图表的 option 与官方 analytics-{trends,visits,visits-data,visits-source,visits-sales}.vue 完全一致
 * EchartsUI 默认样式：width 100% / height 300px
 */
import { useEffect } from 'react';

import { useEcharts } from '#/hooks/use-echarts';

/** EchartsUI —— 与官方 echarts-ui.vue 默认 props（height 300px / width 100%）对齐 */
function EchartsUI({ height = 300 }: { height?: number | string }) {
  const { chartRef, renderEcharts } = useEcharts();
  return (
    <div
      ref={chartRef}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
      }}
    />
  );
}

/** 流量趋势 —— 官方 analytics-trends.vue */
export function AnalyticsTrends() {
  const { chartRef, renderEcharts } = useEcharts();

  useEffect(() => {
    void renderEcharts({
      grid: {
        bottom: 0,
        containLabel: true,
        left: '1%',
        right: '1%',
        top: '2 %',
      },
      series: [
        {
          areaStyle: {},
          data: [
            111, 2000, 6000, 16_000, 33_333, 55_555, 64_000, 33_333, 18_000,
            36_000, 70_000, 42_444, 23_222, 13_000, 8000, 4000, 1200, 333, 222,
            111,
          ],
          itemStyle: {
            color: '#5ab1ef',
          },
          smooth: true,
          type: 'line',
        },
        {
          areaStyle: {},
          data: [
            33, 66, 88, 333, 3333, 6200, 20_000, 3000, 1200, 13_000, 22_000,
            11_000, 2221, 1201, 390, 198, 60, 30, 22, 11,
          ],
          itemStyle: {
            color: '#019680',
          },
          smooth: true,
          type: 'line',
        },
      ],
      tooltip: {
        axisPointer: {
          lineStyle: {
            color: '#019680',
            width: 1,
          },
        },
        trigger: 'axis',
      },
      xAxis: {
        axisTick: {
          show: false,
        },
        boundaryGap: false,
        data: Array.from({ length: 18 }).map(
          (_item, index) => `${index + 6}:00`,
        ),
        splitLine: {
          lineStyle: {
            type: 'solid',
            width: 1,
          },
          show: true,
        },
        type: 'category',
      },
      yAxis: [
        {
          axisTick: {
            show: false,
          },
          max: 80_000,
          splitArea: {
            show: true,
          },
          splitNumber: 4,
          type: 'value',
        },
      ],
    });
  }, [renderEcharts]);

  return <div ref={chartRef} style={{ width: '100%', height: 300 }} />;
}

/** 月访问量 —— 官方 analytics-visits.vue */
export function AnalyticsVisits() {
  const { chartRef, renderEcharts } = useEcharts();

  useEffect(() => {
    void renderEcharts({
      grid: {
        bottom: 0,
        containLabel: true,
        left: '1%',
        right: '1%',
        top: '2 %',
      },
      series: [
        {
          barMaxWidth: 80,
          data: [
            3000, 2000, 3333, 5000, 3200, 4200, 3200, 2100, 3000, 5100, 6000,
            3200, 4800,
          ],
          type: 'bar',
        },
      ],
      tooltip: {
        axisPointer: {
          lineStyle: {
            width: 1,
          },
        },
        trigger: 'axis',
      },
      xAxis: {
        data: Array.from({ length: 12 }).map(
          (_item, index) => `${index + 1}月`,
        ),
        type: 'category',
      },
      yAxis: {
        max: 8000,
        splitNumber: 4,
        type: 'value',
      },
    });
  }, [renderEcharts]);

  return <div ref={chartRef} style={{ width: '100%', height: 300 }} />;
}

/** 访问数量（雷达图） —— 官方 analytics-visits-data.vue */
export function AnalyticsVisitsData() {
  const { chartRef, renderEcharts } = useEcharts();

  useEffect(() => {
    void renderEcharts({
      legend: {
        bottom: 0,
        data: ['访问', '趋势'],
      },
      radar: {
        indicator: [
          { name: '网页' },
          { name: '移动端' },
          { name: 'Ipad' },
          { name: '客户端' },
          { name: '第三方' },
          { name: '其它' },
        ],
        radius: '60%',
        splitNumber: 8,
      },
      series: [
        {
          areaStyle: {
            opacity: 1,
            shadowBlur: 0,
            shadowColor: 'rgba(0,0,0,.2)',
            shadowOffsetX: 0,
            shadowOffsetY: 10,
          },
          data: [
            {
              itemStyle: {
                color: '#b6a2de',
              },
              name: '访问',
              value: [90, 50, 86, 40, 50, 20],
            },
            {
              itemStyle: {
                color: '#5ab1ef',
              },
              name: '趋势',
              value: [70, 75, 70, 76, 20, 85],
            },
          ],
          itemStyle: {
            borderRadius: 10,
            borderWidth: 2,
          },
          symbolSize: 0,
          type: 'radar',
        },
      ],
      tooltip: {},
    });
  }, [renderEcharts]);

  return <div ref={chartRef} style={{ width: '100%', height: 300 }} />;
}

/** 访问来源（环形饼图） —— 官方 analytics-visits-source.vue */
export function AnalyticsVisitsSource() {
  const { chartRef, renderEcharts } = useEcharts();

  useEffect(() => {
    void renderEcharts({
      legend: {
        bottom: '2%',
        left: 'center',
      },
      series: [
        {
          animationDelay() {
            return Math.random() * 100;
          },
          animationEasing: 'exponentialInOut',
          animationType: 'scale',
          avoidLabelOverlap: false,
          color: ['#5ab1ef', '#b6a2de', '#67e0e3', '#2ec7c9'],
          data: [
            { name: '搜索引擎', value: 1048 },
            { name: '直接访问', value: 735 },
            { name: '邮件营销', value: 580 },
            { name: '联盟广告', value: 484 },
          ],
          emphasis: {
            label: {
              fontSize: '12',
              fontWeight: 'bold',
              show: true,
            },
          },
          itemStyle: {
            borderRadius: 10,
            borderWidth: 2,
          },
          label: {
            position: 'center',
            show: false,
          },
          labelLine: {
            show: false,
          },
          name: '访问来源',
          radius: ['40%', '65%'],
          type: 'pie',
        },
      ],
      tooltip: {
        trigger: 'item',
      },
    });
  }, [renderEcharts]);

  return <div ref={chartRef} style={{ width: '100%', height: 300 }} />;
}

/** 商业占比（南丁格尔玫瑰图） —— 官方 analytics-visits-sales.vue */
export function AnalyticsVisitsSales() {
  const { chartRef, renderEcharts } = useEcharts();

  useEffect(() => {
    void renderEcharts({
      series: [
        {
          animationDelay() {
            return Math.random() * 400;
          },
          animationEasing: 'exponentialInOut',
          animationType: 'scale',
          center: ['50%', '50%'],
          color: ['#5ab1ef', '#b6a2de', '#67e0e3', '#2ec7c9'],
          data: [
            { name: '外包', value: 500 },
            { name: '定制', value: 310 },
            { name: '技术支持', value: 274 },
            { name: '远程', value: 400 },
          ].toSorted((a, b) => a.value - b.value),
          name: '商业占比',
          radius: '80%',
          roseType: 'radius',
          type: 'pie',
        },
      ],
      tooltip: {
        trigger: 'item',
      },
    });
  }, [renderEcharts]);

  return <div ref={chartRef} style={{ width: '100%', height: 300 }} />;
}

export { EchartsUI };
