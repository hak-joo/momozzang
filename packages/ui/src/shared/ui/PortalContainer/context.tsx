import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Radix `Portal` 이 시트/다이얼로그를 붙일 DOM 노드.
 * `null` 이면 주입하지 않는다 — Radix 기본값(`document.body`)이 그대로 쓰인다.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

interface PortalContainerProviderProps {
  value: HTMLElement | null;
  children: ReactNode;
}

/**
 * 포털 삽입 위치를 **컴포넌트 소유권**으로 결정한다(`ControlVariant` 와 같은 opt-in 패턴).
 *
 * 기본값이 `null`(= 지금 동작)이므로 **provider 를 두지 않는 앱(뷰어)의 렌더 결과는 0 변화**다.
 * 유일한 소비자는 어드민의 `PhonePreview` 로, 폰 프레임의 `.screen` 노드를 내려준다 —
 * 그래야 미리보기 안에서 열리는 모달/바텀시트가 `document.body` 가 아니라 프레임 안에 렌더돼
 * 실기기와 같은 위치에 나타난다(계약 3 F3-b).
 *
 * 값이 **DOM 노드**라는 점이 중요하다. `useRef` 만으로는 첫 렌더에 `null` 이고 `ref.current`
 * 변경이 리렌더를 유발하지 않아 포털이 영원히 `body` 로 간다 — 소비자는 콜백 ref + `useState` 로
 * 노드를 상태에 담아야 한다(계약 3 §6 R1).
 */
export function PortalContainerProvider({ value, children }: PortalContainerProviderProps) {
  return <PortalContainerContext.Provider value={value}>{children}</PortalContainerContext.Provider>;
}

/** 포털 컨테이너 노드. provider 가 없으면 `null`. */
export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}
