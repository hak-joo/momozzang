import dayjs from 'dayjs';
import clsx from 'clsx';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import { Box } from '@shared/ui/Box';
import styles from './WeddingCalendar.module.css';
import { dayNames } from './constants';
import { WeddingCalendarSummary } from './Summary';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function WeddingCalendar() {
  const {
    weddingHallInfo: { date, ampm, hour, minute },
  } = useInvitation();

  const hour24 = ampm === 'AM' ? hour % 12 : (hour % 12) + 12;
  const weddingDay = dayjs(date).hour(hour24).minute(minute).second(0).millisecond(0);
  const monthLabel = `${weddingDay.month() + 1}월`;

  const monthStart = weddingDay.startOf('month');
  const daysInMonth = weddingDay.daysInMonth();
  const startWeekday = monthStart.day(); // 0=일 ~ 6=토
  const selectedDay = weddingDay.date();

  type CalendarCell = { day: number; inMonth: boolean };

  const prevMonthDays = weddingDay.subtract(1, 'month').daysInMonth();
  const leadingDays: CalendarCell[] = Array.from({ length: startWeekday }, (_, i) => ({
    day: prevMonthDays - startWeekday + i + 1,
    inMonth: false,
  }));
  const monthDays: CalendarCell[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    inMonth: true,
  }));

  const cells: (CalendarCell | null)[] = [...leadingDays, ...monthDays];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = chunk(cells, 7);

  return (
    <div className={styles.wrapper}>
      <Box
        variant="primary"
        hasBalloon
        hasDecoration
        className={styles.calendarBox}
        wrapperClassName={styles.calendarWrapper}
      >
        <section className={styles.calendar}>
          <header className={styles.header}>{monthLabel}</header>
          <div className={styles.grid}>
            <div className={styles.weekHead}>
              {dayNames.map((day, index) => (
                <div
                  key={day}
                  className={clsx(
                    styles.weekday,
                    index === 0 && styles.weekdaySunday,
                    index === 6 && styles.weekdaySaturday,
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className={styles.weeks}>
              {weeks.map((week, rIdx) => (
                <div key={`week-${rIdx}`} className={styles.week}>
                  {week.map((cell, cIdx) => (
                    <div
                      key={`day-${rIdx}-${cIdx}`}
                      className={clsx(
                        styles.cell,
                        (!cell || !cell.inMonth) && styles.cellOut,
                        cIdx === 0 && styles.cellSunday,
                        cIdx === 6 && styles.cellSaturday,
                        cell?.inMonth && cell.day === selectedDay && styles.cellSelected,
                      )}
                      aria-current={cell?.inMonth && cell.day === selectedDay ? 'date' : undefined}
                    >
                      {cell && (
                        <>
                          {cell.inMonth && cell.day === selectedDay && (
                            <span className={styles.dayMarker} aria-hidden />
                          )}
                          <span className={styles.day}>{cell.day}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </Box>

      <WeddingCalendarSummary />
    </div>
  );
}
