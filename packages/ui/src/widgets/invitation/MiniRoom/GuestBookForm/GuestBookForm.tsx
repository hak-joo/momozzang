import { useCallback, useState } from 'react';
import * as BottomSheet from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';
import { MessageDialogProvider, useMessageDialog } from '@shared/ui/MessageDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveGuestBook, guestBookQueryKeys } from '../api/guestBook';
import { GuestBookFormProvider, useGuestBookFormContext } from './context';
import { MiniMeSelectionStep } from './steps/MiniMeSelectionStep';
import { MessageStep } from './steps/MessageStep';
import styles from './GuestBookForm.module.css';
import { useParams } from 'react-router-dom';
import { useToast } from '@shared/ui/Toast';
import { PixelChevronLeftIcon } from '@shared/ui/Icon/PixelChevron';

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
  const { invitationId } = useParams();
  const isMock = !invitationId;

  const confirm = useMessageDialog();
  const {
    step,
    isDirty,
    reset,
    setStep,
    selectedMiniMeId,
    nickname,
    message,
    password,
    canSubmit,
  } = useGuestBookFormContext();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: saveGuestBook,
  });

  const { info } = useToast();

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
    try {
      await saveMutation.mutateAsync({
        invitationId,
        isMock,
        miniMeId: selectedMiniMeId,
        nickname: nickname.trim(),
        message: message.trim(),
        password,
      });
      await queryClient.invalidateQueries({
        queryKey: guestBookQueryKeys.list(invitationId, isMock),
      });

      await queryClient.invalidateQueries({
        queryKey: guestBookQueryKeys.top(invitationId, isMock),
      });

      await attemptClose(true);
      info({ title: '방명록을 남겼습니다.' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    attemptClose,
    canSubmit,
    invitationId,
    isMock,
    isSubmitting,
    message,
    nickname,
    password,
    queryClient,
    saveMutation,
    selectedMiniMeId,
  ]);

  return (
    <BottomSheet.Root open={open} onOpenChange={handleOpenChange}>
      <BottomSheet.Trigger asChild>
        <Button shape="round">
          방명록 남기기
          <PixelChevronLeftIcon width={12} height={12} />
        </Button>
      </BottomSheet.Trigger>

      <BottomSheet.Content height="92vh" className={styles.sheetContent}>
        <BottomSheet.Close />

        {step === 'select' && <MiniMeSelectionStep />}
        {step === 'message' && <MessageStep onSubmit={handleSubmit} submitting={isSubmitting} />}
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
