import { clsx } from 'clsx';
import dayjs from 'dayjs';
import type { AmPm } from '@entities/WeddingInvitation/model';
import heartBalloon from './HeartBalloon.png';
import styles from './style.module.css';

interface WeddingDayProps {
  date: string;
  ampm: AmPm;
  hour: number;
  minute: number;
  className?: string;
}

const AM_PM_LABEL: Record<AmPm, string> = {
  AM: '오전',
  PM: '오후',
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createTimeLabel(ampm: AmPm, hour: number, minute: number) {
  const minuteLabel = minute > 0 ? ` ${minute}분` : '';
  return `${AM_PM_LABEL[ampm]} ${hour}시${minuteLabel}`;
}

function WeddingDay({ date, ampm, hour, minute, className }: WeddingDayProps) {
  const formattedDate = dayjs(date).format('YYYY/MM/DD');
  const dateTokens = formattedDate.split('');
  const dayOfWeek = dayjs(date).format('dddd');
  const timeLabel = createTimeLabel(ampm, hour, minute);
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
    <div className={clsx(styles.wrapper, className)}>
      <img
        src={heartBalloon}
        alt=""
        className={clsx(styles.balloon, styles.balloonLeft)}
        aria-hidden="true"
      />
      <div className={styles.board}>
        {dots}
        <div className={styles.dateRow}>
          {dateTokens.map((token, index) =>
            token === '/' ? (
              <span className={styles.separator} key={`separator-${index}`}>
                {token}
              </span>
            ) : (
              <span className={styles.digit} key={`digit-${index}`}>
                {token}
              </span>
            ),
          )}
        </div>
        <p className={styles.timeText}>
          {dayOfWeek} {timeLabel}
        </p>
      </div>
      <img
        src={heartBalloon}
        alt=""
        className={clsx(styles.balloon, styles.balloonRight)}
        aria-hidden="true"
      />
    </div>
  );
}

export default WeddingDay;
