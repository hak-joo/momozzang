import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import {
  AdminToastContext,
  type AdminToastApi,
  type AdminToastOptions,
  type AdminToastVariant,
} from './adminToastContext';
import styles from './AdminToast.module.css';

interface AdminToastItem extends AdminToastOptions {
  id: string;
  variant: AdminToastVariant;
  duration: number;
}

/** 실패는 읽을 시간이 더 필요하다. */
const DEFAULT_DURATION: Record<AdminToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};

let seq = 0;
const nextId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `admin-toast-${Date.now()}-${(seq += 1)}`;

/**
 * 어드민 크롬 전용 비차단 피드백(SPEC F10 · DoD 24).
 *
 * **공유 `packages/ui` 의 `ToastProvider` 를 쓰지 않는다.** 실측 근거 2건(계약 4 §0.1):
 *  1. 공유 Toast 의 `Toast.module.css` 에는 variant 클래스가 **0개**라 success/error/info 가
 *     시각적으로 완전히 동일하다 — SPEC F10 의 "성공/실패를 색과 문구로 구분"을 만족시킬 수 없다.
 *  2. 공유 Toast 의 `.root` 는 `--color-gradient-*` + `color:#fff` 로 **뷰어 팔레트**를 쓴다.
 *     SPEC §1.4 가 어드민 크롬에 금지한 바로 그 색 강조다.
 * 공유 컴포넌트를 고치면 뷰어 토스트의 회귀면이 열린다. `Panel`·`FileDropField`·`ImageThumb`
 * 가 이미 `apps/momozzang-admin/src/shared/ui/` 에 사는 이 저장소의 확립된 패턴을 따른다.
 *
 * **중첩 함정(SPEC §4.4)에 대한 구조적 답.** `/apply` 의 폰 미리보기 안에는 뷰어의 Radix
 * `ToastProvider` 가 그대로 남는다. 두 시스템은 다른 React 컨텍스트 · 다른 DOM 뷰포트 ·
 * 다른 CSS Module 이라 서로를 볼 수 없다. 이 뷰포트는 `App.tsx` 루트에서 렌더되므로
 * `.screen` 밖에 있고, 우측 하단 고정이라 `.screen`(1440 에서 x 188.5~539.5) 과 교차하지 않는다
 * (계약 4 기준 7·8 이 직접 잰다).
 */
export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AdminToastItem[]>([]);
  // 타이머는 렌더와 무관한 부수효과라 ref 에 둔다. 언마운트 시 전부 해제한다.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: AdminToastVariant, options: AdminToastOptions) => {
      const id = nextId();
      const duration = options.duration ?? DEFAULT_DURATION[variant];
      setToasts((prev) => [...prev, { ...options, id, variant, duration }]);
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration),
      );
    },
    [],
  );

  const dismissAll = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = useMemo<AdminToastApi>(
    () => ({
      success: (options) => push('success', options),
      error: (options) => push('error', options),
      info: (options) => push('info', options),
      dismissAll,
    }),
    [push, dismissAll],
  );

  return (
    <AdminToastContext.Provider value={api}>
      {children}
      {/* 뷰포트는 항상 DOM 에 있다 — 측정(기준 7·8)과 aria-live 영역의 안정성 양쪽에 필요하다. */}
      <ol
        className={styles.viewport}
        data-admin-toast-viewport=""
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <li
            key={toast.id}
            className={clsx(styles.toast, styles[toast.variant])}
            data-admin-toast={toast.variant}
            role={toast.variant === 'error' ? 'alert' : 'status'}
          >
            <div className={styles.body}>
              <p className={styles.title}>{toast.title}</p>
              {toast.description ? <p className={styles.description}>{toast.description}</p> : null}
            </div>
            <button
              type="button"
              className={styles.dismiss}
              onClick={() => dismiss(toast.id)}
              aria-label="알림 닫기"
            >
              닫기
            </button>
          </li>
        ))}
      </ol>
    </AdminToastContext.Provider>
  );
}

/** 어드민 크롬 어디서나 비차단 피드백을 띄운다. provider 밖에서 부르면 즉시 실패시킨다. */
export function useAdminToast(): AdminToastApi {
  const api = useContext(AdminToastContext);
  if (!api) {
    throw new Error('useAdminToast 는 AdminToastProvider 내부에서만 사용할 수 있습니다.');
  }
  return api;
}
