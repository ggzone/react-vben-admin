/**
 * Demos —— Ant Design 组件使用演示页
 *
 * 与官方 apps/web-antd/src/views/demos/antd/index.vue 1:1 对齐。
 * 官方该页由 ant-design-vue 渲染；web-react 不引入 antd，因此按官方实测的
 * 计算样式复刻 antd v5 组件外观（.antd-demo 上的一组 --antd-* 变量，见 index.css）：
 *
 *  Card   : bg #1c1e23 / border 1px #36363a / radius 10px / mb 20px
 *           head 56px 高、padding 0 24px、标题 16px/25.14 600
 *           body padding 24px
 *  Button : 32px 高、radius 8px、padding 4px 15px、14px/22px、weight 400
 *           default  #1c1e23 底 + #36363a 描边 + rgba(242,242,242,.85) 文字
 *           primary  #035ec7 底 + 白字
 *           danger   #1c1e23 底 + #dc3355 描边 + #dc3355 文字（描边风格，非实心）
 */
import * as React from 'react';

import { Page } from '#/components/page';

type ToastItem = {
  id: number;
  text: string;
  type: 'error' | 'info' | 'success' | 'warning';
};

const TOAST_STYLE: Record<ToastItem['type'], string> = {
  error: 'border-destructive/50 text-destructive',
  info: 'border-border text-foreground',
  success: 'border-primary/50 text-primary',
  warning: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
};

/** antd 按钮基础外观（32px 高 / 8px 圆角 / 4px 15px 内距 / 14px-22px-400） */
const BTN_BASE =
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border px-[15px] text-sm font-normal leading-[22px] whitespace-nowrap transition-colors';

const BTN_DEFAULT =
  'border-[var(--antd-border)] bg-[var(--antd-card-bg)] text-[var(--antd-text)] shadow-[var(--antd-shadow)] hover:border-[var(--antd-primary)] hover:text-[var(--antd-primary)]';
const BTN_PRIMARY =
  'border-transparent bg-[var(--antd-primary)] text-white shadow-[var(--antd-shadow-primary)] hover:opacity-90';
const BTN_DANGER =
  'border-[var(--antd-danger)] bg-[var(--antd-card-bg)] text-[var(--antd-danger)] shadow-[var(--antd-shadow)] hover:opacity-80';

/** antd Card：与官方 ant-card 一致的容器/头/体
 *  注意：官方模板上的 `mb-5` 是**无效**的 —— antd 组件级 reset `.ant-card{margin:0}`
 *  与 uno 的 `.mb-5` 同权重且注入更晚，实测三张卡片上下紧贴（间距 = 卡片高度 137px）。
 *  head 有效高 55.14px = 标题行高 25.1429 + 上下 padding 各 15px。 */
function AntdCard({
  title,
  children,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--antd-border)] bg-[var(--antd-card-bg)] text-[var(--antd-text)]">
      <div className="flex items-center px-6 py-[15px] text-base leading-[25.1429px] font-semibold">
        {title}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div
      className={`rounded-md border bg-card px-4 py-2 text-sm shadow-md ${TOAST_STYLE[item.type]}`}
    >
      {item.text}
    </div>
  );
}

export default function AntDesignDemos() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const pushToast = (text: string, type: ToastItem['type']) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  return (
    <Page
      description="支持多语言，主题功能集成切换等"
      title="Ant Design Vue组件使用演示"
    >
      <div className="antd-ui">
        <AntdCard title="按钮">
          <div className="flex flex-wrap items-center gap-2">
            <button className={`${BTN_BASE} ${BTN_DEFAULT}`} type="button">
              Default
            </button>
            <button className={`${BTN_BASE} ${BTN_PRIMARY}`} type="button">
              Primary
            </button>
            <button className={`${BTN_BASE} ${BTN_DEFAULT}`} type="button">
              Info
            </button>
            <button className={`${BTN_BASE} ${BTN_DANGER}`} type="button">
              Error
            </button>
          </div>
        </AntdCard>

        <AntdCard title="Message">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`${BTN_BASE} ${BTN_DEFAULT}`}
              type="button"
              onClick={() =>
                pushToast('How many roads must a man walk down', 'info')
              }
            >
              信息
            </button>
            <button
              className={`${BTN_BASE} ${BTN_DANGER}`}
              type="button"
              onClick={() =>
                pushToast('Once upon a time you dressed so fine', 'error')
              }
            >
              错误
            </button>
            <button
              className={`${BTN_BASE} ${BTN_DEFAULT}`}
              type="button"
              onClick={() =>
                pushToast('How many roads must a man walk down', 'warning')
              }
            >
              警告
            </button>
            <button
              className={`${BTN_BASE} ${BTN_DEFAULT}`}
              type="button"
              onClick={() =>
                pushToast(
                  'Cause you walked hand in hand With another man in my place',
                  'success',
                )
              }
            >
              成功
            </button>
          </div>
        </AntdCard>

        <AntdCard title="Notification">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`${BTN_BASE} ${BTN_DEFAULT}`}
              type="button"
              onClick={() => pushToast('说点啥呢', 'info')}
            >
              信息
            </button>
            <button
              className={`${BTN_BASE} ${BTN_DANGER}`}
              type="button"
              onClick={() => pushToast('说点啥呢', 'error')}
            >
              错误
            </button>
            <button
              className={`${BTN_BASE} ${BTN_DEFAULT}`}
              type="button"
              onClick={() => pushToast('说点啥呢', 'warning')}
            >
              警告
            </button>
            <button
              className={`${BTN_BASE} ${BTN_DEFAULT}`}
              type="button"
              onClick={() => pushToast('说点啥呢', 'success')}
            >
              成功
            </button>
          </div>
        </AntdCard>
      </div>

      {/* 轻量提示容器（页面内自包含） */}
      <div className="pointer-events-none fixed top-4 right-4 z-1000 flex w-72 flex-col gap-2">
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <Toast
              item={item}
              onClose={() =>
                setToasts((prev) => prev.filter((t) => t.id !== item.id))
              }
            />
          </div>
        ))}
      </div>
    </Page>
  );
}
