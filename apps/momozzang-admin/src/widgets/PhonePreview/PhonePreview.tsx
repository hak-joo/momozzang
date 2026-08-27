import { memo, useCallback, useRef, useState } from 'react';
import { WeddingInvitation as WeddingInvitationPage } from '@momozzang/ui/src/pages/WeddingInvitation/WeddingInvitation';
import { InvitationProvider } from '@momozzang/ui/src/entities/WeddingInvitation/Context';
import { ToastProvider } from '@momozzang/ui/src/shared/ui/Toast';
import { ControlVariantProvider } from '@momozzang/ui/src/shared/ui/ControlVariant';
import { PortalContainerProvider } from '@momozzang/ui/src/shared/ui/PortalContainer';
import { type WeddingInvitation } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import styles from './PhonePreview.module.css';

interface Props {
  invitation: WeddingInvitation;
}

/**
 * 좌측 폰 프레임 미리보기.
 * - 공유 패키지의 실제 청첩장 페이지/위젯을 그대로 렌더한다(가짜 렌더 아님).
 * - 테마 CSS 변수는 `document.body`가 아닌 이 프레임의 스크린 컨테이너(themeScope)에 주입한다.
 * - `transform`으로 새 containing block을 만들어 청첩장 내부의 `position: fixed`(Header 등)와
 *   `100vh` 기반 스크롤이 프레임 밖으로 새지 않도록 격리한다.
 * - 어드민 페이지 루트가 폼 컨트롤을 `admin` 언어로 세우므로, 이 프레임 안은 다시 `invitation`
 *   으로 **되돌린다**. Context 는 포털(방명록 시트 등)도 통과하므로 이 한 줄이 미리보기 충실도를
 *   지키는 불변식이다(계약 기준 31 이 자동 판정한다).
 * - 모달/바텀시트의 Radix 포털도 `.screen` 으로 돌린다(F3-b). 그래야 미리보기 안에서 연 시트가
 *   `document.body` 로 새어 나가 어드민 화면 전체를 덮지 않고 실기기처럼 프레임 안에 나타난다.
 * - **`memo` 경계**(F9): 어드민 페이지의 로컬 상태 변경(탭 토글·토스트·확인 다이얼로그 등)이
 *   뷰어 트리 전체를 재렌더시키지 않게 끊는다. prop 은 `invitation` 하나뿐이고 그 값은
 *   `useApplyForm` 이 `useMemo` 로 안정화하므로 얕은 비교가 성립한다. 경계 안쪽은 React
 *   Compiler 가 메모화한다(`vite.config.ts` 의 `shouldUseCompiler`).
 */
export const PhonePreview = memo(function PhonePreview({ invitation }: Props) {
  const screenRef = useRef<HTMLDivElement>(null);
  // 포털 `container` 는 **DOM 노드**를 요구한다. `useRef` 만 쓰면 첫 렌더에 `null` 이고
  // `ref.current` 변경은 리렌더를 유발하지 않아 포털이 영원히 `body` 로 간다(계약 3 §6 R1).
  // 그래서 콜백 ref 로 노드를 상태에 담고, 같은 콜백에서 테마 스코프용 `screenRef` 도 채운다.
  const [screenNode, setScreenNode] = useState<HTMLDivElement | null>(null);
  const attachScreen = useCallback((node: HTMLDivElement | null) => {
    screenRef.current = node;
    setScreenNode(node);
  }, []);

  return (
    <div className={styles.frame}>
      <div className={styles.notch} aria-hidden="true" />
      <div className={styles.screen} ref={attachScreen}>
        <PortalContainerProvider value={screenNode}>
          <ControlVariantProvider value="invitation">
            <ToastProvider>
              <InvitationProvider data={invitation} previewMode>
                <WeddingInvitationPage metadata={invitation} themeScopeRef={screenRef} />
              </InvitationProvider>
            </ToastProvider>
          </ControlVariantProvider>
        </PortalContainerProvider>
      </div>
    </div>
  );
});
