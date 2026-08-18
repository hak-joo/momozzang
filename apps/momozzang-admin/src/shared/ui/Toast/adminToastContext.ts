import { createContext } from 'react';

/** 성공/실패/중립. 기준 3 이 success 와 error 의 computed backgroundColor 가 다름을 잰다. */
export type AdminToastVariant = 'success' | 'error' | 'info';

export interface AdminToastOptions {
  /** 한 줄 요약. 필수. */
  title: string;
  /** 다음 행동 안내 등 보조 문구. */
  description?: string;
  /** ms. 생략 시 variant 기본값(success/info 4000, error 6000). */
  duration?: number;
}

export interface AdminToastApi {
  success: (options: AdminToastOptions) => void;
  error: (options: AdminToastOptions) => void;
  info: (options: AdminToastOptions) => void;
  dismissAll: () => void;
}

export const AdminToastContext = createContext<AdminToastApi | null>(null);
