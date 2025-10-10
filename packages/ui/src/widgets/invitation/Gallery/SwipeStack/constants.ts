// === 제스처/커밋 관련 ===
export const COMMIT_DEADZONE = 0.06; // opacity 발동과 동일 임계(드래그 시작 소거 구간)

// === 레이아웃/변형 관련 ===
export const STACK_X = 18; // 미래 카드 대기 x 위치
export const BASE_TILT_DEG = 3; // 미래 카드 기본 회전각(+3deg)
export const ARRIVE_X_WINDOW = 0.55; // 미래 카드가 중앙으로 슬며시 들어오는 x 보간 구간
export const EXIT_WINDOW = 0.9; // 과거 카드가 좌측 바깥으로 나가는 보간 구간
export const DEPTH_STEP = 80; // 카드 간 z-깊이 간격
export const SCALE_DROP = 0.06; // 카드 간 scale 감쇠
export const LIFT_PX = 6; // 중앙 근처에서 약간 들어 올림

// === 회전(현재 0°, 미래 연속 기울기) ===
export const ACTIVE_ROT_ZERO = 0.08; // 중앙(|d|≤이 값)에서 회전 0 보장
export const ROT_FEATHER = 0.32; // ACTIVE_ROT_ZERO 이후 0→15°로 서서히 켜지는 구간
export const ROT_EXP = 1.2; // 회전 곡선(>1이면 초반 완만, 후반 가속)

// === Opacity(히스테리시스 & 데드존) ===
export const OPACITY_DEADZONE = 0.06; // 아주 작은 드래그에서 opacity 변화 없음
export const FADE_OUT_WINDOW = 0.8; // 과거로 나갈 때 1→0 감쇠 길이
export const REENTER_WINDOW = 0.55; // 과거에서 되돌아올 때 0→1 감쇠 길이(직전 카드 전용)
export const FUTURE_MIN_OPACITY = 0.78; // 미래(다음) 대기 최소 불투명도
export const ARRIVE_OPACITY_WINDOW = 0.7; // 미래 카드가 중앙으로 올 때 페이드-인 길이
export const FUTURE_IDLE_BASE = 0.92; // 오른쪽 스와이프/정지 시 기본값
export const FUTURE_IDLE_GAIN = 0.08; // 중앙 근처에서 살짝 ↑
