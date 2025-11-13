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
import { MINI_ROOM_METADATA } from './metadata';
import { useInvitation } from '@entities/WeddingInvitation/Context';

interface MiniRoomProps {
  restrictedZones?: RestrictedZone[];
  mainMiniMe?: MainMiniMe | null;
  roomId?: string;
}

const DEFAULT_SPECIAL_MINI: MainMiniMe = {
  src: groomBrideMini,
  width: 72,
  position: { x: 50, y: 48 },
  alt: '신랑 신부',
};

export function MiniRoom({ restrictedZones, mainMiniMe = DEFAULT_SPECIAL_MINI }: MiniRoomProps) {
  const { customization } = useInvitation();

  const roomTemplateId = customization?.miniRoom?.roomTemplateId ?? 'classic-garden';

  const { data: guestBookEntries = [] } = useSuspenseQuery({
    queryKey: ['guestBookList'],
    queryFn: fetchGuestBookList,
  });

  const metadata =
    MINI_ROOM_METADATA.find((meta) => meta.id === roomTemplateId) ?? MINI_ROOM_METADATA[0];
  const sceneEntries = useMemo(
    () => prepareMiniRoomEntries(guestBookEntries, metadata),
    [guestBookEntries, metadata],
  );

  return (
    <div className={styles.wrapper}>
      <PixelBadge text="Mini Room" />

      <MiniRoomScene
        entries={sceneEntries}
        restrictedZones={restrictedZones ?? metadata.restrictedZones}
        mainMiniMe={mainMiniMe}
      />

      <GuestBookList entries={guestBookEntries} />
      <GuestBookForm />
    </div>
  );
}
