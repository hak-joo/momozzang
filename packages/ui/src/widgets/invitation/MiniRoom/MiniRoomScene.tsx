import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import miniRoomBackground from '@shared/assets/images/mini-room.png';
import speechBubbleImg from '@shared/assets/images/speech-bubble.png';
import { MiniMe } from '@shared/ui/MiniMe';
import { DEFAULT_RESTRICTED_ZONES, generateMiniMePositions } from './lib/generateMiniMePositions';
import { DEFAULT_MINI_MESSAGES } from './constants';
import styles from './MiniRoom.module.css';
import type { GuestBook } from './types';
import type { RestrictedZone } from './lib/generateMiniMePositions';

export interface MainMiniMe {
  src: string;
  width?: number;
  position: {
    x: number;
    y: number;
  };
  alt?: string;
}

interface MiniRoomSceneProps {
  entries: GuestBook[];
  mainMiniMe?: MainMiniMe | null;
  restrictedZones?: RestrictedZone[];
}

export function MiniRoomScene({
  entries,
  restrictedZones = DEFAULT_RESTRICTED_ZONES,
  mainMiniMe,
}: MiniRoomSceneProps) {
  const seed = useMemo(
    () =>
      entries.reduce(
        (acc, mini) => (acc * 37 + mini.miniMeId) % 1_000_000_007,
        entries.length || 1,
      ),
    [entries],
  );

  const positions = useMemo(
    () =>
      generateMiniMePositions({
        count: entries.length,
        seed,
        restrictedZones,
      }),
    [entries.length, seed, restrictedZones],
  );

  const entriesWithPosition = entries.map((entry, index) => ({
    ...entry,
    position: positions[index],
  }));

  const [activeMiniId, setActiveMiniId] = useState<number | null>(null);
  const [previewBubble, setPreviewBubble] = useState<{ miniId: number; message: string } | null>(
    null,
  );
  const [activeOverride, setActiveOverride] = useState<string | null>(null);

  useEffect(() => {
    if (activeMiniId !== null && !entries.find((entry) => entry.id === activeMiniId)) {
      setActiveMiniId(null);
      setActiveOverride(null);
    }
    if (previewBubble && !entries.find((entry) => entry.id === previewBubble.miniId)) {
      setPreviewBubble(null);
    }
  }, [entries, activeMiniId, previewBubble]);

  const previewTimerRef = useRef<number | null>(null);
  const previewHideRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      if (previewHideRef.current) {
        window.clearTimeout(previewHideRef.current);
        previewHideRef.current = null;
      }
    };

    if (!entriesWithPosition.length) {
      clearTimers();
      return;
    }

    const randomEntry = () => {
      const candidates = entriesWithPosition.filter((mini) => mini.position);
      if (!candidates.length) return null;
      return candidates[Math.floor(Math.random() * candidates.length)];
    };

    const randomDefaultMessage = () =>
      DEFAULT_MINI_MESSAGES[Math.floor(Math.random() * DEFAULT_MINI_MESSAGES.length)].content;

    const scheduleNextPreview = () => {
      previewTimerRef.current = window.setTimeout(
        () => {
          if (activeMiniId) {
            scheduleNextPreview();
            return;
          }
          const entry = randomEntry();
          if (!entry) return;
          const message = entry.from ? entry.content : (entry.content ?? randomDefaultMessage());
          setPreviewBubble({ miniId: entry.id, message });
          previewHideRef.current = window.setTimeout(() => {
            setPreviewBubble(null);
            scheduleNextPreview();
          }, 3000);
        },
        1500 + Math.random() * 2000,
      );
    };

    scheduleNextPreview();

    return () => {
      clearTimers();
    };
  }, [entriesWithPosition, activeMiniId]);

  const activeEntry =
    activeMiniId != null ? entriesWithPosition.find((entry) => entry.id === activeMiniId) : null;

  const previewEntry =
    previewBubble != null
      ? entriesWithPosition.find((entry) => entry.id === previewBubble.miniId)
      : null;

  const handleSelectEntry = (entryId: number, messageOverride?: string) => {
    setPreviewBubble(null);
    setActiveOverride(messageOverride ?? null);
    setActiveMiniId(entryId);
  };

  const closeBubble = () => setActiveMiniId(null);

  useEffect(() => {
    if (activeMiniId === null) {
      setActiveOverride(null);
    }
  }, [activeMiniId]);

  return (
    <div className={styles.stage} data-dimmed={activeEntry ? 'true' : 'false'}>
      <img
        src={miniRoomBackground}
        alt="미니룸 배경"
        className={styles.stageImage}
        draggable={false}
      />

      {activeEntry && activeEntry.position && (
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
              activeEntry.position.x > 55 ? styles.speechBubbleRight : styles.speechBubbleLeft,
            )}
            style={{
              left: `${activeEntry.position.x}%`,
              top: `${activeEntry.position.y - 10}%`,
              backgroundImage: `url(${speechBubbleImg})`,
            }}
          >
            <div className={styles.speechBody}>
              <p className={styles.speechContent}>{activeOverride ?? activeEntry.content}</p>
              {activeEntry.from && (
                <span className={styles.speechFrom}>from. {activeEntry.from}</span>
              )}
            </div>
          </div>
        </>
      )}

      {previewBubble && previewEntry?.position && (
        <button
          type="button"
          className={clsx(
            styles.previewBubble,
            previewEntry.position.x > 55 ? styles.previewBubbleRight : styles.previewBubbleLeft,
          )}
          style={{
            left: `${previewEntry.position.x}%`,
            top: `${previewEntry.position.y - 10}%`,
            backgroundImage: `url(${speechBubbleImg})`,
          }}
          onClick={() => handleSelectEntry(previewEntry.id, previewBubble.message)}
          aria-label="축하 메시지 전체 보기"
        >
          <span className={styles.previewContent}>{previewBubble.message}</span>
        </button>
      )}

      {entriesWithPosition.map((entry, index) => {
        const position = entry.position;
        if (!position) return null;
        const isActive = activeEntry?.id === entry.id;

        return (
          <MiniMe
            key={`${entry.id}-${index}`}
            miniMeId={entry.miniMeId}
            className={clsx(styles.miniMe, isActive && styles.miniMeActive)}
            size={28}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            interactive
            aria-label={entry.from ? `${entry.from}의 미니미` : '축하 미니미'}
            onClick={(event) => {
              event.stopPropagation();
              handleSelectEntry(entry.id);
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
  );
}
