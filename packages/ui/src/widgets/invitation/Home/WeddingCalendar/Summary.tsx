import dayjs from 'dayjs';
import clsx from 'clsx';
import { RabbitEar } from '@shared/ui/Icon/RabbitEar';
import styles from './Summary.module.css';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import { dayNames } from './constants';

function formatTimeLabel(target: dayjs.Dayjs) {
  const minutes = target.minute();
  const hour24 = target.hour();
  if (hour24 === 0 && minutes === 0) return '';

  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minutePart = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;
  return `${hour12}${minutePart} ${suffix}`;
}

export function WeddingCalendarSummary() {
  const {
    weddingHallInfo: { date, ampm, hour, minute },
  } = useInvitation();
  const hour24 = ampm === 'AM' ? hour % 12 : (hour % 12) + 12;

  const weddingDay = dayjs(date).hour(hour24).minute(minute).second(0).millisecond(0);

  const summaryEntries = [
    { date: weddingDay.subtract(1, 'day'), note: '기대 및 긴장중..' },
    { date: weddingDay, note: formatTimeLabel(weddingDay) || '웨딩 데이' },
    { date: weddingDay.add(1, 'day'), note: '신혼여행 ^0^' },
  ].map((entry, index) => ({
    key: entry.date.format('YYYY-MM-DD'),
    label: dayNames[entry.date.day()],
    dayNumber: String(entry.date.date()).padStart(2, '0'),
    note: entry.note,
    isCurrent: index === 1,
  }));

  return (
    <div className={styles.summary}>
      <RabbitEar className={styles.rabbitEar} />
      <div className={styles.summaryTable}>
        {summaryEntries.map(({ key, label, dayNumber, note, isCurrent }) => (
          <div
            key={key}
            className={clsx(styles.summaryCell, isCurrent && styles.summaryCellHighlight)}
          >
            <span className={styles.summaryDayName}>{label}</span>

            <div className={styles.summaryDayDate}>
              <span className={styles.summaryDayNumber}>{dayNumber}</span>
              <span className={styles.summaryDayNote}>{note}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
