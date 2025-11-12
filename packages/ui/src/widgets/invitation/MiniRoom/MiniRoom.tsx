import { useMemo } from 'react';
import miniRoomBackground from '@shared/assets/images/mini-room.png';
import groomBrideMini from '@shared/assets/images/groom-bride.png';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { MiniMe } from '@shared/ui/MiniMe';
import type { RestrictedZone } from './lib/generateMiniMePositions';
import { DEFAULT_RESTRICTED_ZONES, generateMiniMePositions } from './lib/generateMiniMePositions';
import { MOCK_GUEST_BOOKS } from './constants';
import { GuestBookList } from './GuestBook/GuestBookList';
import styles from './MiniRoom.module.css';
import { fetchGuestBookList } from './api/guestBook';
import { useSuspenseQuery } from '@tanstack/react-query';

interface MainMiniMe {
  src: string;
  width?: number;
  position: {
    x: number;
    y: number;
  };
  alt?: string;
}

interface MiniRoomProps {
  miniMeIds?: number[];
  restrictedZones?: RestrictedZone[];
  mainMiniMe?: MainMiniMe | null;
}

const DEFAULT_SPECIAL_MINI: MainMiniMe = {
  src: groomBrideMini,
  width: 61,
  position: { x: 50, y: 41 },
  alt: '신랑 신부 미니미',
};

export function MiniRoom({ restrictedZones, mainMiniMe = DEFAULT_SPECIAL_MINI }: MiniRoomProps) {
  const { data: guestBooks } = useSuspenseQuery({
    queryKey: ['guestBookList'],
    queryFn: fetchGuestBookList,
  });

  const miniMeIds = useMemo(() => {
    return guestBooks.map((book) => book.miniMeId);
  }, [guestBooks]);

  const seed = useMemo(
    () => miniMeIds.reduce((acc, id) => (acc * 31 + id) % 1_000_000_007, 1),
    [miniMeIds],
  );

  const positions = useMemo(
    () =>
      generateMiniMePositions({
        count: miniMeIds.length,
        seed,
        restrictedZones: restrictedZones ?? DEFAULT_RESTRICTED_ZONES,
      }),
    [miniMeIds, restrictedZones, seed],
  );

  return (
    <div className={styles.wrapper}>
      <PixelBadge text="Mini Room" />

      <div className={styles.stage}>
        <img
          src={miniRoomBackground}
          alt="미니룸 배경"
          className={styles.stageImage}
          draggable={false}
        />

        {MOCK_GUEST_BOOKS.map((book, index) => {
          const position = positions[index];
          if (!position) return null;

          return (
            <MiniMe
              key={`${book.id}-${index}`}
              miniMeId={book.miniMeId}
              className={styles.miniMe}
              size={28}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
              }}
            />
          );
        })}

        {mainMiniMe && (
          <img
            src={mainMiniMe.src}
            alt={mainMiniMe.alt ?? '신랑신부'}
            className={styles.specialMini}
            style={{
              left: `${mainMiniMe.position.x}%`,
              top: `${mainMiniMe.position.y}%`,
              width: mainMiniMe.width ?? 92,
            }}
            draggable={false}
          />
        )}
      </div>

      <GuestBookList />
    </div>
  );
}
