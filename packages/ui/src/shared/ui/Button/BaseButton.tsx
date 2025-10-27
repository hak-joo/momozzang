import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import styles from './Button.module.css';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'plain';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { size = 'md', variant = 'primary', fullWidth = false, className, disabled, type = 'button', ...rest },
  ref,
) {
  const sizeClass = styles[`size${capitalize(size)}` as keyof typeof styles];
  const variantClass = styles[`variant${capitalize(variant)}` as keyof typeof styles];

  return (
    <button
      ref={ref}
      className={clsx(styles.button, sizeClass, variantClass, fullWidth && styles.fullWidth, className)}
      disabled={disabled}
      type={type}
      {...rest}
    />
  );
});
