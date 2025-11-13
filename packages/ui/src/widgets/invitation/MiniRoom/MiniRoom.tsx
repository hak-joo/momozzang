import { useMemo } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import groomBrideMini from '@shared/assets/images/groom-bride.png';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { GuestBookList } from './GuestBookList';
import { GuestBookForm } from './GuestBookForm';
import { MiniRoomScene, type MainMiniMe } from './MiniRoomScene';
import styles from './MiniRoom.module.css';
import type { RestrictedZone } from './lib/generateMiniMePositions';
import { fetchGuestBookList } from './api/guestBook';
import { prepareMiniRoomEntries } from './lib/prepareMiniRoomEntries';
import { DEFAULT_RESTRICTED_ZONES } from './lib/generateMiniMePositions';

interface MiniRoomProps {
  restrictedZones?: RestrictedZone[];
  mainMiniMe?: MainMiniMe | null;
}

const DEFAULT_SPECIAL_MINI: MainMiniMe = {
  src: groomBrideMini,
  width: 72,
  position: { x: 50, y: 48 },
  alt: '신랑 신부',
};

export function MiniRoom({
  restrictedZones = DEFAULT_RESTRICTED_ZONES,
  mainMiniMe = DEFAULT_SPECIAL_MINI,
}: MiniRoomProps) {
  const { data: guestBookEntries = [] } = useSuspenseQuery({
    queryKey: ['guestBookList'],
    queryFn: fetchGuestBookList,
  });

  const sceneEntries = useMemo(() => prepareMiniRoomEntries(guestBookEntries), [guestBookEntries]);

  return (
    <div className={styles.wrapper}>
      <PixelBadge text="Mini Room" />

      <MiniRoomScene
        entries={sceneEntries}
        restrictedZones={restrictedZones}
        mainMiniMe={mainMiniMe}
      />

      <GuestBookList entries={guestBookEntries} />
      <GuestBookForm />
    </div>
  );
}
