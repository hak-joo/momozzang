/**
 * 색조 변환 결과 캐시 (SPEC F10)
 *
 * - 순수 키 함수 + 상한 있는 LRU + 진행 중 계산 공유(single-flight)
 * - **런타임 import 0건**이다. 타입만 지우면 Node 가 `data:` 모듈로 그대로 평가할 수 있어야
 *   하고(`hue-cache-parity.mjs`), DOM·React 에 의존하지 않는다.
 * - 값의 종류는 바뀌지 않는다 — 저장하는 것은 훅이 만든 dataURL 문자열뿐이다(P5).
 */

/**
 * 정착값 상한.
 *
 * 첫 로드 실측 고유 형상 15종(파이프라인 인스턴스 24개)이므로 실사용 작업집합보다 크다.
 * 즉 실사용에서는 축출이 일어나지 않고, 축출 경로는 Node 판정으로만 도달한다.
 */
export const HUE_SHIFT_CACHE_LIMIT = 32;

type HueShiftStrategy = 'absolute' | 'relative';

/** 정착된 결과. `Map` 의 삽입 순서를 LRU 순서로 쓴다 — 맨 앞이 가장 오래 쓰이지 않은 항목이다. */
const settled = new Map<string, string>();

/** 진행 중 계산. 같은 키의 두 번째 소비자는 새로 계산하지 않고 이 Promise 를 공유한다. */
const inFlight = new Map<string, Promise<string>>();

/**
 * 훅 호출 인자 5개를 캐시 키로 접는다. 같은 인자 → 같은 키(멱등), 하나라도 다르면 다른 키.
 *
 * **정규화하지 않는다.** `strategy` 의 `undefined` 를 `'absolute'` 로 접으면 키가 같아져
 * "각 인자를 하나씩 바꿀 때마다 키가 달라진다"(DoD 17)를 만족시킬 수 없다. 접지 않아서
 * 생기는 중복 계산은 이 저장소에서 0건이다 — 직접 호출이 쓰는 에셋은 전부 단일 소비자다.
 */
export function hueShiftKey(
  src: string,
  targetHue: number,
  originalHue: number,
  strategy?: HueShiftStrategy,
  preserveSkinTones?: boolean,
): string {
  return JSON.stringify([src, targetHue, originalHue, strategy, preserveSkinTones]);
}

/** 최근 사용으로 표시한다(삽입 순서를 뒤로 옮긴다). */
function touch(key: string, value: string): void {
  settled.delete(key);
  settled.set(key, value);
}

/** 상한을 넘긴 만큼 가장 오래된 항목부터 버린다. */
function evictOverflow(): void {
  while (settled.size > HUE_SHIFT_CACHE_LIMIT) {
    const oldestKey = settled.keys().next().value;
    if (oldestKey === undefined) return;
    settled.delete(oldestKey);
  }
}

/**
 * **정착값만** 동기로 돌려준다. 계산이 진행 중이거나 없으면 `undefined`.
 *
 * 훅이 첫 렌더에서 이것을 읽어 캐시 적중 시 처음부터 변환본으로 시작한다(SPEC P7 허용).
 */
export function peekHueShift(key: string): string | undefined {
  const value = settled.get(key);
  if (value === undefined) return undefined;
  touch(key, value);
  return value;
}

/**
 * 같은 키의 계산을 하나로 접는다.
 *
 * - 정착값이 있으면 `factory` 를 호출하지 않는다.
 * - 진행 중이면 그 Promise 를 공유한다(취소하지 않는다 — 다른 소비자가 결과를 기다린다).
 * - **실패는 캐시하지 않는다.** reject 로 끝난 키는 맵에서 빠지므로 다음 요청이 재계산한다.
 */
export function getOrCreateHueShift(
  key: string,
  factory: () => Promise<string>,
): Promise<string> {
  const value = settled.get(key);
  if (value !== undefined) {
    touch(key, value);
    return Promise.resolve(value);
  }

  const pending = inFlight.get(key);
  if (pending !== undefined) return pending;

  let started: Promise<string>;
  try {
    started = factory();
  } catch (error) {
    return Promise.reject(error);
  }

  const shared = started.then(
    (result) => {
      inFlight.delete(key);
      settled.set(key, result);
      evictOverflow();
      return result;
    },
    (error) => {
      inFlight.delete(key);
      throw error;
    },
  );
  inFlight.set(key, shared);
  return shared;
}
