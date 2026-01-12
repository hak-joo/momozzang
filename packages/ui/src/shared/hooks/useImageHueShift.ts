import { useRef, useEffect, useState } from 'react';
import { rgbToHsl, hslToRgb } from '../lib/colorUtils';

/**
 * 이미지의 색조(Hue)를 목표 Hue로 변경하는 훅
 * @param src 원본 이미지 경로
 * @param originalHue 원본 이미지의 주조색 Hue (기본값: 270)
 * @param targetHue 목표 Hue (0~360)
 * @returns 변환된 이미지 URL (Blob URL 또는 Data URL)
 */
export function useImageHueShift(src: string, targetHue?: number, originalHue: number = 270) {
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

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // 투명 픽셀 스킵
        if (a < 10) continue;

        const [h, s, l] = rgbToHsl(r, g, b);

        // Hue만 변경, 채도/명도는 유지
        const [newR, newG, newB] = hslToRgb(targetHue, s, l);

        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
      }

      ctx.putImageData(imageData, 0, 0);
      setDisplaySrc(canvas.toDataURL());
    };
  }, [src, targetHue, originalHue]);

  return displaySrc;
}
