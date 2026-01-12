import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as RadixToast from '@radix-ui/react-toast';
import { clsx } from 'clsx';
import styles from './Toast.module.css';
import { ToastContext, type ToastApi, type ToastOptions, type ToastVariant } from './ToastContext';

interface ToastInternal extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

const DEFAULT_DURATION = 2000;

function createToastId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

type ToastProviderProps = RadixToast.ToastProviderProps & {
  children: ReactNode;
};

export function ToastProvider({
  duration = DEFAULT_DURATION,
  children,
  ...rest
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (variant: ToastVariant, options: ToastOptions) => {
      const id = createToastId();
      setToasts((prev) => [
        ...prev,
        {
          id,
          variant,
          title: options.title,
          description: options.description,
          duration: options.duration ?? duration,
        },
      ]);
    },
    [duration],
  );

  const contextValue = useMemo<ToastApi>(
    () => ({
      info: (options) => pushToast('info', options),
      success: (options) => pushToast('success', options),
      error: (options) => pushToast('error', options),
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      <RadixToast.Provider duration={duration} swipeDirection="down" {...rest}>
        {children}
        <RadixToast.Viewport className={styles.viewport} />
        {toasts.map((toast) => {
          return (
            <RadixToast.Root
              key={toast.id}
              className={clsx(styles.root)}
              duration={toast.duration}
              onOpenChange={(open) => {
                if (!open) {
                  removeToast(toast.id);
                }
              }}
            >
              <div className={styles.contentRow}>
                <RadixToast.Title className={styles.title}>{toast.title}</RadixToast.Title>
                {toast.description ? (
                  <RadixToast.Description className={styles.description}>
                    {toast.description}
                  </RadixToast.Description>
                ) : null}
              </div>
            </RadixToast.Root>
          );
        })}
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast는 ToastProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
}
