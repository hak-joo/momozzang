import { clsx } from 'clsx';
import * as React from 'react';
import {
  getMiniMeSpriteOffset,
  getMiniMeSpriteSheet,
  MINI_ME_BASE_HEIGHT,
  MINI_ME_BASE_WIDTH,
  MINI_ME_COUNT,
  MINI_ME_SPRITE_HEIGHT,
  MINI_ME_SPRITE_SCALE,
  MINI_ME_SPRITE_WIDTH,
} from '@shared/lib/miniMe';

import styles from './MiniMe.module.css';

export interface MiniMeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Index of the mini-me avatar (1 ~ 33).
   */
  miniMeId: number;
  size?: number | string;
  alt?: string;
  interactive?: boolean;
}

const DEFAULT_SIZE = 72;
const ACTUAL_CELL_WIDTH = MINI_ME_BASE_WIDTH * MINI_ME_SPRITE_SCALE;

const toCssSize = (value?: number | string) => {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return value;
  return `${DEFAULT_SIZE}px`;
};

const wrapForCalc = (value: string) => (value.startsWith('calc(') ? value : `(${value})`);

export function MiniMe({
  miniMeId,
  size,
  className,
  style,
  alt,
  interactive = false,
  ...rest
}: MiniMeProps) {
  if (miniMeId < 1 || miniMeId > MINI_ME_COUNT) {
    throw new Error(`Mini-me index ${miniMeId} is out of range (1 ~ ${MINI_ME_COUNT}).`);
  }

  const widthValue = toCssSize(size);
  const widthExpr = wrapForCalc(widthValue);
  const heightValue = `calc(${widthExpr} * ${MINI_ME_BASE_HEIGHT / MINI_ME_BASE_WIDTH})`;

  const { offsetX, offsetY } = getMiniMeSpriteOffset(miniMeId);
  const spriteUrl = getMiniMeSpriteSheet();

  const backgroundSize = `calc(${widthExpr} * ${MINI_ME_SPRITE_WIDTH / ACTUAL_CELL_WIDTH}) calc(${widthExpr} * ${MINI_ME_SPRITE_HEIGHT / ACTUAL_CELL_WIDTH})`;
  const backgroundPosition = `calc(${widthExpr} * -${offsetX / ACTUAL_CELL_WIDTH}) calc(${widthExpr} * -${offsetY / ACTUAL_CELL_WIDTH})`;

  const accessibilityProps =
    alt === ''
      ? { 'aria-hidden': true as const }
      : { role: 'img' as const, 'aria-label': alt ?? `mini-me-${miniMeId}` };

  return (
    <span
      {...rest}
      {...accessibilityProps}
      className={clsx(styles.sprite, className)}
      style={{
        width: widthValue,
        height: heightValue,
        backgroundImage: `url(${spriteUrl})`,
        backgroundSize,
        backgroundPosition,
        ...style,
      }}
      data-mini-me-id={miniMeId}
      data-interactive={interactive ? 'true' : undefined}
      draggable={false}
    />
  );
}
