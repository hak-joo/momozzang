import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { PixelHeart } from '../Icon/PixelHeart';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** 체크박스 우측에 표시할 라벨. 미지정 시 박스만 렌더링한다. */
  label?: ReactNode;
  /** 라벨/래퍼에 추가할 클래스 */
  className?: string;
}

/**
 * 톤앤매너(보라/핑크 테마 토큰 + 픽셀 하트 체크마크)에 맞춘 공통 체크박스.
 * 네이티브 input은 시각적으로 숨기고 접근성만 유지하며, 커스텀 박스를 테마색으로 칠한다.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, disabled, ...rest },
  ref,
) {
  return (
    <label className={clsx(styles.root, disabled && styles.disabled, className)}>
      <input
        ref={ref}
        type="checkbox"
        className={styles.input}
        disabled={disabled}
        {...rest}
      />
      <span className={styles.box} aria-hidden="true">
        <PixelHeart className={styles.check} width={11} height={10} />
      </span>
      {label != null && <span className={styles.label}>{label}</span>}
    </label>
  );
});
