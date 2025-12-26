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

  const { title, message, confirmText = '확인', cancelText = '취소' } = dialogState.options ?? {};

  return (
    <MessageDialogContext.Provider value={value}>
      {children}
      <Dialog.Root open={dialogState.open} onOpenChange={handleOpenChange}>
        <Dialog.Content
          className={styles.dialog}
          useOverlay
          overlayClassName={styles.overlay}
          useAutoClose={false}
        >
          <Box variant="plain" wrapperClassName={styles.boxWrapper} className={styles.box}>
            <div className={styles.confirm}>
              {title && <p className={styles.title}>{title}</p>}
              {message && <p className={styles.message}>{message}</p>}
            </div>
            <div className={styles.actions}>
              <Button size="sm" onClick={() => closeDialog(true)}>
                {confirmText}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => closeDialog(false)}>
                {cancelText}
              </Button>
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
