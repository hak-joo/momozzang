import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { useControlVariant, type ControlVariant } from '../ControlVariant';
import styles from './Input.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 컨텍스트를 무시하고 시각 언어를 직접 지정한다. 미지정 시 ControlVariantProvider 값을 따른다. */
  variant?: ControlVariant;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, variant, ...rest },
  ref,
) {
  const contextVariant = useControlVariant();
  const resolved = variant ?? contextVariant;
  return (
    <textarea
      ref={ref}
      className={clsx(
        styles.field,
        styles.textarea,
        resolved === 'admin' && styles.admin,
        className,
      )}
      {...rest}
    />
  );
});
