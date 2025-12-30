import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { MINI_ME_IDS } from '@shared/lib/miniMe';

export type Step = 'select' | 'message';

const PAGE_SIZE = 20;
const MAX_MESSAGE_LENGTH = 100;
const PASSWORD_LENGTH = 4;

const chunk = <T,>(items: readonly T[], size: number) => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

interface GuestBookFormContextValue {
  step: Step;
  setStep: Dispatch<SetStateAction<Step>>;
  miniMePages: number[][];
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  selectedMiniMeId: number | null;
  selectMiniMe: (miniMeId: number) => void;
  nickname: string;
  setNickname: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  reset: () => void;
  canProceedSelect: boolean;
  canProceedMessage: boolean;
  canSubmit: boolean;
  isDirty: boolean;
}

const GuestBookFormContext = createContext<GuestBookFormContextValue | null>(null);

export function GuestBookFormProvider({ children }: React.PropsWithChildren) {
  const miniMePages = useMemo(() => chunk(MINI_ME_IDS, PAGE_SIZE), []);
  const [step, setStep] = useState<Step>('select');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMiniMeId, setSelectedMiniMeId] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');

  const reset = useCallback(() => {
    setStep('select');
    setCurrentPage(0);
    setSelectedMiniMeId(null);
    setNickname('');
    setMessage('');
    setPassword('');
  }, []);

  const selectMiniMe = useCallback((miniMeId: number) => {
    setSelectedMiniMeId(miniMeId);
  }, []);

  const canProceedSelect = selectedMiniMeId !== null;
  const canProceedMessage = nickname.trim().length > 0 && message.trim().length > 0;
  const canSubmit = canProceedMessage && password.length === PASSWORD_LENGTH;

  const isDirty =
    step !== 'select' ||
    currentPage !== 0 ||
    selectedMiniMeId !== null ||
    nickname.length > 0 ||
    message.length > 0 ||
    password.length > 0;

  const value = useMemo<GuestBookFormContextValue>(
    () => ({
      step,
      setStep,
      miniMePages,
      currentPage,
      setCurrentPage,
      selectedMiniMeId,
      selectMiniMe,
      nickname,
      setNickname,
      message,
      setMessage,
      password,
      setPassword,
      reset,
      canProceedSelect,
      canProceedMessage,
      canSubmit,
      isDirty,
    }),
    [
      step,
      miniMePages,
      currentPage,
      selectedMiniMeId,
      nickname,
      message,
      password,
      selectMiniMe,
      reset,
      canProceedSelect,
      canProceedMessage,
      canSubmit,
      isDirty,
    ],
  );

  return <GuestBookFormContext.Provider value={value}>{children}</GuestBookFormContext.Provider>;
}

export function useGuestBookFormContext() {
  const ctx = useContext(GuestBookFormContext);
  if (!ctx) throw new Error('useGuestBookFormContext must be used within GuestBookFormProvider');
  return ctx;
}

export const GUESTBOOK_MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH;
export const GUESTBOOK_PASSWORD_LENGTH = PASSWORD_LENGTH;
