import { useRef } from 'react';
import { WeddingInvitation as WeddingInvitationPage } from '@momozzang/ui/src/pages/WeddingInvitation/WeddingInvitation';
import { InvitationProvider } from '@momozzang/ui/src/entities/WeddingInvitation/Context';
import { ToastProvider } from '@momozzang/ui/src/shared/ui/Toast';
import { ControlVariantProvider } from '@momozzang/ui/src/shared/ui/ControlVariant';
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
 */
export function PhonePreview({ invitation }: Props) {
  const screenRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.frame}>
      <div className={styles.notch} aria-hidden="true" />
      <div className={styles.screen} ref={screenRef}>
        <ControlVariantProvider value="invitation">
          <ToastProvider>
            <InvitationProvider data={invitation} previewMode>
              <WeddingInvitationPage metadata={invitation} themeScopeRef={screenRef} />
            </InvitationProvider>
          </ToastProvider>
        </ControlVariantProvider>
      </div>
    </div>
  );
}
