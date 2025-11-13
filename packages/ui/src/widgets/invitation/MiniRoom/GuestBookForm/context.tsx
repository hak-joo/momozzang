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

export type Step = 'select' | 'message' | 'pin';

const PAGE_SIZE = 12;
const MAX_MESSAGE_LENGTH = 200;
const PIN_LENGTH = 4;

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
  pinCodes: string[];
  setPinDigit: (index: number, value: string) => void;
  reset: () => void;
  canProceedSelect: boolean;
  canProceedMessage: boolean;
  canSubmit: boolean;
  isDirty: boolean;
}

const GuestBookFormContext = createContext<GuestBookFormContextValue | null>(null);

const defaultPin = Array.from({ length: PIN_LENGTH }, () => '');

export function GuestBookFormProvider({ children }: React.PropsWithChildren) {
  const miniMePages = useMemo(() => chunk(MINI_ME_IDS, PAGE_SIZE), []);
  const [step, setStep] = useState<Step>('select');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMiniMeId, setSelectedMiniMeId] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [pinCodes, setPinCodes] = useState<string[]>(defaultPin);

  const reset = useCallback(() => {
    setStep('select');
    setCurrentPage(0);
    setSelectedMiniMeId(null);
    setNickname('');
    setMessage('');
    setPinCodes(defaultPin);
  }, []);

  const selectMiniMe = useCallback((miniMeId: number) => {
    setSelectedMiniMeId(miniMeId);
  }, []);

  const setPinDigit = useCallback((index: number, value: string) => {
    setPinCodes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const canProceedSelect = selectedMiniMeId !== null;
  const canProceedMessage = nickname.trim().length > 0 && message.trim().length > 0;
  const canSubmit = pinCodes.every((digit) => digit.length === 1);

  const isDirty =
    step !== 'select' ||
    currentPage !== 0 ||
    selectedMiniMeId !== null ||
    nickname.length > 0 ||
    message.length > 0 ||
    pinCodes.some((digit) => digit.length > 0);

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
      pinCodes,
      setPinDigit,
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
      pinCodes,
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
export const GUESTBOOK_PIN_LENGTH = PIN_LENGTH;
