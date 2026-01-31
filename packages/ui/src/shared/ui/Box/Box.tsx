import styles from './Box.module.css';
import { clsx } from 'clsx';
import heartBalloon from '@shared/assets/images/heart-balloon.png';
import weddingDayImg from '@shared/assets/images/wedding-day.png';
import type { PropsWithChildren, CSSProperties } from 'react';
import { getThemeHue } from '@shared/styles/utils';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import { ThemedImage } from '../ThemedImage/ThemedImage';

type Variant = 'primary' | 'secondary' | 'reversed' | 'plain';
type Shape = 'rect' | 'rounded';
type DotOffset = 16 | 24;
export interface Props {
  wrapperClassName?: string;
  className?: string;
  variant: Variant;
  shape?: Shape;
  hasBalloon?: boolean;
  hasDecoration?: boolean;
  dotOffset?: DotOffset;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function Box({
  wrapperClassName,
  className,
  shape = 'rect',
  hasBalloon = false,
  hasDecoration = false,
  children,
  variant = 'primary',
  dotOffset = 16,
}: PropsWithChildren<Props>) {
  const { customization } = useInvitation();

  const themeHue = getThemeHue(customization?.themeColor);

  const boardStyle: CSSProperties = { ['--dot-offset' as string]: `${dotOffset}px` };

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
    <div className={clsx(styles.wrapper, wrapperClassName)}>
      {hasBalloon && (
        <>
          <ThemedImage
            aria-hidden="true"
            src={heartBalloon}
            alt=""
            className={clsx(styles.balloon, styles.balloonLeft)}
            targetHue={themeHue}
          />
          <ThemedImage
            aria-hidden="true"
            src={heartBalloon}
            alt=""
            className={clsx(styles.balloon, styles.balloonRight)}
            targetHue={themeHue}
          />
        </>
      )}

      {hasDecoration && (
        <ThemedImage
          aria-hidden="true"
          src={weddingDayImg}
          alt=""
          className={clsx(styles.decoration)}
          targetHue={themeHue}
        />
      )}

      <div
        className={clsx(
          styles.board,
          className,
          { [styles.hasDecoration]: hasDecoration },
          styles[`${variant}` as keyof typeof styles],
          styles[`${shape}` as keyof typeof styles],
        )}
        style={boardStyle}
      >
        {dots}
        {children}
      </div>
    </div>
  );
}
