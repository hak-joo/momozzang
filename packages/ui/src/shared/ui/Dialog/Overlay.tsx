import { clsx } from 'clsx';
import * as DialogPrimitives from '@radix-ui/react-dialog';
import styles from './style.module.css';
import type { ReactNode } from 'react';

export type OverlayProps = {
  className?: string;
  children?: ReactNode;
};

function Overlay({ className, children, ...rest }: OverlayProps) {
  return (
    <DialogPrimitives.Overlay className={clsx(styles.Overlay, className)} {...rest}>
      {children}
    </DialogPrimitives.Overlay>
  );
}

export default Overlay;
