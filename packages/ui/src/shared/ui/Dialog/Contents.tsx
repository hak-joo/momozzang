import * as DialogPrimitives from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import * as React from 'react';
import DialogOverlay from './Overlay';

import styles from './style.module.css';

export type AnimationStyles = 'popup' | 'slide-up' | 'slide-down';

export interface Props extends DialogPrimitives.DialogContentProps {
  usePortal?: boolean;
  useOverlay?: boolean;
  useAutoClose?: boolean;
  position?: 'center' | 'top' | 'bottom';
}

export function Content({
  children,
  title,
  usePortal = true,
  useOverlay = false,
  useAutoClose = true,
  className,
  ...contentProps
}: React.PropsWithChildren<Props>) {
  const Container = usePortal ? DialogPrimitives.Portal : React.Fragment;

  return (
    <Container>
      {useOverlay && <DialogOverlay className={styles.OverlayOpen} />}
      <DialogPrimitives.Content
        className={clsx(styles.Dialog, className)}
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
