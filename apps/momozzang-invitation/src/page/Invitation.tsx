import { lazy, Suspense, useEffect, useState } from 'react';
import IntroOverlay from '@momozzang/ui/widgets/invitation/IntroOverlay';
import Intro from '@momozzang/ui/widgets/invitation/Intro';
import { exampleWeddingInvitation } from '@momozzang/ui/entities/WeddingInvitation/data';

const WeddingInvitation = lazy(() => import('@momozzang/ui/pages/WeddingInvitation'));
function usePreloadWeddingChunk() {
  useEffect(() => {
    import('@momozzang/ui/pages/WeddingInvitation');
  }, []);
}

export default function InvitationPage() {
  const [showIntro, setShowIntro] = useState(true);

  usePreloadWeddingChunk();

  return (
    <>
      {/* Intro UI */}
      {showIntro && <Intro next={() => setShowIntro(false)} label="Wedding day" />}
      {showIntro && <IntroOverlay />}

      <div
        aria-hidden={showIntro ? 'true' : 'false'}
        inert={showIntro ? true : undefined}
        style={{
          position: showIntro ? ('fixed' as const) : 'static',
          inset: showIntro ? 0 : undefined,
          opacity: showIntro ? 0 : 1,
          pointerEvents: showIntro ? 'none' : 'auto',
        }}
      >
        <Suspense fallback={null}>
          <WeddingInvitation metadata={exampleWeddingInvitation} />
        </Suspense>
      </div>
    </>
  );
}
