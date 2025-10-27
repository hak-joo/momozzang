import styles from './Box.module.css';
import { clsx } from 'clsx';
import heartBalloon from '@shared/assets/images/heart-balloon.png';
import type { PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'reversed';
export interface Props {
  className?: string;
  variant: Variant;
  hasBalloon?: boolean;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Box({
  className,
  hasBalloon = false,
  children,
  variant = 'primary',
}: PropsWithChildren<Props>) {
  const verticalPositions = ['top', 'bottom'] as const;
  const horizontalPositions = ['left', 'right'] as const;
  const dots = verticalPositions.flatMap((vertical) =>
    horizontalPositions.map((horizontal) => (
      <span
        key={`${vertical}-${horizontal}`}
        className={clsx(
          styles.dot,
          styles[`dot${capitalize(vertical)}` as keyof typeof styles],
          styles[`dot${capitalize(horizontal)}` as keyof typeof styles],
        )}
        aria-hidden="true"
      />
    )),
  );

  return (
    <div className={clsx(styles.wrapper)}>
      {hasBalloon && (
        <>
          <img
            src={heartBalloon}
            alt=""
            className={clsx(styles.balloon, styles.balloonLeft)}
            aria-hidden="true"
          />
          <img
            src={heartBalloon}
            alt=""
            className={clsx(styles.balloon, styles.balloonRight)}
            aria-hidden="true"
          />
        </>
      )}
      <div className={clsx(styles.board, className, styles[`${variant}` as keyof typeof styles])}>
        {dots}
        {children}
      </div>
    </div>
  );
}

export default Box;
