import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * 폼 컨트롤(Input/Textarea/Select)이 어느 시각 언어를 입을지 결정하는 값.
 * - `invitation`: 뷰어(청첩장) 언어 — 둥근 sub-100 면 + main-600 글자. **기본값**.
 * - `admin`: 어드민 크롬 언어 — 흰 면 + 중립 회색 1px 보더 + radius 8 + 14px.
 */
export type ControlVariant = 'invitation' | 'admin';

/**
 * 기본값이 `invitation` 이므로 **provider 를 두지 않는 앱(뷰어)의 동작은 0 변화**다(opt-in).
 * 스타일 소속을 DOM 조상이 아니라 **컴포넌트 소유권**으로 결정한다 —
 * 그래서 포털로 빠져나간 서브트리도 소유자를 따라가고, 되돌릴 때도 provider 한 줄이면 된다
 * (예: 어드민 안의 폰 미리보기는 다시 `invitation` 으로 되돌린다).
 */
const ControlVariantContext = createContext<ControlVariant>('invitation');

interface ControlVariantProviderProps {
  value: ControlVariant;
  children: ReactNode;
}

export function ControlVariantProvider({ value, children }: ControlVariantProviderProps) {
  return <ControlVariantContext.Provider value={value}>{children}</ControlVariantContext.Provider>;
}

export function useControlVariant(): ControlVariant {
  return useContext(ControlVariantContext);
}
