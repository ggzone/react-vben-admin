/**
 * 滑块验证码 —— 与官方 common-ui/components/captcha/slider-captcha 1:1 对齐
 * 拖拽到最右侧即通过（isSlot=false 模式），含成功态/回弹动画
 */
import { useCallback, useRef, useState } from 'react';
import { Check, ChevronsRight } from 'lucide-react';

import { cn } from '#/lib/utils';
import { $t } from '#/locales';

export interface SliderCaptchaProps {
  className?: string;
  /** 是否通过 */
  value?: boolean;
  onChange?: (isPassing: boolean) => void;
}

export function SliderCaptcha({
  className,
  value,
  onChange,
}: SliderCaptchaProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isPassing, setIsPassing] = useState(false);
  const [toLeft, setToLeft] = useState(false);
  const moveDistanceRef = useRef(0);
  const isMovingRef = useRef(false);

  const passing = value ?? isPassing;

  const setPassing = useCallback(
    (val: boolean) => {
      setIsPassing(val);
      onChange?.(val);
    },
    [onChange],
  );

  function getEventPageX(
    e: MouseEvent | React.MouseEvent | TouchEvent,
  ): number {
    if ('pageX' in e) return e.pageX;
    if ('touches' in e && e.touches[0]) return e.touches[0].pageX;
    return 0;
  }

  function getOffset(actionEl: HTMLDivElement) {
    const wrapperWidth = wrapperRef.current?.offsetWidth ?? 220;
    const actionWidth = actionEl.offsetWidth || 40;
    const offset = wrapperWidth - actionWidth - 6;
    return { actionWidth, offset, wrapperWidth };
  }

  function handleDragStart(e: React.MouseEvent | React.TouchEvent) {
    if (passing) return;
    const actionEl = actionRef.current;
    if (!actionEl) return;
    const startX = Number.parseInt(actionEl.style.left || '0', 10) || 0;
    const nativeEvent = (e.nativeEvent ?? e) as MouseEvent | TouchEvent;
    moveDistanceRef.current = getEventPageX(nativeEvent) - startX;
    isMovingRef.current = true;
  }

  function handleDragMoving(e: React.MouseEvent | React.TouchEvent) {
    if (!isMovingRef.current) return;
    const actionEl = actionRef.current;
    const barEl = barRef.current;
    if (!actionEl || !barEl) return;
    const { actionWidth, offset, wrapperWidth } = getOffset(actionEl);
    const nativeEvent = (e.nativeEvent ?? e) as MouseEvent | TouchEvent;
    const moveX = getEventPageX(nativeEvent) - moveDistanceRef.current;

    if (moveX > 0 && moveX <= offset) {
      actionEl.style.left = `${moveX}px`;
      barEl.style.width = `${moveX + actionWidth / 2}px`;
    } else if (moveX > offset) {
      actionEl.style.left = `${wrapperWidth - actionWidth}px`;
      barEl.style.width = `${wrapperWidth - actionWidth / 2}px`;
      checkPass();
    }
  }

  function handleDragOver(e: React.MouseEvent | React.TouchEvent) {
    if (!isMovingRef.current || passing) return;
    const actionEl = actionRef.current;
    const barEl = barRef.current;
    if (!actionEl || !barEl) return;
    const nativeEvent = (e.nativeEvent ?? e) as MouseEvent | TouchEvent;
    const { actionWidth, offset, wrapperWidth } = getOffset(actionEl);
    const moveX = getEventPageX(nativeEvent) - moveDistanceRef.current;
    isMovingRef.current = false;

    if (moveX < offset) {
      resume();
    } else {
      actionEl.style.left = `${wrapperWidth - actionWidth}px`;
      barEl.style.width = `${wrapperWidth - actionWidth / 2}px`;
      checkPass();
    }
  }

  function checkPass() {
    isMovingRef.current = false;
    setPassing(true);
  }

  function resume() {
    isMovingRef.current = false;
    setPassing(false);
    setToLeft(true);
    const actionEl = actionRef.current;
    const barEl = barRef.current;
    const contentEl = contentRef.current;
    if (contentEl) contentEl.style.width = '100%';
    setTimeout(() => {
      setToLeft(false);
      if (actionEl) actionEl.style.left = '0';
      if (barEl) barEl.style.width = '0';
    }, 300);
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative flex h-10 w-full items-center overflow-hidden rounded-md border border-border bg-background-deep text-center',
        className,
      )}
      onMouseLeave={handleDragOver}
      onMouseMove={handleDragMoving}
      onMouseUp={handleDragOver}
      onTouchEnd={handleDragOver}
      onTouchMove={handleDragMoving}
    >
      {/* 进度条 */}
      <div
        ref={barRef}
        className={cn(
          'absolute h-full bg-success',
          toLeft && 'w-0! transition-width duration-300',
        )}
        style={{ width: '0' }}
      />
      {/* 提示文本 */}
      <div
        ref={contentRef}
        className={cn(
          'absolute top-0 flex-center size-full text-xs select-none',
          passing && '[&]:text-white',
        )}
        style={{ width: '100%' }}
      >
        {passing
          ? $t('ui.captcha.sliderSuccessText')
          : $t('ui.captcha.sliderDefaultText')}
      </div>
      {/* 拖拽滑块 */}
      <div
        ref={actionRef}
        className={cn(
          'absolute top-0 left-0 flex-center h-full cursor-move bg-background px-3.5 shadow-md dark:bg-accent',
          toLeft && 'left-0! transition-width duration-300',
        )}
        style={{ left: '0' }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {passing ? (
          <Check className="size-4 text-foreground/60" />
        ) : (
          <ChevronsRight className="size-4 text-foreground/60" />
        )}
      </div>
    </div>
  );
}

export default SliderCaptcha;
