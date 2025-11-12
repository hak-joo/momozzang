import { clsx } from 'clsx';
import { useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import miniRoomBackground from '@shared/assets/images/mini-room.png';
import groomBrideMini from '@shared/assets/images/groom-bride.png';
import speechBubbleImg from '@shared/assets/images/speech-bubble.png';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { MiniMe } from '@shared/ui/MiniMe';
import type { RestrictedZone } from './lib/generateMiniMePositions';
import { DEFAULT_RESTRICTED_ZONES, generateMiniMePositions } from './lib/generateMiniMePositions';
import { GuestBookList } from './GuestBookList';

import { MOCK_GUEST_BOOK_ENTRIES } from './constants';
import { fetchGuestBookList } from './api/guestBook';
import styles from './MiniRoom.module.css';
import type { GuestBook } from './types';
import { GuestBookForm } from './GuestBookForm';

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
  guests?: GuestBook[];
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
  guests,
  restrictedZones,
  mainMiniMe = DEFAULT_SPECIAL_MINI,
}: MiniRoomProps) {
  const { data: fetchedGuestBooks = MOCK_GUEST_BOOK_ENTRIES } = useSuspenseQuery({
    queryKey: ['guestBookList'],
    queryFn: fetchGuestBookList,
  });

  const guestBookEntries = guests ?? fetchedGuestBooks ?? MOCK_GUEST_BOOK_ENTRIES;
  const [activeGuestId, setActiveGuestId] = useState<number | null>(null);

  const miniMeIds = useMemo(
    () => guestBookEntries.map((entry) => entry.miniMeId),
    [guestBookEntries],
  );

  const seed = useMemo(
    () => miniMeIds.reduce((acc, id) => (acc * 31 + id) % 1_000_000_007, 1),
    [miniMeIds],
  );

  const positions = useMemo(
    () =>
      generateMiniMePositions({
        count: guestBookEntries.length,
        seed,
        restrictedZones: restrictedZones ?? DEFAULT_RESTRICTED_ZONES,
      }),
    [guestBookEntries.length, restrictedZones, seed],
  );

  const activeIndex =
    activeGuestId != null ? guestBookEntries.findIndex((guest) => guest.id === activeGuestId) : -1;
  const activeGuest = activeIndex >= 0 ? guestBookEntries[activeIndex] : null;
  const activePosition = activeIndex >= 0 ? positions[activeIndex] : null;

  const toggleActiveGuest = (guestId: number) =>
    setActiveGuestId((current) => (current === guestId ? null : guestId));

  const closeBubble = () => setActiveGuestId(null);

  return (
    <div className={styles.wrapper}>
      <PixelBadge text="Mini Room" />

      <div className={styles.stage} data-dimmed={activeGuest ? 'true' : 'false'}>
        <img
          src={miniRoomBackground}
          alt="미니룸 배경"
          className={styles.stageImage}
          draggable={false}
        />

        {activeGuest && activePosition && (
          <>
            <button
              type="button"
              className={styles.stageDim}
              aria-label="말풍선 닫기"
              onClick={closeBubble}
            />

            <div
              className={clsx(
                styles.speechBubble,
                activePosition.x > 55 ? styles.speechBubbleRight : styles.speechBubbleLeft,
              )}
              style={{
                left: `${activePosition.x}%`,
                top: `${activePosition.y - 10}%`,
                backgroundImage: `url(${speechBubbleImg})`,
              }}
            >
              <div className={styles.speechBody}>
                <p className={styles.speechContent}>{activeGuest.content}</p>
                <span className={styles.speechFrom}>from. {activeGuest.from}</span>
              </div>
            </div>
          </>
        )}

        {guestBookEntries.map((guest, index) => {
          const position = positions[index];
          if (!position) return null;
          const isActive = guest.id === activeGuestId;

          return (
            <MiniMe
              key={`${guest.id}-${guest.miniMeId}-${index}`}
              miniMeId={guest.miniMeId}
              className={clsx(styles.miniMe, isActive && styles.miniMeActive)}
              size={28}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
              }}
              interactive
              aria-label={`${guest.from}의 미니미`}
              onClick={(event) => {
                event.stopPropagation();
                toggleActiveGuest(guest.id);
              }}
            />
          );
        })}

        {mainMiniMe && (
          <img
            src={mainMiniMe.src}
            alt={mainMiniMe.alt ?? '신랑 신부'}
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

      <GuestBookList entries={guestBookEntries} />

      <GuestBookForm />
    </div>
  );
}
