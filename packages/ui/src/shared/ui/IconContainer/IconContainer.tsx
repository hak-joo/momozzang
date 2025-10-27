import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import styles from './IconContainer.module.css';

export type IconSize = 'sm' | 'md' | 'lg';

export interface IconContainerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: IconSize;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const IconContainer = ({ size = 'md', className, ...rest }: IconContainerProps) => (
  <span className={clsx(styles.root, styles[`size${capitalize(size)}`], className)} {...rest} />
);
