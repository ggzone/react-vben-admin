/**
 * 顶部进度条 —— 对齐官方 @core/base/shared/utils/nprogress.ts
 *
 * 官方用 nprogress 依赖（startProgress / stopProgress），本项目未安装该依赖，
 * 但 `assets/nprogress.css` 已按原样移植（类名 #nprogress / .bar / .peg / .spinner-icon 完全一致），
 * 因此这里直接生成同样的 DOM 结构并复刻 nprogress 的「起跳 → 涓流 → 收尾」曲线，
 * 视觉与官方一致且不额外增加依赖。
 */

interface ProgressInstance {
  status: number | null;
}

const TRICKLE_INTERVAL = 200;
/** nprogress 默认 speed=200ms，涓流每次最多前进 (1 - n) * 0.1 的阻尼 */
const TRICKLE_SPEED = 200;

let container: HTMLElement | null = null;
let bar: HTMLElement | null = null;
let trickleTimer: number | null = null;
let removeTimer: number | null = null;
let instance: ProgressInstance | null = null;

function ensureDom(): ProgressInstance | null {
  if (typeof document === 'undefined') return null;
  // 官方 CSS 依赖 body 作为定位父级（.bar 为 fixed）
  if (instance && container?.isConnected) return instance;

  container = document.createElement('div');
  container.id = 'nprogress';

  bar = document.createElement('div');
  bar.className = 'bar';
  bar.setAttribute('role', 'bar');

  const peg = document.createElement('div');
  peg.className = 'peg';
  bar.appendChild(peg);

  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.setAttribute('role', 'spinner');
  const spinnerIcon = document.createElement('div');
  spinnerIcon.className = 'spinner-icon';
  spinner.appendChild(spinnerIcon);

  container.appendChild(bar);
  container.appendChild(spinner);
  document.body.appendChild(container);

  instance = { status: null };
  return instance;
}

function render(percent: number) {
  if (!bar) return;
  // nprogress 用 translate3d 平移整条 bar（宽度恒为 100%）
  bar.style.transform = `translate3d(${(percent - 100).toFixed(3)}%,0,0)`;
}

function trickle() {
  if (!instance || instance.status === null) return;
  const n = instance.status;
  if (n >= 1) return;
  let add = 0;
  if (n < 0.2) add = 0.1;
  else if (n < 0.5) add = 0.04;
  else if (n < 0.8) add = 0.02;
  else if (n < 0.99) add = 0.005;
  instance.status = Math.min(n + add, 0.994);
  render(instance.status);
}

/** 开始显示进度条（对齐官方 startProgress） */
export function startProgress() {
  const ins = ensureDom();
  if (!ins) return;
  if (removeTimer !== null) {
    window.clearTimeout(removeTimer);
    removeTimer = null;
  }
  if (trickleTimer !== null) return;
  if (!bar) return;

  // 从 0 起跳，双帧后进入 0.08（nprogress 默认起步值）
  ins.status = 0;
  render(0);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!ins || ins.status === null || ins.status >= 0.08) return;
      ins.status = 0.08;
      render(ins.status);
      trickleTimer = window.setInterval(trickle, TRICKLE_INTERVAL);
    });
  });
}

/** 结束并隐藏进度条（对齐官方 stopProgress） */
export function stopProgress() {
  const ins = instance;
  if (!ins || ins.status === null) return;
  if (trickleTimer !== null) {
    window.clearInterval(trickleTimer);
    trickleTimer = null;
  }
  ins.status = 1;
  render(1);
  removeTimer = window.setTimeout(() => {
    if (container?.parentNode) container.parentNode.removeChild(container);
    container = null;
    bar = null;
    instance = null;
    removeTimer = null;
  }, TRICKLE_SPEED);
}
