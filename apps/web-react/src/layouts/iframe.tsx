/**
 * IFrameView —— 与官方 packages/effects/layouts/src/iframe/iframe-view.vue 1:1 对齐
 * 官方实现即空 div 占位（带 meta.link 的路由点击时由布局层直接新开窗口/内部跳转）
 */
export default function IFrameView() {
  return <div />;
}
