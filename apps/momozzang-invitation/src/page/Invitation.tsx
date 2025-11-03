import { lazy, Suspense, useEffect, useState } from 'react';
import styles from './style.module.css';
import { IntroOverlay } from '@momozzang/ui/widgets/invitation/IntroOverlay';
import { Intro } from '@momozzang/ui/widgets/invitation/Intro';
import { exampleWeddingInvitation } from '@momozzang/ui/entities/WeddingInvitation/data';
import clsx from 'clsx';

const WeddingInvitation = lazy(async () => {
  const module = await import('@momozzang/ui/pages/WeddingInvitation');
  return { default: module.WeddingInvitation };
});
function usePreloadWeddingChunk() {
  useEffect(() => {
    void import('@momozzang/ui/pages/WeddingInvitation');
  }, []);
}

function InvitationPage() {
  const [showIntro, setShowIntro] = useState(false);

  usePreloadWeddingChunk();

  return (
    <>
      {/* Intro UI */}
      {showIntro && <Intro next={() => setShowIntro(false)} label="Wedding day" />}
      {showIntro && <IntroOverlay />}

      <div
        aria-hidden={showIntro ? 'true' : 'false'}
        inert={showIntro ? true : undefined}
        className={clsx(styles.pageRoot, showIntro ? styles.appHidden : styles.appVisible)}
      >
        <Suspense fallback={null}>
          <WeddingInvitation metadata={exampleWeddingInvitation} />
        </Suspense>
      </div>
    </>
  );
}

export default InvitationPage;
