/**
 * useEcharts —— 与官方 packages/effects/plugins/src/echarts/use-echarts.ts 1:1 对齐
 *
 * React 适配说明：
 * - chartRef 直接指向容器 div（官方为组件实例的 $el）
 * - 主题跟随 documentElement 的 dark class（与官方 usePreferences().isDark 等价）
 * - 窗口 resize 与容器 ResizeObserver 双重监听，debounce 200ms
 * - 主题切换时 dispose 后以新主题重绘（对齐官方 watch([isDark, isActive]) 逻辑）
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ECharts, EChartsCoreOption } from 'echarts/core';

import echarts from '#/lib/echarts';

export function useIsDark() {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function useEcharts() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ECharts | null>(null);
  const cacheOptionsRef = useRef<EChartsCoreOption>({});
  const isActiveRef = useRef(false);
  const isDark = useIsDark();

  const getChartEl = useCallback(
    (): HTMLElement | null => chartRef.current,
    [],
  );

  const isElHidden = useCallback((el: HTMLElement | null): boolean => {
    if (!el) return true;
    return el.offsetHeight === 0 || el.offsetWidth === 0;
  }, []);

  /** 对齐官方 getOptions：暗色模式追加透明背景 */
  const getOptions = useCallback((): EChartsCoreOption => {
    if (!isDark) return {};
    return { backgroundColor: 'transparent' };
  }, [isDark]);

  const initCharts = useCallback((): ECharts | null => {
    const el = getChartEl();
    if (!el) return null;
    const instance = echarts.init(el, isDark ? 'dark' : undefined);
    chartInstanceRef.current = instance;
    return instance;
  }, [getChartEl, isDark]);

  const renderEcharts = useCallback(
    (options: EChartsCoreOption): Promise<ECharts | null> => {
      if (!isActiveRef.current) return Promise.resolve(null);
      cacheOptionsRef.current = options;
      const currentOptions = { ...options, ...getOptions() };

      return new Promise((resolve) => {
        const tryRender = (retries: number) => {
          const el = getChartEl();
          if (isElHidden(el)) {
            if (retries <= 0) {
              resolve(null);
              return;
            }
            // 对齐官方：容器隐藏时 30ms 后重试
            setTimeout(() => tryRender(retries - 1), 30);
            return;
          }
          let instance = chartInstanceRef.current;
          if (!instance || instance.getDom() !== el) {
            instance?.dispose();
            instance = initCharts();
            if (!instance) {
              resolve(null);
              return;
            }
          }
          instance.setOption(currentOptions);
          resolve(instance);
        };
        // 对齐官方 nextTick 语义：等一帧确保布局完成
        requestAnimationFrame(() => tryRender(10));
      });
    },
    [getChartEl, getOptions, initCharts, isElHidden],
  );

  const resize = useCallback(() => {
    const el = getChartEl();
    if (isElHidden(el)) return;
    chartInstanceRef.current?.resize({
      animation: { duration: 300, easing: 'quadraticIn' },
    });
  }, [getChartEl, isElHidden]);

  // 挂载激活 / 卸载停用（对齐官方 onMounted/onBeforeUnmount）
  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  // 窗口 resize（debounce 200ms，对齐官方 useDebounceFn(resize, 200)）
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(resize, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (timer) clearTimeout(timer);
    };
  }, [resize]);

  // 容器尺寸观察（对齐官方 useResizeObserver）
  useEffect(() => {
    const el = chartRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(resize, 200);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [resize]);

  // 主题切换：dispose 后以新主题重绘缓存配置（对齐官方 watch([isDark, isActive])）
  useEffect(() => {
    if (!isActiveRef.current) return;
    const instance = chartInstanceRef.current;
    if (instance) {
      instance.dispose();
      initCharts();
      void renderEcharts(cacheOptionsRef.current);
      resize();
    }
  }, [isDark, initCharts, renderEcharts, resize]);

  // 卸载销毁实例（对齐官方 tryOnUnmounted）
  useEffect(
    () => () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    },
    [],
  );

  return { chartRef, renderEcharts, resize };
}
