import type { CSSProperties } from 'react';
import { clsx } from 'clsx';
import styles from './PixelBadge.module.css';

export interface PixelBadgeProps {
  text: string;
  className?: string;
  gradient?: string;
  borderColor?: string;
  outlineSize?: number;
  fontSize?: number;
  style?: CSSProperties;
}

export function PixelBadge({
  text,
  className,
  gradient,
  borderColor,
  outlineSize,
  fontSize,
  style,
}: PixelBadgeProps) {
  const customStyle: React.CSSProperties & Record<string, any> = {
    ...(style ?? {}),
  };

  if (gradient) customStyle['--pixel-text-gradient'] = gradient;
  if (borderColor) customStyle['--pixel-border-color'] = borderColor;
  if (typeof outlineSize === 'number') customStyle['--pixel-outline'] = `${outlineSize}px`;
  if (typeof fontSize === 'number') customStyle['--pixel-font-size'] = `${fontSize}px`;

  return (
    <span className={clsx(styles.root, className)} style={customStyle} data-text={text}>
      <span className={styles.text} data-text={text}>
        {text}
      </span>
    </span>
  );
}
