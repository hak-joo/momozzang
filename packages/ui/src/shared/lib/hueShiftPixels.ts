import { rgbToHsl, hslToRgb } from './colorUtils';

/**
 * 이미지 픽셀 배열의 색조(Hue)를 목표 Hue로 옮긴다. `data` 를 제자리에서 변형한다.
 *
 * `useImageHueShift` 의 effect 본문에서 문자 그대로 옮겨온 순수 함수다(계약 3 P2′-1).
 * DOM 에 의존하지 않으므로 Node 에서 구/신 구현의 바이트 동등성을 판정할 수 있다.
 *
 * @param data 캔버스에서 읽은 RGBA 픽셀 배열 (제자리 변형)
 * @param targetHue 목표 Hue (0~360)
 * @param originalHue 원본 이미지의 주조색 Hue
 * @param options strategy / preserveSkinTones
 */
export function hueShiftPixels(
  data: Uint8ClampedArray,
  targetHue: number,
  originalHue: number,
  options?: { strategy?: 'absolute' | 'relative'; preserveSkinTones?: boolean },
): void {
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
}
