import { useRef } from 'react';
import { Button } from '@shared/ui/Button';
import { Box } from '@shared/ui/Box';
import { useGuestBookFormContext, GUESTBOOK_PIN_LENGTH } from '../context';
import styles from '../GuestBookForm.module.css';

interface PinStepProps {
  onSubmit: () => void;
  submitting?: boolean;
}

export function PinStep({ onSubmit, submitting = false }: PinStepProps) {
  const { pinCodes, setPinDigit, canSubmit, setStep } = useGuestBookFormContext();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 1);
    setPinDigit(index, sanitized);
    if (sanitized && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !pinCodes[index] && inputRefs.current[index - 1]) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <>
      <header className={styles.header}>
        <h2 className={styles.title}>비밀번호 4자리 입력하기</h2>
        <p className={styles.description}>작성한 방명록을 수정/삭제할 때 필요해요.</p>
      </header>

      <div className={styles.boxBody}>
        <div className={styles.pinInputs}>
          {Array.from({ length: GUESTBOOK_PIN_LENGTH }).map((_, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              className={styles.pinInput}
              value={pinCodes[index]}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
            />
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <Button fullWidth disabled={!canSubmit || submitting} onClick={onSubmit}>
          {submitting ? '완료 중...' : '완료'}
        </Button>
        <button type="button" className={styles.backButton} onClick={() => setStep('message')}>
          이전으로
        </button>
      </div>
    </>
  );
}
