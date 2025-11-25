import { useCallback, useState } from 'react';
import * as BottomSheet from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';
import { MessageDialogProvider, useMessageDialog } from '@shared/ui/MessageDialog';
import { GuestBookFormProvider, useGuestBookFormContext } from './context';
import { MiniMeSelectionStep } from './steps/MiniMeSelectionStep';
import { MessageStep } from './steps/MessageStep';
import { PinStep } from './steps/PinStep';
import styles from './GuestBookForm.module.css';

export function GuestBookForm() {
  return (
    <MessageDialogProvider>
      <GuestBookFormProvider>
        <GuestBookFormContainer />
      </GuestBookFormProvider>
    </MessageDialogProvider>
  );
}

function GuestBookFormContainer() {
  const confirm = useMessageDialog();
  const {
    step,
    isDirty,
    reset,
    setStep,
    selectedMiniMeId,
    nickname,
    message,
    pinCodes,
    canSubmit,
  } = useGuestBookFormContext();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }
    void attemptClose();
  };

  const attemptClose = useCallback(
    async (force = false) => {
      if (!force && isDirty) {
        const shouldClose = await confirm({
          title: '작성 중인 내용이 있어요.',
          message: '작성 중인 내용이 사라집니다. 닫을까요?',
          confirmText: '닫기',
          cancelText: '계속 작성',
        });
        if (!shouldClose) return false;
      }
      reset();
      setStep('select');
      setOpen(false);
      return true;
    },
    [confirm, isDirty, reset, setStep],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting || selectedMiniMeId === null) return;
    setIsSubmitting(true);
    const payload = {
      miniMeId: selectedMiniMeId,
      nickname: nickname.trim(),
      message: message.trim(),
      passcode: pinCodes.join(''),
    };
    console.log('Guest book submission', payload);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsSubmitting(false);
    await attemptClose(true);
  }, [attemptClose, canSubmit, isSubmitting, message, nickname, pinCodes, selectedMiniMeId]);

  return (
    <BottomSheet.Root open={open} onOpenChange={handleOpenChange}>
      <BottomSheet.Trigger asChild>
        <Button variant="secondary">방명록 남기기</Button>
      </BottomSheet.Trigger>

      <BottomSheet.Content height="92vh" className={styles.sheetContent}>
        <BottomSheet.Close />

        {step === 'select' && <MiniMeSelectionStep />}
        {step === 'message' && <MessageStep />}
        {step === 'pin' && <PinStep onSubmit={handleSubmit} submitting={isSubmitting} />}
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
