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

    // 언마운트되거나 의존값이 바뀌면 이 실행의 결과를 버린다(계산 자체는 취소하지 않는다).
    let cancelled = false;

    const key = hueShiftKey(
      src,
      targetHue,
      originalHue,
      options?.strategy,
      options?.preserveSkinTones,
    );

    const compute = () =>
      new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;

        img.onerror = () => {
          reject(new Error('useImageHueShift: 이미지 로드 실패'));
        };

        img.onload = () => {
          // 캔버스 생성 (메모리 상)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('useImageHueShift: 2d 컨텍스트 획득 실패'));
            return;
          }

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

    getOrCreateHueShift(key, compute)
      .then((result) => {
        // 늦게 도착한 결과가 최신 선택을 덮어쓰지 않게 한다. 버려질 뿐 변형되지 않으므로
        // 같은 키를 기다리는 다른 소비자와 캐시는 이 결과를 그대로 쓴다.
        if (cancelled) return;
        setDisplaySrc(result);
      })
      .catch(() => {
        // 변환 실패(이미지 로드 실패 / 2d 컨텍스트 실패)는 **원본 src** 로 남는다.
        // 다른 색으로 대체하지 않는다. 실패한 키는 캐시에 남지 않아 다음 요청이 재계산한다.
        if (cancelled) return;
        setDisplaySrc(src);
      });

    return () => {
      cancelled = true;
    };
  }, [src, targetHue, originalHue, options?.strategy, options?.preserveSkinTones]);

  return displaySrc;
}
