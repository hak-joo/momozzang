import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import type { AmPm } from '../../../entities/WeddingInvitation/model';
import styles from './TimePicker.module.css';

export interface TimePickerValue {
  /** 'AM'(오전) | 'PM'(오후) */
  ampm: AmPm;
  /** 1~12 */
  hour: number;
  /** 0~59 */
  minute: number;
}

export interface TimePickerProps {
  /** 제어 값. */
  value: TimePickerValue;
  /** 변경 시 다음 값 전체를 전달한다. */
  onChange: (next: TimePickerValue) => void;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/** 트리거에 보여줄 사람이 읽는 형식: 오후 5시 45분. */
function formatDisplay({ ampm, hour, minute }: TimePickerValue): string {
  const period = ampm === 'AM' ? '오전' : '오후';
  return `${period} ${hour}시 ${minute}분`;
}

export function TimePicker({
  value,
  onChange,
  id,
  className,
  'aria-label': ariaLabel,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupId = useId();

  // 외부 클릭 닫힘
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // ESC 닫힘 (팝업/트리거 포커스 전제)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const handleAmPm = (ampm: AmPm) => {
    onChange({ ...value, ampm });
  };

  const handleHour = (hour: number) => {
    onChange({ ...value, hour });
  };

  const handleMinute = (minute: number) => {
    onChange({ ...value, minute });
  };

  return (
    <div ref={rootRef} className={clsx(styles.root, className)} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerText}>{formatDisplay(value)}</span>
        <span className={styles.triggerIcon} aria-hidden>
          🕐
        </span>
      </button>

      {open && (
        <div className={styles.popup} role="dialog" aria-modal="false" id={popupId}>
          {/* 오전/오후 토글 */}
          <div className={styles.ampmToggle} role="group" aria-label="오전/오후">
            {(['AM', 'PM'] as AmPm[]).map((period) => (
              <button
                key={period}
                type="button"
                className={clsx(styles.ampmButton, value.ampm === period && styles.active)}
                aria-pressed={value.ampm === period}
                onClick={() => handleAmPm(period)}
              >
                {period === 'AM' ? '오전' : '오후'}
              </button>
            ))}
          </div>

          {/* 시 / 분 컬럼 리스트 */}
          <div className={styles.columns}>
            <div className={styles.column}>
              <span className={styles.columnLabel}>시</span>
              <ul className={styles.list} role="listbox" aria-label="시 선택">
                {HOURS.map((h) => (
                  <li key={h} role="option" aria-selected={value.hour === h}>
                    <button
                      type="button"
                      className={clsx(styles.item, value.hour === h && styles.active)}
                      onClick={() => handleHour(h)}
                    >
                      {h}시
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.column}>
              <span className={styles.columnLabel}>분</span>
              <ul className={styles.list} role="listbox" aria-label="분 선택">
                {MINUTES.map((m) => (
                  <li key={m} role="option" aria-selected={value.minute === m}>
                    <button
                      type="button"
                      className={clsx(styles.item, value.minute === m && styles.active)}
                      onClick={() => handleMinute(m)}
                    >
                      {m}분
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
