import { clsx } from 'clsx';
import styles from './DdayBadge.module.css';
import { PixelHeart } from '../Icon/PixelHeart';
import { Decoration } from '../Decoration/Decoration';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import dayjs from 'dayjs';

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DdayBadge() {
  const { weddingHallInfo } = useInvitation();
  const remainingDays = dayjs(weddingHallInfo.date).diff(dayjs().format('YYYY-MM-DD'), 'day');
  weddingHallInfo.date;

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

  const remainingDaysText = () => {
    if (remainingDays < 0) {
      return `D+${Math.abs(remainingDays)}`;
    } else if (remainingDays === 0) {
      return `D-Day`;
    } else {
      return `D-${remainingDays}`;
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.dDayBadge}>
        <PixelHeart className={styles.heart} width={28} height={27} />
        <div className={styles.day}>
          <span>{remainingDaysText()}</span>

          {dots}
          <Decoration variant="sparkleCross" top={-25} left={10} width={30} />
          <Decoration variant="sparkle" bottom={-10} right={10} width={30} />
        </div>
      </div>
    </div>
  );
}
