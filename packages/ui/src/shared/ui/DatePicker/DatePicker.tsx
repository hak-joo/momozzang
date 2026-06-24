import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { DayPicker } from 'react-day-picker';
import { ko } from 'react-day-picker/locale';
import { clsx } from 'clsx';
import 'react-day-picker/style.css';
import styles from './DatePicker.module.css';

export interface DatePickerProps {
  /** 제어 값. YYYY-MM-DD 형식. 빈 문자열이면 미선택. */
  value: string;
  /** 선택 시 다음 YYYY-MM-DD 값을 전달한다. */
  onChange: (next: string) => void;
  id?: string;
  /** 트리거에 표시할 placeholder (미선택 시) */
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' → 로컬 Date (UTC 파싱으로 인한 하루 밀림 방지). */
function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Date → 'YYYY-MM-DD' (로컬 기준, toISOString 의 UTC 오프셋 회피). */
function formatValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 트리거에 보여줄 사람이 읽는 형식: 2026년 6월 24일 (화). */
function formatDisplay(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}년 ${m}월 ${d}일 (${WEEKDAY[date.getDay()]})`;
}

export function DatePicker({
  value,
  onChange,
  id,
  placeholder = '날짜를 선택하세요',
  className,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = parseDate(value);
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

  const handleSelect = (next: Date | undefined) => {
    if (!next) return;
    onChange(formatValue(next));
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={clsx(styles.root, className)} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={clsx(styles.trigger, !selected && styles.placeholder)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerText}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <span className={styles.triggerIcon} aria-hidden>
          📅
        </span>
      </button>

      {open && (
        <div className={styles.popup} role="dialog" aria-modal="false" id={popupId}>
          <DayPicker
            mode="single"
            locale={ko}
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            showOutsideDays
            className={styles.calendar}
            classNames={{
              today: styles.today,
              selected: styles.selected,
            }}
          />
        </div>
      )}
    </div>
  );
}
