/**
 * 滚动条补偿工具
 *
 * 历史：这里原本有一个 `useFixedScrollbarCompensation()`，在弹层打开时给 `_scroll__fixed_`
 * 节点手工加 padding-right。但 Radix 的滚动锁是在 layout effect 里、由库自己接管 body 的，
 * JS 侧无论放在 useEffect（晚一帧）还是 useLayoutEffect（与库抢顺序）都无法保证
 * 「施加/撤销」和「滚动条消失/恢复」发生在同一帧——实测关窗瞬间会有 2 帧把头部压窄 10px。
 *
 * 现在改由纯 CSS 解决（见 assets/index.css 的 `html body[data-scroll-locked]`）：
 * 用 padding-right 覆盖 react-remove-scroll-bar 默认的 margin-right 补偿，
 * `#app` 内容框保持 1590px 不变，所有 Radix 模态层（Dialog / Select / ContextMenu …）
 * 一次性覆盖，无需逐个组件挂 hook，也没有时序问题。
 *
 * 保留 SCROLL_FIXED_CLASS 仅作为布局骨架的语义标记（探针/回归脚本按它定位 fixed 头部容器）。
 */

/** fixed 布局节点标记类（对齐官方 SCROLL_FIXED_CLASS = `_scroll__fixed_`） */
export const SCROLL_FIXED_CLASS = '_scroll__fixed_';
