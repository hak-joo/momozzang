import { clsx } from 'clsx';
import * as DialogPrimitives from '@radix-ui/react-dialog';
import styles from './Dialog.module.css';
import type { ReactNode } from 'react';

export type OverlayProps = {
  className?: string;
  children?: ReactNode;
};

export function Overlay({ className, children, ...rest }: OverlayProps) {
  return (
    <DialogPrimitives.Overlay className={clsx(styles.overlay, className)} {...rest}>
      {children}
    </DialogPrimitives.Overlay>
  );
}
