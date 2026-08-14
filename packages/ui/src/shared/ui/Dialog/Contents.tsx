import * as DialogPrimitives from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import * as React from 'react';
import { usePortalContainer } from '../PortalContainer';
import { Overlay } from './Overlay';

import styles from './Dialog.module.css';

export type AnimationStyles = 'popup' | 'slide-up' | 'slide-down';

export interface Props extends DialogPrimitives.DialogContentProps {
  usePortal?: boolean;
  useOverlay?: boolean;
  useAutoClose?: boolean;
  position?: 'center' | 'top' | 'bottom';
  useFadeInOut?: boolean;
  overlayClassName?: string;
}

export function Content({
  children,
  title,
  usePortal = true,
  useOverlay = false,
  useAutoClose = true,
  useFadeInOut = false,
  className,
  overlayClassName,
  ...contentProps
}: React.PropsWithChildren<Props>) {
  // provider 가 없으면 `null` → `undefined` 로 넘겨 Radix 기본값(`document.body`)을 그대로 쓴다.
  // 즉 뷰어의 코드 경로는 변경 전과 완전히 동일하다(계약 3 §4.1-1).
  const portalContainer = usePortalContainer();

  const content = (
    <>
      {useOverlay && (
        <Overlay
          className={clsx(
            styles.overlayBase,
            {
              [styles.overlayFade]: useFadeInOut,
            },
            overlayClassName,
          )}
        />
      )}
      <DialogPrimitives.Content
        className={clsx(styles.dialog, className, useFadeInOut && styles.dialogFade)}
        onInteractOutside={(e) => {
          if (!useAutoClose) e.preventDefault();
        }}
        {...contentProps}
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
