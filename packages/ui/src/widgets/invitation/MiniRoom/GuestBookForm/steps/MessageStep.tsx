import { Button } from '@shared/ui/Button';
import { Box } from '@shared/ui/Box';
import { MiniMe } from '@shared/ui/MiniMe';
import { useGuestBookFormContext, GUESTBOOK_MAX_MESSAGE_LENGTH } from '../context';
import styles from '../GuestBookForm.module.css';

export function MessageStep() {
  const {
    selectedMiniMeId,
    nickname,
    setNickname,
    message,
    setMessage,
    canProceedMessage,
    setStep,
  } = useGuestBookFormContext();

  const handleNext = () => {
    if (!canProceedMessage) return;
    setStep('pin');
  };

  return (
    <>
      <header className={styles.header}>
        <h2 className={styles.title}>방명록 남기기</h2>
        <p className={styles.description}>소중한 한마디를 남겨 주세요.</p>
      </header>

      <Box variant="reversed" className={styles.boxBody}>
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
        </div>
      </Box>

      <div className={styles.actions}>
        <Button fullWidth disabled={!canProceedMessage} onClick={handleNext}>
          다음
        </Button>
        <button type="button" className={styles.backButton} onClick={() => setStep('select')}>
          이전으로
        </button>
      </div>
    </>
  );
}
