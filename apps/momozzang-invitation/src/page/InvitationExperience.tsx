import { lazy, Suspense, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Intro } from '@momozzang/ui/widgets/invitation/Intro';
import type { WeddingInvitation } from '@momozzang/ui/entities/WeddingInvitation/model';
import styles from './style.module.css';
import { InvitationProvider } from '@momozzang/ui/entities/WeddingInvitation/Context';

// 같은 파일 4행의 `WeddingInvitation` 타입 import 와 이름이 겹쳐 no-redeclare /
// no-import-assign 이 발생했다. lazy 컴포넌트 상수만 개명한다(렌더 결과 무변경).
const WeddingInvitationPage = lazy(async () => {
  const module = await import('@momozzang/ui/pages/WeddingInvitation');
  return { default: module.WeddingInvitation };
});

function usePreloadWeddingChunk() {
  useEffect(() => {
    void import('@momozzang/ui/pages/WeddingInvitation');
  }, []);
}

interface InvitationExperienceProps {
  metadata: WeddingInvitation;
  introLabel?: string;
}

export function InvitationExperience({
  metadata,
  introLabel = 'Wedding day',
}: InvitationExperienceProps) {
  const [showIntro, setShowIntro] = useState(true);

  usePreloadWeddingChunk();

  return (
    <InvitationProvider data={metadata}>
      {showIntro && <Intro next={() => setShowIntro(false)} label={introLabel} />}

      <div
        aria-hidden={showIntro ? 'true' : 'false'}
        inert={showIntro ? true : undefined}
        className={clsx(styles.pageRoot, showIntro ? styles.appHidden : styles.appVisible)}
      >
        <Suspense fallback={null}>
          <WeddingInvitationPage metadata={metadata} />
        </Suspense>
      </div>
    </InvitationProvider>
  );
}
