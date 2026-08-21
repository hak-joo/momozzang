import { useRef, useEffect, useState } from 'react';
import { hueShiftPixels } from '../lib/hueShiftPixels';

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
  const [displaySrc, setDisplaySrc] = useState<string>(src);

  useEffect(() => {
    // targetHue가 없거나 original과 같으면 원본 사용
    if (targetHue === undefined || targetHue === originalHue) {
      setDisplaySrc(src);
      return;
    }

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
      setDisplaySrc(canvas.toDataURL());
    };
  }, [src, targetHue, originalHue, options?.strategy, options?.preserveSkinTones]);

  return displaySrc;
}
