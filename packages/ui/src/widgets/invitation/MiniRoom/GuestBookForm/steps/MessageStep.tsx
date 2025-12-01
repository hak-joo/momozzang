import { Button } from '@shared/ui/Button';
import { Box } from '@shared/ui/Box';
import { MiniMe } from '@shared/ui/MiniMe';
import {
  useGuestBookFormContext,
  GUESTBOOK_MAX_MESSAGE_LENGTH,
  GUESTBOOK_PASSWORD_LENGTH,
} from '../context';
import styles from '../GuestBookForm.module.css';

interface MessageStepProps {
  onSubmit: () => void;
  submitting?: boolean;
}

export function MessageStep({ onSubmit, submitting = false }: MessageStepProps) {
  const {
    selectedMiniMeId,
    nickname,
    setNickname,
    message,
    setMessage,
    password,
    setPassword,
    canSubmit,
    setStep,
  } = useGuestBookFormContext();

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;
    onSubmit();
  };

  const handlePasswordChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, GUESTBOOK_PASSWORD_LENGTH);
    setPassword(sanitized);
  };

  return (
    <>
      <header className={styles.header}>
        <h2 className={styles.title}>방명록 남기기</h2>
        <p className={styles.description}>소중한 한마디를 남겨 주세요.</p>
      </header>

      <Box variant="reversed" className={styles.boxBody} dotOffset={24}>
        <div className={styles.selectedPreview}>
          {selectedMiniMeId && <MiniMe miniMeId={selectedMiniMeId} size={40} />}
        </div>
        <div className={styles.fieldList}>
          <label className={styles.field}>
            <input
              className={styles.input}
              value={nickname}
              placeholder="이름을 입력해주세요"
              maxLength={20}
              onChange={(event) => setNickname(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <textarea
              className={styles.textarea}
              value={message}
              placeholder="축하 메시지를 남겨주세요"
              maxLength={GUESTBOOK_MAX_MESSAGE_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className={styles.charCounter}>
              {message.length}/{GUESTBOOK_MAX_MESSAGE_LENGTH}
            </span>
          </label>

          <label className={styles.field}>
            <input
              className={styles.input}
              value={password}
              placeholder="숫자 4자리를 입력해주세요"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={GUESTBOOK_PASSWORD_LENGTH}
              onChange={(event) => handlePasswordChange(event.target.value)}
            />
          </label>
        </div>
      </Box>

      <div className={styles.actions}>
        <Button fullWidth disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? '완료 중...' : '완료'}
        </Button>
        <button type="button" className={styles.backButton} onClick={() => setStep('select')}>
          이전으로
        </button>
      </div>
    </>
  );
}
