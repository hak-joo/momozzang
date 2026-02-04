import { useRef, useEffect, useState } from 'react';
import { rgbToHsl, hslToRgb } from '../lib/colorUtils';

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

      const hueDiff = targetHue - originalHue;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // 투명 픽셀 스킵
        if (a < 10) continue;

        const [h, s, l] = rgbToHsl(r, g, b);

        let newR, newG, newB;

        // 피부색 보호 로직 (대략 Hue 10~50 사이는 오렌지/살구색 계열)
        const isSkinTone = options?.preserveSkinTones && h >= 10 && h <= 50;

        if (isSkinTone) {
          // 피부색이면 변경하지 않음
          newR = r;
          newG = g;
          newB = b;
        } else if (options?.strategy === 'relative') {
          // 상대적 회전: 원본 픽셀의 Hue에 차이값을 더함
          const newH = (h + hueDiff + 360) % 360;
          [newR, newG, newB] = hslToRgb(newH, s, l);
        } else {
          // 절대적 변경 (기존 로직): 모든 픽셀을 targetHue로 고정
          [newR, newG, newB] = hslToRgb(targetHue, s, l);
        }

        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
      }

      ctx.putImageData(imageData, 0, 0);
      setDisplaySrc(canvas.toDataURL());
    };
  }, [src, targetHue, originalHue, options?.strategy, options?.preserveSkinTones]);

  return displaySrc;
}
