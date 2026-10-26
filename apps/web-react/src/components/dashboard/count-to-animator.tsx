/**
 * CountToAnimator —— 与官方 @vben-core/shadcn-ui VbenCountToAnimator（count-to.vue）1:1 对齐
 * 缓动函数与 vueuse TransitionPresets.easeOutExpo（cubic-bezier(0.16, 1, 0.3, 1)）一致
 */
import * as React from 'react';

export interface CountToAnimatorProps {
  /** 起始值 */
  startVal?: number;
  /** 结束值 */
  endVal: number;
  /** 持续时间（ms） */
  duration?: number;
  /** 延迟开始（ms） */
  delay?: number;
  /** 小数位数 */
  decimals?: number;
  /** 小数点符号 */
  decimal?: string;
  /** 千分位符号 */
  separator?: string;
  /** 前缀 */
  prefix?: string;
  /** 后缀 */
  suffix?: string;
  className?: string;
}

/** cubic-bezier 求值（x1,y1,x2,y2 固定为 easeOutExpo = [0.16, 1, 0.3, 1]） */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const x2v = sampleX(t) - x;
      if (Math.abs(x2v) < 1e-6) return t;
      const d = sampleDerivativeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= x2v / d;
    }
    // 二分兜底
    let low = 0;
    let high = 1;
    t = x;
    while (low < high) {
      const xv = sampleX(t);
      if (Math.abs(xv - x) < 1e-6) return t;
      if (xv > x) high = t;
      else low = t;
      t = (low + high) / 2;
      if (high - low < 1e-7) break;
    }
    return t;
  };

  return (x: number) => sampleY(solveX(x));
}

const easeOutExpo = cubicBezier(0.16, 1, 0.3, 1);

function formatValue(
  value: number,
  decimals: number,
  decimal: string,
  separator: string,
) {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withSeparator = (intPart ?? '').replace(
    /\B(?=(\d{3})+(?!\d))/g,
    separator,
  );
  return decPart ? `${withSeparator}${decimal}${decPart}` : withSeparator;
}

export function CountToAnimator({
  startVal = 0,
  endVal,
  duration = 2000,
  delay = 0,
  decimals = 0,
  decimal = '.',
  separator = ',',
  prefix = '',
  suffix = '',
  className,
}: CountToAnimatorProps) {
  const [current, setCurrent] = React.useState(startVal);
  // 官方：onMounted 时直接将 lastValue 置为 endVal，由 useTransition 驱动过渡
  const endValRef = React.useRef(endVal);
  endValRef.current = endVal;

  React.useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      const from = startVal;
      const to = endValRef.current;
      if (duration <= 0 || from === to) {
        setCurrent(to);
        return;
      }
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutExpo(progress);
        setCurrent(from + (to - from) * eased);
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        }
      };
      frame = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      timer = setTimeout(run, delay);
    } else {
      run();
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
    // 仅在挂载时执行一次（对齐官方 onMounted 语义）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      {prefix && <span>{prefix}</span>}
      <span>{formatValue(current, decimals, decimal, separator)}</span>
      {suffix && <span>{suffix}</span>}
    </div>
  );
}
