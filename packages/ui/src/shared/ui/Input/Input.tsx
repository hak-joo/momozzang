import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { useControlVariant, type ControlVariant } from '../ControlVariant';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 컨텍스트를 무시하고 시각 언어를 직접 지정한다. 미지정 시 ControlVariantProvider 값을 따른다. */
  variant?: ControlVariant;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', variant, ...rest },
  ref,
) {
  const contextVariant = useControlVariant();
  const resolved = variant ?? contextVariant;
  return (
    <input
      ref={ref}
      type={type}
      className={clsx(styles.field, resolved === 'admin' && styles.admin, className)}
      {...rest}
    />
  );
});
