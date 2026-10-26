import { useEffect } from 'react';

/** 测量经典滚动条宽度（探针法，弹窗锁滚动条后依然有效，对齐官方 getScrollbarWidth） */
function getScrollbarWidth(): number {
  const scrollDiv = document.createElement('div');
  scrollDiv.style.visibility = 'hidden';
  scrollDiv.style.overflow = 'scroll';
  scrollDiv.style.position = 'absolute';
  scrollDiv.style.top = '-9999px';
  document.body.append(scrollDiv);
  const innerDiv = document.createElement('div');
  scrollDiv.append(innerDiv);
  const scrollbarWidth = scrollDiv.offsetWidth - innerDiv.offsetWidth;
  scrollDiv.remove();
  return scrollbarWidth;
}

/** 页面是否本来就需要滚动条（对齐官方 needsScrollbar） */
function needsScrollbar(): boolean {
  return document.documentElement.scrollHeight > window.innerHeight;
}

let seq = 0;

/**
 * 弹窗打开期间的 fixed 布局节点滚动条补偿（对齐官方 useScrollLock + SCROLL_FIXED_CLASS）：
 * 模态弹窗会隐藏 body 滚动条，视口随之变宽，fixed 头部（width 按 100% 计算）会拉伸产生抖动。
 * 官方做法是给 body 和所有 `_scroll__fixed_` 标记的 fixed 节点同步加 paddingRight=滚动条宽度；
 * Radix(react-remove-scroll) 已补偿 body，这里只补 fixed 节点。
 *
 * 注意：本 hook 必须挂在「弹层打开时才挂载」的组件上（Portal 内层）。
 */
export function useFixedScrollbarCompensation(label = '?') {
  useEffect(() => {
    seq += 1; // mySeq 保留用于调试定位
    const scrollbarWidth = getScrollbarWidth();
    if (scrollbarWidth <= 0 || !needsScrollbar()) return; // 无经典滚动条或页面不超屏：无需补偿
    const nodes = [
      ...document.querySelectorAll<HTMLElement>('._scroll__fixed_'),
    ];
    const restores: Array<() => void> = [];
    for (const node of nodes) {
      const prevTransition = node.style.transition;
      const prevPadding = node.style.paddingRight;
      node.style.transition = 'none';
      node.style.paddingRight = `${scrollbarWidth}px`;
      restores.push(() => {
        node.style.paddingRight = prevPadding;
        // 官方做法：关闭后下一帧再恢复 transition，避免 padding 回退产生动画
        requestAnimationFrame(() => {
          node.style.transition = prevTransition;
        });
      });
    }
    return () => {
      for (const restore of restores) restore();
    };
  }, [label]);
}

/** fixed 布局节点标记类（对齐官方 SCROLL_FIXED_CLASS = `_scroll__fixed_`） */
export const SCROLL_FIXED_CLASS = '_scroll__fixed_';
