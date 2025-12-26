import React, { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'react';
import styles from './SwipeStack.module.css';
import { computeTransform, opacityFor } from './utils';
import { COMMIT_DEADZONE } from './constants';
import type { GalleryImage } from '../types';
import clsx from 'clsx';
import speechBubble from '@shared/assets/images/gallery-speech-bubble.png';
import purpleCat from '@shared/assets/images/purple-cat.png';
import { useScrollLock } from './useScrollLock';

export type SwipeStackProps = {
  images: GalleryImage[];
  initialIndex?: number;
  sensitivity?: number; // 컨테이너 폭 대비 드래그 민감도(1 = 폭만큼 드래그 시 1 인덱스)
  aspectRatio?: number; // w/h
  renderRange?: number;
};

export function SwipeStack({
  images,
  initialIndex = 0,
  sensitivity = 1,
  aspectRatio = 4 / 4,
  renderRange = 3,
}: SwipeStackProps) {
  const imageCount = images.length;
  const rootElRef = useRef<HTMLDivElement | null>(null);

  const normalizeIndex = useCallback(
    (idx: number) => {
      if (imageCount === 0) return 0;
      const mod = idx % imageCount;
      return mod < 0 ? mod + imageCount : mod;
    },
    [imageCount],
  );

  // 핵심 상태: 연속 인덱스(드래그 중 실시간 반영). 무한 루프를 위해 클램프하지 않음.
  const [activeIndex, setActiveIndex] = useState<number>(normalizeIndex(initialIndex));

  // UI 제어용 최소 상태만 유지
  const [isSnapping, setIsSnapping] = useState(false);
  const snapTimerRef = useRef<number>(null);
  const isObservedRef = useRef(false);
  const [isObserved, setIsObserved] = useState(false);
  const [autoClock, setAutoClock] = useState(0);
  const touchActionRestoreRef = useRef<string | null>(null);
  const { lockScroll, unlockScroll } = useScrollLock(() =>
    typeof document !== 'undefined' ? document.getElementById('main-wrapper') : null,
  );

  // 제스처 컨텍스트(렌더 유발 방지용 ref)
  const isDraggingRef = useRef(false);
  const widthPxRef = useRef(1);
  const startPointerXRef = useRef(0);
  const startActiveIndexRef = useRef(activeIndex);
  const driftFromStartRef = useRef(0); // 시작점 대비 이동량(연속 인덱스)
  const armedDirectionRef = useRef<-1 | 0 | 1>(0); // +1: 다음(왼쪽 스와이프), -1: 이전

  // 방향 추정을 위해 직전 activeIndex 보관
  const lastActiveIndexRef = useRef(activeIndex);
  const [swipeDirection, setSwipeDirection] = useState<-1 | 0 | 1>(0);

  // 컨테이너 width 추적
  useLayoutEffect(() => {
    const el = rootElRef.current;
    if (!el) return;
    const ro = new ResizeObserver((ents) => {
      for (const e of ents) widthPxRef.current = Math.max(1, e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 방향 추정(미분)
  useLayoutEffect(() => {
    const prev = lastActiveIndexRef.current;
    const delta = activeIndex - prev;
    lastActiveIndexRef.current = activeIndex;
    if (Math.abs(delta) < 1e-4) {
      setSwipeDirection(0);
    } else {
      setSwipeDirection(delta > 0 ? -1 : +1);
    }
  }, [activeIndex]);

  const resetAutoClock = useCallback(() => {
    setAutoClock((c) => c + 1);
  }, []);

  const beginSnap = useCallback(
    (target: number | ((prev: number) => number), opts?: { resetAutoClock?: boolean }) => {
      setIsSnapping(true);
      setActiveIndex((prev) => (typeof target === 'function' ? target(prev) : target));

      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = window.setTimeout(() => setIsSnapping(false), 320);

      if (opts?.resetAutoClock) resetAutoClock();
    },
    [resetAutoClock],
  );

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = rootElRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = entry.isIntersecting;
        isObservedRef.current = visible;
        setIsObserved(visible);
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      isDraggingRef.current = true;
      setIsSnapping(false);

      startPointerXRef.current = e.clientX;
      startActiveIndexRef.current = activeIndex;

      driftFromStartRef.current = 0;
      armedDirectionRef.current = 0;

      // 드래그 중 스크롤 방지
      if (rootElRef.current) {
        touchActionRestoreRef.current = rootElRef.current.style.touchAction || null;
        rootElRef.current.style.touchAction = 'none';
      }
      lockScroll();
    },
    [activeIndex, lockScroll],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startPointerXRef.current;
      const widthPx = widthPxRef.current;

      const deltaIndex = -(dx / widthPx) * sensitivity;
      const nextActive = startActiveIndexRef.current + deltaIndex;
      setActiveIndex(nextActive);

      const drift = nextActive - startActiveIndexRef.current;
      driftFromStartRef.current = drift;
      const absDrift = Math.abs(drift);

      if (absDrift >= COMMIT_DEADZONE) {
        armedDirectionRef.current = drift > 0 ? +1 : -1;
      } else {
        armedDirectionRef.current = 0;
      }
    },
    [sensitivity],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const startInt = Math.round(startActiveIndexRef.current);
      let targetInt = Math.round(activeIndex);

      if (armedDirectionRef.current !== 0 && targetInt === startInt) {
        targetInt = startInt + (armedDirectionRef.current > 0 ? +1 : -1);
      }

      beginSnap(targetInt, { resetAutoClock: true });

      driftFromStartRef.current = 0;
      armedDirectionRef.current = 0;

      if (rootElRef.current) {
        rootElRef.current.style.touchAction =
          touchActionRestoreRef.current !== null ? touchActionRestoreRef.current : 'pan-y';
      }
      unlockScroll();
    },
    [activeIndex, beginSnap, unlockScroll],
  );

  useEffect(() => {
    if (imageCount <= 1 || !isObserved) return;
    const id = window.setInterval(() => {
      if (isDraggingRef.current) return;
      beginSnap((prev) => prev + 1);
    }, 100000);
    return () => window.clearInterval(id);
  }, [beginSnap, imageCount, isObserved, autoClock]);

  if (imageCount === 0) {
    return null;
  }

  const startRender = Math.floor(activeIndex) - renderRange;
  const endRender = Math.floor(activeIndex) + renderRange;

  const ratioStyle: React.CSSProperties = { ['--ratio' as any]: String(aspectRatio) };

  return (
    <>
      <div
        ref={rootElRef}
        className={`${styles.root} ${isSnapping ? styles.snapping : ''}`}
        style={ratioStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label="Swipe stack"
      >
        {Array.from({ length: endRender - startRender + 1 }, (_, idx) => {
          const virtualIndex = startRender + idx;
          const imageIndex = normalizeIndex(virtualIndex);
          const image = images[imageIndex];
          const deltaToActive = virtualIndex - activeIndex;
          const transform = computeTransform(deltaToActive, swipeDirection, widthPxRef.current);
          const opacity = opacityFor(deltaToActive, swipeDirection);
          const zIndex = 1000 - Math.abs(deltaToActive) * 10;
          const loopRound = Math.floor(virtualIndex / imageCount);

          return (
            <figure
              key={`${imageIndex}-${loopRound}`}
              className={clsx(styles.card, {
                [styles.top]: Math.abs(deltaToActive) < 0.5,
              })}
              style={{ transform, opacity, zIndex: Math.round(zIndex) }}
              aria-hidden={Math.abs(deltaToActive) > 1.6 ? true : undefined}
            >
              <img
                className={styles.media}
                src={image.url}
                alt={image.alt ?? ''}
                draggable={false}
              />
              <p
                className={styles.count}
              >{`${normalizeIndex(Math.round(activeIndex)) + 1}/${imageCount}`}</p>
            </figure>
          );
        })}
      </div>
      <div className={styles.speechBubble}>
        <img src={speechBubble} alt="" aria-hidden="true" />

        <p className={styles.speechText}>
          {normalizeIndex(Math.round(activeIndex)) === imageCount - 1
            ? '마지막 사진이에요! (@ *3*@)'
            : `사진을 옆으로 넘겨보세요! >>>>>>`}
        </p>
      </div>
      <div className={styles.purpleCat}>
        <img src={purpleCat} alt="" aria-hidden="true" />
      </div>
    </>
  );
}
