import * as DialogPrimitives from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import * as React from 'react';
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
  const Container = usePortal ? DialogPrimitives.Portal : React.Fragment;

  return (
    <Container>
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
    </Container>
  );
}
