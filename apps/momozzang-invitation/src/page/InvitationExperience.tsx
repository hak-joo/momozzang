import { lazy, Suspense, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Intro } from '@momozzang/ui/widgets/invitation/Intro';
import type { WeddingInvitation } from '@momozzang/ui/entities/WeddingInvitation/model';
import styles from './style.module.css';
import { InvitationProvider } from '@momozzang/ui/entities/WeddingInvitation/Context';

const WeddingInvitation = lazy(async () => {
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
          <WeddingInvitation metadata={metadata} />
        </Suspense>
      </div>
    </InvitationProvider>
  );
}
