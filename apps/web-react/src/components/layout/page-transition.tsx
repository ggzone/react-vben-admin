/**
 * 页面切换动画容器 —— 对齐官方 content.vue
 *
 * 官方写法：
 *   <Transition :name="getTransitionName(route)" appear mode="out-in">
 *     <component :is="..." :key="getTabKey(route)" />
 *   </Transition>
 *
 * out-in 时序（本组件按同样的类名四态复刻）：
 *   旧页 leave-active + leave-to  → 时长结束移除旧页
 *   → 新页 enter-from + enter-active → 下一帧去掉 enter-from（过渡到自然态）
 *   → 时长结束回到 idle
 * 动画类名与时长来自 @core/base/design/src/css/transition.css（已移植到 assets/index.css）。
 */
import type { ReactNode } from 'react';

import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

import { usePreferencesStore } from '#/preferences/store';
import { useTabbarStore } from '#/stores/tabbar';

/** 各预设动画的单段时长（ms），取自 transition.css 的 transition/animation 声明 */
const DURATIONS: Record<string, number> = {
  fade: 200,
  'fade-down': 300,
  'fade-scale': 280,
  'fade-slide': 300,
  'fade-up': 250,
  'slide-down': 250,
  'slide-left': 250,
  'slide-right': 250,
  'slide-up': 250,
};

type Stage = 'enter-active' | 'enter-from' | 'idle' | 'leave';

function usePageTransition() {
  const outlet = useOutlet();
  const location = useLocation();
  const transition = usePreferencesStore(
    (state) => state.preferences.transition,
  );
  /** 对齐官方 content.vue 的 renderRouteView：刷新时置 false，页面组件随之卸载 */
  const renderRouteView = useTabbarStore((state) => state.renderRouteView);

  const name = transition.name || 'fade-slide';
  const enabled = Boolean(transition.name) && transition.enable;
  const routeKey = `${location.pathname}${location.search}`;
  const duration = DURATIONS[name] ?? 300;

  const [view, setView] = useState<{ el: ReactNode; key: string }>({
    el: outlet as ReactNode,
    key: routeKey,
  });
  const [stage, setStage] = useState<Stage>(() => {
    // 首帧就落在 enter-from（对齐官方 <Transition appear>），避免先闪一帧完整页面
    const t = usePreferencesStore.getState().preferences.transition;
    return t.enable && t.name ? 'enter-from' : 'idle';
  });

  const outletRef = useRef(outlet);
  outletRef.current = outlet;
  const shownKey = useRef(routeKey);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  /** 进入阶段：先落在 enter-from，双帧后切到 enter-active，再按时长收敛到 idle */
  const runEnter = () => {
    setStage('enter-from');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStage('enter-active');
        timers.current.push(
          window.setTimeout(() => setStage('idle'), duration),
        );
      });
    });
  };

  // 用 useLayoutEffect：路由变化与「旧页进入 leave 态」在同一次提交内完成，
  // 不会先画一帧新页面（对齐 Vue <Transition> 在路由更新同步套类名的时机）
  useLayoutEffect(() => {
    clearTimers();

    // 刷新中：不渲染页面（对齐官方 renderRouteView=false 时 <component> 卸载）
    // 重置为 true 后本 effect 重跑，shownKey 未变 → 走 runEnter()，页面以动画重新进入
    if (!renderRouteView) return clearTimers;

    if (!enabled) {
      shownKey.current = routeKey;
      setView({ el: outletRef.current as ReactNode, key: routeKey });
      setStage('idle');
      return clearTimers;
    }

    // 首次挂载（appear）或动画参数变更：直接对新页跑一次 enter
    if (shownKey.current === routeKey) {
      runEnter();
      return clearTimers;
    }

    // 路由切换：先让旧页离开，再挂新页进入
    setStage('leave');
    timers.current.push(
      window.setTimeout(() => {
        shownKey.current = routeKey;
        setView({ el: outletRef.current as ReactNode, key: routeKey });
        runEnter();
      }, duration),
    );

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, enabled, name, duration, renderRouteView]);

  const node = renderRouteView ? (enabled ? view.el : outlet) : null;

  const stageClass =
    !enabled || stage === 'idle'
      ? undefined
      : stage === 'leave'
        ? `${name}-leave-active ${name}-leave-to`
        : stage === 'enter-from'
          ? `${name}-enter-from ${name}-enter-active`
          : `${name}-enter-active`;

  return { node, stageClass, viewKey: view.key };
}

/** 内容区：官方 `<div class="relative h-full">` 内挂载带过渡的页面 */
export function PageTransition() {
  const { node, stageClass, viewKey } = usePageTransition();
  const renderRouteView = useTabbarStore((state) => state.renderRouteView);

  // 刷新期间整段卸载，保证重新挂载时页面状态（表单/表格/请求）全部重建
  if (!renderRouteView) return null;

  return (
    <div className={`h-full ${stageClass ?? ''}`} key={viewKey}>
      {node}
    </div>
  );
}

export default PageTransition;
