import { useRef, useEffect, useState } from 'react';
import { hueShiftPixels } from '../lib/hueShiftPixels';
import { getOrCreateHueShift, hueShiftKey, peekHueShift } from '../lib/hueShiftCache';

/**
 * 이미지의 색조(Hue)를 목표 Hue로 변경하는 훅
 * @param src 원본 이미지 경로
 * @param originalHue 원본 이미지의 주조색 Hue (기본값: 270)
 * @param targetHue 목표 Hue (0~360)
 * @returns 변환된 이미지 URL (Blob URL 또는 Data URL)
 */
export function useImageHueShift(
  src: string,
  targetHue?: number,
  originalHue: number = 270,
  options?: { strategy?: 'absolute' | 'relative'; preserveSkinTones?: boolean },
) {
  // 캐시 적중이면 첫 렌더부터 변환본으로 시작한다(SPEC P7 이 명시적으로 허용하는 형태).
  // 조기 반환 대상(targetHue 없음 / originalHue 와 동일)은 단락 평가로 키 계산조차 건너뛴다 —
  // 즉 PURPLE 경로는 캐시를 한 번도 만지지 않는다.
  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    if (targetHue === undefined || targetHue === originalHue) return src;
    const cachedKey = hueShiftKey(
      src,
      targetHue,
      originalHue,
      options?.strategy,
      options?.preserveSkinTones,
    );
    return peekHueShift(cachedKey) ?? src;
  });

  useEffect(() => {
    // targetHue가 없거나 original과 같으면 원본 사용
    if (targetHue === undefined || targetHue === originalHue) {
      setDisplaySrc(src);
      return;
    }

    const key = hueShiftKey(
      src,
      targetHue,
      originalHue,
      options?.strategy,
      options?.preserveSkinTones,
    );

    const compute = () =>
      new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;

        img.onload = () => {
          // 캔버스 생성 (메모리 상)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          hueShiftPixels(data, targetHue, originalHue, {
            strategy: options?.strategy,
            preserveSkinTones: options?.preserveSkinTones,
          });

          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL());
        };
      });

    getOrCreateHueShift(key, compute).then((result) => {
      setDisplaySrc(result);
    });
  }, [src, targetHue, originalHue, options?.strategy, options?.preserveSkinTones]);

  return displaySrc;
}
