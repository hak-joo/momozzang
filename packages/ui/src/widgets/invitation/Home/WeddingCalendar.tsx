import dayjs from 'dayjs';
import './wedding-calendar.css';
import { useInvitation } from '@entities/WeddingInvitation/Context';

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

  // 🔸 12H → 24H 변환 (12 AM = 0시, 12 PM = 12시)
  const hour24 = ampm === 'AM' ? hour % 12 : (hour % 12) + 12;

  // 🔸 date(YYYY-MM-DD)에 시간 합성
  const target = dayjs(date).hour(hour24).minute(minute).second(0).millisecond(0);

  // 달력 그리기용 값
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

  // 상단 표기
  const headerDate = target.format('YYYY.MM.DD');
  const ampmLabel = ampm === 'AM' ? '오전' : '오후';
  const timeLabel =
    hour === 12 && minute === 0 && ampm === 'AM'
      ? '' // 자정(오전 12:00)은 디자인상 생략하고 싶다면 유지
      : `${ampmLabel} ${hour}시${minute ? ` ${String(minute).padStart(2, '0')}분` : ''}`;

  const diff = target.startOf('day').diff(dayjs().startOf('day'), 'day');
  const dLabel = diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;

  return (
    <section className={`wc-card`}>
      <header className="wc-top">
        <span className="wc-emoji" aria-hidden>
          🎂
        </span>
        <span className="wc-date">{headerDate}</span>
        {timeLabel && <span className="wc-time">{timeLabel}</span>}
      </header>

      <div className="wc-grid">
        <div className="wc-weekhead">
          {koDays.map((d, i) => (
            <div key={d} className={`wc-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="wc-weeks">
          {rows.map((week, rIdx) => (
            <div key={rIdx} className="wc-week">
              {week.map((d, cIdx) => {
                const isSun = cIdx === 0;
                const isSat = cIdx === 6;
                const isSelected = d === selectedDay;
                return (
                  <div
                    key={cIdx}
                    className={[
                      'wc-cell',
                      isSun ? 'sun' : '',
                      isSat ? 'sat' : '',
                      d ? 'in' : 'out',
                      isSelected ? 'selected' : '',
                    ].join(' ')}
                    aria-current={isSelected ? 'date' : undefined}
                  >
                    {d && (
                      <>
                        <span className="wc-num">{d}</span>
                        {isSelected && <span className="wc-marker" aria-hidden />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <footer className="wc-footer" role="note" aria-live="polite">
        <span className="wc-ring" aria-hidden>
          💍
        </span>
        <strong>
          {groomName}, {brideName}
        </strong>
        <span>&nbsp;결혼식까지&nbsp;</span>
        <strong className="wc-dday">{dLabel}</strong>
      </footer>
    </section>
  );
}

export default WeddingCalendar;
