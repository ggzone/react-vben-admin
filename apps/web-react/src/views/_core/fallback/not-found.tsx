/**
 * 404 页面
 * 与官方 apps/web-antd/src/views/_core/fallback/not-found.vue 1:1 对齐
 */
import { Fallback } from '#/components/fallback';

export default function FallbackNotFound() {
  return <Fallback status="404" />;
}
