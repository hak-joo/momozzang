import * as DialogPrimitives from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import * as React from 'react';
import { usePortalContainer } from '../PortalContainer';

import styles from './BottomSheet.module.css';

export interface BottomSheetContentProps extends DialogPrimitives.DialogContentProps {
  height?: number | string;
  usePortal?: boolean;
  dimmed?: boolean;
}

export function Content({
  children,
  height,
  usePortal = true,
  dimmed = true,
  className,
  style,
  onInteractOutside,
  ...contentProps
}: React.PropsWithChildren<BottomSheetContentProps>) {
  // provider 가 없으면 `null` → `undefined` 로 넘겨 Radix 기본값(`document.body`)을 그대로 쓴다.
  // 즉 뷰어의 코드 경로는 변경 전과 완전히 동일하다(계약 3 §4.1-1).
  const portalContainer = usePortalContainer();
  const resolvedHeight = typeof height === 'number' ? `${height}px` : height;

  const sheetStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (!style && !resolvedHeight) return style;

    return {
      ...style,
      ...(resolvedHeight ? { height: resolvedHeight } : null),
    };
  }, [style, resolvedHeight]);

  const content = (
    <>
      {dimmed && <DialogPrimitives.Overlay className={clsx(styles.overlay, styles.overlayFade)} />}
      <DialogPrimitives.Content
        {...contentProps}
        className={clsx(styles.sheet, styles.sheetSlide, className)}
        style={sheetStyle}
        onInteractOutside={(event) => {
          onInteractOutside?.(event);
          event.preventDefault();
        }}
      >
        {children}
      </DialogPrimitives.Content>
    </>
  );

  if (!usePortal) return content;

  return (
    <DialogPrimitives.Portal container={portalContainer ?? undefined}>
      {content}
    </DialogPrimitives.Portal>
  );
}
