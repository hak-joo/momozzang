import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as Dialog from '@shared/ui/Dialog';
import { Button } from '@shared/ui/Button';
import styles from './MessageDialog.module.css';
import { Box } from '../Box';

interface MessageDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /**
   * 알림 모드. 취소 버튼을 **DOM 에서 아예 뺀다**(선택할 것이 하나뿐인 안내에 취소는 뜻이 없다).
   * 컴포넌트 prop 이 아니라 **호출 시 옵션**이다 — 이 대화는 `useMessageDialog` 가 돌려주는 함수를
   * 옵션 객체 하나로 호출해서 연다.
   * 기존 호출부는 이 옵션을 주지 않으므로 확인/취소 2버튼 동작이 그대로다.
   */
  hideCancel?: boolean;
}

type ConfirmHandler = (options: MessageDialogOptions) => Promise<boolean>;

const MessageDialogContext = createContext<ConfirmHandler | null>(null);

const initialDialogState = {
  open: false,
  options: undefined as MessageDialogOptions | undefined,
  resolver: undefined as ((value: boolean) => void) | undefined,
};

export function MessageDialogProvider({ children }: React.PropsWithChildren) {
  const [dialogState, setDialogState] = useState(initialDialogState);

  const closeDialog = useCallback((result: boolean) => {
    setDialogState((prev) => {
      prev.resolver?.(result);
      return initialDialogState;
    });
  }, []);

  const confirm = useCallback<ConfirmHandler>((options) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        open: true,
        options,
        resolver: resolve,
      });
    });
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && dialogState.open) {
        closeDialog(false);
      }
    },
    [closeDialog, dialogState.open],
  );

  const value = useMemo(() => confirm, [confirm]);

  const {
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    hideCancel = false,
  } = dialogState.options ?? {};

  return (
    <MessageDialogContext.Provider value={value}>
      {children}
      <Dialog.Root open={dialogState.open} onOpenChange={handleOpenChange}>
        <Dialog.Content
          className={styles.dialog}
          data-testid="message-dialog"
          useOverlay
          overlayClassName={styles.overlay}
          useAutoClose={false}
        >
          <Box variant="plain" wrapperClassName={styles.boxWrapper} className={styles.box}>
            <div className={styles.confirm}>
              {/* Radix 는 DialogContent 에 DialogTitle 이 없으면 스크린리더 접근성 경고를 콘솔에
                  남긴다(실측). `asChild` 로 기존 `<p>` 마크업·스타일을 그대로 두면서 접근성
                  이름만 등록한다 — 태그가 바뀌면 기존 시각이 흔들린다. */}
              {title && (
                <Dialog.Title asChild>
                  <p className={styles.title} data-testid="message-dialog-title">
                    {title}
                  </p>
                </Dialog.Title>
              )}
              {message && (
                <p className={styles.message} data-testid="message-dialog-message">
                  {message}
                </p>
              )}
            </div>
            <div className={styles.actions}>
              <Button size="sm" data-testid="message-dialog-confirm" onClick={() => closeDialog(true)}>
                {confirmText}
              </Button>
              {hideCancel ? null : (
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="message-dialog-cancel"
                  onClick={() => closeDialog(false)}
                >
                  {cancelText}
                </Button>
              )}
            </div>
          </Box>
        </Dialog.Content>
      </Dialog.Root>
    </MessageDialogContext.Provider>
  );
}

export function useMessageDialog() {
  const ctx = useContext(MessageDialogContext);
  if (!ctx) {
    throw new Error('useMessageDialog must be used within a MessageDialogProvider');
  }
  return ctx;
}
