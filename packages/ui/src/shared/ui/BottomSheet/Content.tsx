import * as DialogPrimitives from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import * as React from 'react';

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
  const Container = usePortal ? DialogPrimitives.Portal : React.Fragment;
  const resolvedHeight = typeof height === 'number' ? `${height}px` : height;

  const sheetStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (!style && !resolvedHeight) return style;

    return {
      ...style,
      ...(resolvedHeight ? { height: resolvedHeight } : null),
    };
  }, [style, resolvedHeight]);

  return (
    <Container>
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
    </Container>
  );
}
