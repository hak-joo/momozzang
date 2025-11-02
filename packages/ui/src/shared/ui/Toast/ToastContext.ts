import { createContext } from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastApi {
  info: (options: ToastOptions) => void;
  success: (options: ToastOptions) => void;
  error: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
