import { createContext, useCallback, useContext, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as Dialog from '@momozzang/ui/src/shared/ui/Dialog';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { ControlVariantProvider } from '@momozzang/ui/src/shared/ui/ControlVariant';
import styles from './AdminConfirmDialog.module.css';

export interface AdminConfirmOptions {
  title: string;
  /** 결과의 되돌릴 수 없음 등 판단에 필요한 사실. */
  description?: string;
  /** 기본 `확인`. 파괴적 동작이면 동사로 적는다(예: `삭제`). */
  confirmText?: string;
  /** 기본 `취소`. */
  cancelText?: string;
  /** 파괴적 동작이면 확인 버튼을 위험 색으로 그린다. */
  destructive?: boolean;
}

/**
 * 이름이 `confirm` 이면 안 된다 — 네이티브 대화상자 소스 가드(계약 4 기준 6)가 정상 구현을
 * 위양성으로 잡는다. 호출부는 반드시 `askConfirm` 으로 받는다.
 */
export type AskConfirm = (options: AdminConfirmOptions) => Promise<boolean>;

const AdminConfirmContext = createContext<AskConfirm | null>(null);

interface DialogState {
  open: boolean;
  options?: AdminConfirmOptions;
  resolve?: (value: boolean) => void;
}

const CLOSED: DialogState = { open: false, options: undefined, resolve: undefined };

/**
 * 어드민 확인 대화(SPEC F10 · DoD 24) — 네이티브 확인 대화상자를 대체한다.
 *
 * 표면은 공유 `Dialog` 프리미티브(포털 컨테이너 인지 — S3 자산)를 쓰되 스타일은 어드민
 * `Panel` 언어(흰 면 · 중립 라인 · radius 12)로 그린다. 이 provider 는 `App.tsx` 루트,
 * 즉 `PhonePreview` 의 `PortalContainerProvider` **바깥**에 있으므로 포털이 미리보기
 * 프레임 안으로 빨려 들어가지 않는다(계약 4 §6 R7).
 *
 * 내용물은 다시 `ControlVariantProvider value="admin"` 으로 감싼다 — 라우트 컴포넌트 밖에서
 * 렌더되므로 페이지가 세운 admin 컨텍스트를 상속하지 않기 때문이다.
 */
export function AdminConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(CLOSED);
  const descriptionId = useId();

  const close = useCallback((result: boolean) => {
    setState((prev) => {
      prev.resolve?.(result);
      return CLOSED;
    });
  }, []);

  const askConfirm = useCallback<AskConfirm>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({ open: true, options, resolve });
      }),
    [],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // ESC · 오버레이 클릭은 "취소"와 같다.
      if (!next) close(false);
    },
    [close],
  );

  const value = useMemo(() => askConfirm, [askConfirm]);

  const {
    title = '',
    description,
    confirmText = '확인',
    cancelText = '취소',
    destructive = false,
  } = state.options ?? {};

  return (
    <AdminConfirmContext.Provider value={value}>
      {children}
      <Dialog.Root open={state.open} onOpenChange={handleOpenChange}>
        <Dialog.Content
          useOverlay
          useFadeInOut
          data-testid="admin-confirm-dialog"
          className={styles.dialog}
          overlayClassName={styles.overlay}
          aria-describedby={description ? descriptionId : undefined}
        >
          <ControlVariantProvider value="admin">
            <Dialog.Title className={styles.title} data-testid="admin-confirm-title">
              {title}
            </Dialog.Title>
            {description ? (
              <p
                className={styles.description}
                id={descriptionId}
                data-testid="admin-confirm-description"
              >
                {description}
              </p>
            ) : null}
            <div className={styles.actions}>
              <Button
                variant="secondary"
                data-testid="admin-confirm-cancel"
                onClick={() => close(false)}
              >
                {cancelText}
              </Button>
              <Button
                variant="primary"
                data-testid="admin-confirm-accept"
                className={destructive ? styles.destructive : undefined}
                onClick={() => close(true)}
              >
                {confirmText}
              </Button>
            </div>
          </ControlVariantProvider>
        </Dialog.Content>
      </Dialog.Root>
    </AdminConfirmContext.Provider>
  );
}

/** `const askConfirm = useAdminConfirm();` — 반환 함수를 `confirm` 으로 받지 않는다(기준 6). */
export function useAdminConfirm(): AskConfirm {
  const ask = useContext(AdminConfirmContext);
  if (!ask) {
    throw new Error('useAdminConfirm 은 AdminConfirmProvider 내부에서만 사용할 수 있습니다.');
  }
  return ask;
}
