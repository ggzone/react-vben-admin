/**
 * 版权信息 —— 与官方 packages/effects/layouts/src/basic/copyright/copyright.vue 1:1 对齐
 */
import { usePreferencesStore } from '#/preferences/store';

export function Copyright() {
  const c = usePreferencesStore((state) => state.preferences.copyright);

  return (
    <div className="text-md flex-center">
      {/* ICP 备案 */}
      {c.icp && (
        <a
          className="mx-1 hover:text-primary-hover"
          href={c.icpLink || 'javascript:void(0)'}
          rel="noopener noreferrer"
          target="_blank"
        >
          {c.icp}
        </a>
      )}
      {/* 版权文本 */}
      Copyright © {c.date}
      {/* 公司链接 */}
      {c.companyName && (
        <a
          className="mx-1 hover:text-primary-hover"
          href={c.companySiteLink || 'javascript:void(0)'}
          rel="noopener noreferrer"
          target="_blank"
        >
          {c.companyName}
        </a>
      )}
    </div>
  );
}

export default Copyright;
