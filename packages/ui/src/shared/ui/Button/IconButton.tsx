import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import Button, { type ButtonProps } from './BaseButton';
import IconContainer, { type IconSize } from '@shared/ui/IconContainer';
import styles from './style.module.css';

type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'fullWidth'> {
  icon: ReactNode;
  size?: IconButtonSize;
  iconSize?: IconSize;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = 'md', iconSize = size, className, variant = 'ghost', type = 'button', ...rest },
  ref,
) {
  const sizeClass = styles[`iconSize${capitalize(size)}` as keyof typeof styles];
  const isPlain = variant === 'plain';

  return (
    <Button
      ref={ref}
      type={type}
      size={size}
      variant={variant}
      className={clsx(styles.iconButton, sizeClass, isPlain && styles.iconButtonPlain, className)}
      {...rest}
    >
      <IconContainer size={iconSize} className={styles.iconWrapper}>
        {icon}
      </IconContainer>
    </Button>
  );
});

export default IconButton;
