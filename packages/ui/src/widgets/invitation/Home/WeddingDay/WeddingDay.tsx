import dayjs from 'dayjs';
import type { AmPm } from '@entities/WeddingInvitation/model';

import styles from './WeddingDay.module.css';
import Box from '@shared/ui/Box';

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

function createTimeLabel(ampm: AmPm, hour: number, minute: number) {
  const minuteLabel = minute > 0 ? ` ${minute}분` : '';
  return `${AM_PM_LABEL[ampm]} ${hour}시${minuteLabel}`;
}

function WeddingDay({ date, ampm, hour, minute }: WeddingDayProps) {
  const formattedDate = dayjs(date).format('YYYY/MM/DD');
  const dateTokens = formattedDate.split('');
  const dayOfWeek = dayjs(date).format('dddd');
  const timeLabel = createTimeLabel(ampm, hour, minute);

  return (
    <Box variant="primary" hasBalloon>
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
    </Box>
  );
}

export default WeddingDay;
