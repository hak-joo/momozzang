import dayjs from 'dayjs';
import clsx from 'clsx';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import { Box } from '@shared/ui/Box';
import styles from './WeddingCalendar.module.css';
import { toHour24 } from '@shared/util/date';
import { dayNames } from './constants';
import { WeddingCalendarSummary } from './Summary';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function WeddingCalendar() {
  const invitation = useInvitation();
  const {
    couple,
    invitationInfo,
    weddingHallInfo: { date, ampm, hour, minute, hallName, address },
  } = invitation;

  const handleGoogleCalendar = () => {
    const hour24 = toHour24(hour, ampm);
    const start = dayjs(date).hour(hour24).minute(minute).second(0);
    const end = start.add(2, 'hour');

    const startUtc = start.toDate().toISOString().replace(/-|:|\.\d+/g, '');
    const endUtc = end.toDate().toISOString().replace(/-|:|\.\d+/g, '');

    const title = encodeURIComponent(`${couple.groom.name} ♥ ${couple.bride.name} 결혼식`);
    const details = encodeURIComponent(`${invitationInfo.title}\n예식장: ${hallName}`);
    const location = encodeURIComponent(`${hallName} (${address})`);

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${location}`;
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  const handleIcsDownload = () => {
    const hour24 = toHour24(hour, ampm);
    const start = dayjs(date).hour(hour24).minute(minute).second(0);
    const end = start.add(2, 'hour');

    const startUtc = start.toDate().toISOString().replace(/-|:|\.\d+/g, '');
    const endUtc = end.toDate().toISOString().replace(/-|:|\.\d+/g, '');
    const title = `${couple.groom.name} ♥ ${couple.bride.name} 결혼식`;
    const location = `${hallName} (${address})`;
    const description = `${invitationInfo.title}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//momozzang//Wedding Calendar//KO',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@momozzang.com`,
      `DTSTAMP:${startUtc}`,
      `DTSTART:${startUtc}`,
      `DTEND:${endUtc}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-${date}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hour24 = toHour24(hour, ampm);
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

      <div className={styles.calendarActions}>
        <button
          type="button"
          className={styles.calendarButton}
          onClick={handleGoogleCalendar}
        >
          Google 캘린더
        </button>
        <button
          type="button"
          className={styles.calendarButton}
          onClick={handleIcsDownload}
        >
          .ics 파일 저장
        </button>
      </div>
    </div>
  );
}
