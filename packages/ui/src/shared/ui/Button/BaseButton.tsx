import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { useControlVariant } from '../ControlVariant';
import styles from './Button.module.css';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'plain';
export type ButtonShape = 'round' | 'rect';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  shape?: ButtonShape;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    size = 'md',
    variant = 'primary',
    fullWidth = false,
    shape = 'rect',
    className,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const sizeClass = styles[`size${capitalize(size)}` as keyof typeof styles];
  const variantClass = styles[`variant${capitalize(variant)}` as keyof typeof styles];
  const shapeClass = styles[`shape${capitalize(shape)}` as keyof typeof styles];

  // 어드민 표면은 **opt-in** 이다. `Input`/`Textarea`/`Select` 가 이미 쓰는 `useControlVariant()`
  // 를 그대로 따른다 — 기본값이 `invitation` 이므로 provider 를 두지 않는 뷰어 앱은 이 클래스를
  // 받지 않고 렌더가 0 변화다. `/apply`·`/admin` 은 이미 `ControlVariantProvider value="admin"`
  // 으로 감싸여 있고, 그 안의 폰 미리보기는 `PhonePreview` 가 `invitation` 으로 되돌린다.
  // 목적은 라벨 대비 AA(4.5) — 변경 전 primary 2.21 / secondary 4.19(계약 4 §0.5-a).
  const isAdminSurface = useControlVariant() === 'admin';
  const adminVariantClass = isAdminSurface
    ? styles[`admin${capitalize(variant)}` as keyof typeof styles]
    : undefined;

  return (
    <button
      ref={ref}
      className={clsx(
        styles.button,
        sizeClass,
        variantClass,
        shapeClass,
        fullWidth && styles.fullWidth,
        isAdminSurface && styles.adminSurface,
        adminVariantClass,
        className,
      )}
      disabled={disabled}
      type={type}
      {...rest}
    />
  );
});
