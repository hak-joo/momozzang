import dayjs from 'dayjs';
import clsx from 'clsx';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import styles from './style.module.css';

const koDays = ['일', '월', '화', '수', '목', '금', '토'];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function WeddingCalendar() {
  const data = useInvitation();
  const { date, ampm, hour, minute } = data.weddingHallInfo;
  const groomName = data.couple.groom.name;
  const brideName = data.couple.bride.name;

  const hour24 = ampm === 'AM' ? hour % 12 : (hour % 12) + 12;

  const target = dayjs(date).hour(hour24).minute(minute).second(0).millisecond(0);

  const monthStart = target.startOf('month');
  const daysInMonth = target.daysInMonth();
  const startWeekday = monthStart.day(); // 0=일 ~ 6=토
  const selectedDay = target.date();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = chunk(cells, 7);

  const headerDate = target.format('YYYY.MM.DD');
  const ampmLabel = ampm === 'AM' ? '오전' : '오후';
  const timeLabel =
    hour === 12 && minute === 0 && ampm === 'AM'
      ? ''
      : `${ampmLabel} ${hour}시${minute ? ` ${String(minute).padStart(2, '0')}분` : ''}`;

  const diff = target.startOf('day').diff(dayjs().startOf('day'), 'day');
  const dLabel = diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;

  return (
    <section className={styles.wcCard}>
      <header className={styles.wcTop}>
        <span className={styles.wcEmoji} aria-hidden>
          🎂
        </span>
        <span className={styles.wcDate}>{headerDate}</span>
        {timeLabel && <span className={styles.wcTime}>{timeLabel}</span>}
      </header>

      <div className={styles.wcGrid}>
        <div className={styles.wcWeekHead}>
          {koDays.map((d, i) => (
            <div
              key={d}
              className={clsx(styles.wcWd, i === 0 && styles.wcWdSun, i === 6 && styles.wcWdSat)}
            >
              {d}
            </div>
          ))}
        </div>

        <div className={styles.wcWeeks}>
          {rows.map((week, rIdx) => (
            <div key={rIdx} className={styles.wcWeek}>
              {week.map((d, cIdx) => {
                const isSun = cIdx === 0;
                const isSat = cIdx === 6;
                const isSelected = d === selectedDay;
                return (
                  <div
                    key={cIdx}
                    className={clsx(
                      styles.wcCell,
                      isSun && styles.wcCellSun,
                      isSat && styles.wcCellSat,
                      !d && styles.wcCellOut,
                      isSelected && styles.wcCellSelected,
                    )}
                    aria-current={isSelected ? 'date' : undefined}
                  >
                    {d && (
                      <>
                        <span className={styles.wcNum}>{d}</span>
                        {isSelected && <span className={styles.wcMarker} aria-hidden />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <footer className={styles.wcFooter} role="note" aria-live="polite">
        <span className={styles.wcRing} aria-hidden>
          💍
        </span>
        <strong>
          {groomName}, {brideName}
        </strong>
        <span>&nbsp;결혼식까지&nbsp;</span>
        <strong className={styles.wcDday}>{dLabel}</strong>
      </footer>
    </section>
  );
}

export default WeddingCalendar;
