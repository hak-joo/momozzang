import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import styles from './Select.module.css';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

/**
 * 톤앤매너(Input과 동일한 둥근 sub-100 배경 + main-600 글자색)에 맞춘 공통 셀렉트.
 * 글자색을 명시해 어드민 전역 흰색 텍스트 상속으로 글씨가 보이지 않던 문제를 해결한다.
 * 네이티브 화살표를 숨기고 테마색 셰브론을 배경으로 그린다.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={clsx(styles.field, className)} {...rest}>
      {children}
    </select>
  );
});
