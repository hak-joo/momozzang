import {
  ARRIVE_OPACITY_WINDOW,
  ARRIVE_X_WINDOW,
  BASE_TILT_DEG,
  DEPTH_STEP,
  EXIT_WINDOW,
  FADE_OUT_WINDOW,
  FUTURE_IDLE_BASE,
  FUTURE_IDLE_GAIN,
  FUTURE_MIN_OPACITY,
  LIFT_PX,
  OPACITY_DEADZONE,
  REENTER_WINDOW,
  ROT_EXP,
  ROT_FEATHER,
  SCALE_DROP,
  STACK_X,
  ACTIVE_ROT_ZERO,
} from './constants';

// ---------- 공통 유틸 ----------
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const clamp01 = (n: number) => clamp(n, 0, 1);

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

// ---------- 시각 함수 ----------
/**
 * d = (realIndex - activeIndex), 0이면 현재 카드.
 * dir: -1(왼쪽으로 넘기는 중/다음), +1(오른쪽/이전), 0(정지)
 * width: 컨테이너 폭
 *
 * 회전 규칙:
 *  - 현재(활성) 근방(|d|≤ACTIVE_ROT_ZERO)에서는 무조건 0°
 *  - 미래(d>0)는 ACTIVE_ROT_ZERO 이후 연속적으로 0→BASE_TILT_DEG로 증가
 *  - 과거(d<0)는 회전 없음(오프스크린 이탈)
 */
export function computeTransform(d: number, dir: -1 | 0 | 1, width: number): string {
  const delta = clamp(d, -3, 3);
  const absDelta = Math.abs(delta);

  let translateX = 0;
  let translateY = 0;
  let translateZ = 0;
  let rotateZDeg = 0;
  let scale = 1;

  if (delta >= 0) {
    // ---- 미래 카드 (오른쪽 영역, d ≥ 0) ----
    // x: STACK_X에서 대기하다가 중앙으로 들어오며 0으로 보간
    const arriveT = 1 - smoothstep(0, ARRIVE_X_WINDOW, delta); // delta=0→1, delta>=window→0
    translateX = STACK_X * (1 - arriveT);
    if (dir === -1) translateX -= arriveT * 10; // 왼쪽 스와이프 시 '끌려오는' 느낌

    // 깊이감/스케일/리프트
    translateZ = -DEPTH_STEP * delta;
    scale = 1 - SCALE_DROP * clamp01(delta);
    translateY = -LIFT_PX * (1 - clamp01(delta));

    // 회전: 중앙은 0°, 바깥에서 연속 0→BASE_TILT_DEG
    const raw = (delta - ACTIVE_ROT_ZERO) / ROT_FEATHER;
    const rotScale = delta <= ACTIVE_ROT_ZERO ? 0 : Math.pow(clamp01(raw), ROT_EXP);
    const directionBias = dir === -1 ? 0.95 : 1.0; // 들어올 때 약간 더 평평하게
    rotateZDeg = BASE_TILT_DEG * rotScale * directionBias;
  } else {
    // ---- 과거 카드 (왼쪽 영역, d < 0) ----
    const past = -delta; // 양수
    const offT = smoothstep(0, EXIT_WINDOW, past);
    const off = width * (0.2 + 1.1 * offT); // 0.2w → 1.3w
    translateX = -off;
    translateZ = -40;
    scale = 1 - 0.02 * clamp01(past);
    translateY = 0;
    rotateZDeg = 0; // 과거는 회전 없음
  }

  // 미세 깜빡임 방지
  if (Math.abs(rotateZDeg) < 0.01) rotateZDeg = 0;

  return `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateZ(${rotateZDeg}deg) scale(${scale})`;
}

/**
 * 방향 히스테리시스가 적용된 opacity:
 *  - 아주 작은 드래그(|d|<OPACITY_DEADZONE)나 정지(dir=0)는 변화 없음(1)
 *  - 과거(d<0):
 *      · dir=-1(왼쪽으로 나가는 중): FADE_OUT_WINDOW 길이로 1→0 서서히 감쇠
 *      · dir=+1(오른쪽으로 되돌리는 중): 직전 카드(-1<d<0)만 REENTER_WINDOW 안에서 0→1로 서서히
 *        더 먼 과거(d≤-1)는 항상 0 (한꺼번에 켜지는 현상 방지)
 *  - 미래(d≥0):
 *      · dir=-1(왼쪽으로 넘기는 중): 중앙으로 다가올수록 FUTURE_MIN_OPACITY→1로 페이드-인
 *      · 그 외: FUTURE_IDLE_BASE±GAIN의 얕은 변화
 */
export function opacityFor(d: number, dir: -1 | 0 | 1): number {
  if (Math.abs(d) < OPACITY_DEADZONE || dir === 0) return 1;

  if (d < 0) {
    // 과거 카드
    if (d <= -1) return 0; // 더 먼 과거는 항상 0
    const past = -d; // 0..1 (직전 카드 범위)

    if (dir === -1) {
      // 왼쪽으로 보내는 중: 1→0
      const t = clamp01(past / FADE_OUT_WINDOW);
      const out = 1 - smoothstep(0, 1, t);
      return out;
    } else {
      // 오른쪽으로 되끌어오는 중: 경계 근처에서만 0→1
      const t = clamp01(1 - past / REENTER_WINDOW); // past=REENTER_WINDOW→0, past=0→1
      const re = smoothstep(0, 1, t);
      return re;
    }
  }

  // 미래 카드
  const future = clamp(d, 0, 3);
  if (dir === -1) {
    const arrive = 1 - smoothstep(0, ARRIVE_OPACITY_WINDOW, future); // 1..0
    return FUTURE_MIN_OPACITY + (1 - FUTURE_MIN_OPACITY) * arrive; // 0.78..1.0
  } else {
    const arrive = 1 - clamp01(future / 0.55);
    return FUTURE_IDLE_BASE + FUTURE_IDLE_GAIN * arrive; // 0.92..1.0
  }
}
