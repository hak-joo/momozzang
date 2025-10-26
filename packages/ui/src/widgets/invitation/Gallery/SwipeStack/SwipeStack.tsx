import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import styles from './SwipeStack.module.css';
import { computeTransform, opacityFor, clamp } from './utils';
import { COMMIT_DEADZONE } from './constants';
import type { GalleryImage } from '../Gallery';

export type SwipeStackProps = {
  images: GalleryImage[];
  initialIndex?: number;
  sensitivity?: number; // 컨테이너 폭 대비 드래그 민감도(1 = 폭만큼 드래그 시 1 인덱스)
  aspectRatio?: number; // w/h
  renderRange?: number;
};

function SwipeStack({
  images,
  initialIndex = 0,
  sensitivity = 1,
  aspectRatio = 4 / 4,
  renderRange = 3,
}: SwipeStackProps) {
  const imageCount = images.length;
  const rootElRef = useRef<HTMLDivElement | null>(null);

  // 핵심 상태: 연속 인덱스(드래그 중 실시간 반영)
  const [activeIndex, setActiveIndex] = useState<number>(
    clamp(initialIndex, 0, Math.max(0, imageCount - 1)),
  );

  // UI 제어용 최소 상태만 유지
  const [isSnapping, setIsSnapping] = useState(false);

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
      // 왼쪽 스와이프(다음)일 때 activeIndex 증가 → dir = -1 (시각적 방향 기준)
      setSwipeDirection(delta > 0 ? -1 : +1);
    }
  }, [activeIndex]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      isDraggingRef.current = true;
      setIsSnapping(false);

      startPointerXRef.current = e.clientX;
      startActiveIndexRef.current = activeIndex;

      driftFromStartRef.current = 0;
      armedDirectionRef.current = 0;
    },
    [activeIndex],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startPointerXRef.current;
      const widthPx = widthPxRef.current;

      // 왼쪽 드래그(dx<0) → activeIndex 증가(다음), 오른쪽 드래그(dx>0) → 감소(이전)
      const deltaIndex = -(dx / widthPx) * sensitivity;
      const nextActive = clamp(
        startActiveIndexRef.current + deltaIndex,
        0,
        Math.max(0, imageCount - 1),
      );
      setActiveIndex(nextActive);

      // 이동량 기록 및 커밋-암 판정
      const drift = nextActive - startActiveIndexRef.current;
      driftFromStartRef.current = drift;
      const absDrift = Math.abs(drift);

      if (absDrift >= COMMIT_DEADZONE) {
        armedDirectionRef.current = drift > 0 ? +1 : -1; // +1: 다음(왼쪽 스와이프), -1: 이전
      } else {
        armedDirectionRef.current = 0;
      }
    },
    [imageCount, sensitivity],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const startInt = clamp(
        Math.round(startActiveIndexRef.current),
        0,
        Math.max(0, imageCount - 1),
      );
      let targetInt = clamp(Math.round(activeIndex), 0, Math.max(0, imageCount - 1));

      if (armedDirectionRef.current !== 0 && targetInt === startInt) {
        targetInt = clamp(
          startInt + (armedDirectionRef.current > 0 ? +1 : -1),
          0,
          Math.max(0, imageCount - 1),
        );
      }

      setIsSnapping(true);
      setActiveIndex(targetInt);

      window.clearTimeout((onPointerUp as any)._t);
      (onPointerUp as any)._t = window.setTimeout(() => setIsSnapping(false), 320);

      driftFromStartRef.current = 0;
      armedDirectionRef.current = 0;
    },
    [activeIndex, imageCount],
  );

  const startRender = Math.max(0, Math.floor(activeIndex) - renderRange);
  const endRender = Math.min(imageCount - 1, Math.ceil(activeIndex) + renderRange);

  const ratioStyle: React.CSSProperties = { ['--ratio' as any]: String(aspectRatio) };

  return (
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
      {images.slice(startRender, endRender + 1).map((image, localIdx) => {
        const realIndex = localIdx + startRender;
        const deltaToActive = realIndex - activeIndex;
        const transform = computeTransform(deltaToActive, swipeDirection, widthPxRef.current);
        const opacity = opacityFor(deltaToActive, swipeDirection);
        const zIndex = 1000 - Math.abs(deltaToActive) * 10;

        return (
          <figure
            key={realIndex}
            className={styles.card}
            style={{ transform, opacity, zIndex: Math.round(zIndex) }}
            aria-hidden={Math.abs(deltaToActive) > 1.6 ? true : undefined}
          >
            <img className={styles.media} src={image.src} alt={image.alt ?? ''} draggable={false} />
            <div className={styles.shade} />
            <div className={styles.gloss} />
          </figure>
        );
      })}
    </div>
  );
}
export default SwipeStack;
