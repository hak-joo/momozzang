/** 슬러그는 영문 소문자/숫자/하이픈만 허용한다. */
const SLUG_PATTERN = /^[a-z0-9-]*$/;

/** 슬러그 길이 경계 — 원본 3섹션 `^[a-z0-9-]{3,50}$`. */
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 50;

const CHARSET_MESSAGE = '영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요.';
const EMPTY_MESSAGE = '슬러그를 입력해 주세요.';
const LENGTH_MESSAGE = `슬러그는 ${SLUG_MIN_LENGTH}자 이상 ${SLUG_MAX_LENGTH}자 이하로 입력해 주세요.`;

/**
 * 입력 중 실시간 피드백용 — 문자셋만 본다.
 *
 * 길이를 여기서 보면 첫 글자를 치는 순간부터 빨간 오류가 떠 입력 내내 오류 상태가 된다.
 * 길이 경계는 저장 시점의 `getSlugSaveError` 가 강제한다.
 */
export function getSlugError(slug: string): string | null {
  if (slug.length === 0) return null; // 빈 값은 저장 시점(getSlugSaveError)에서 처리한다.
  if (!SLUG_PATTERN.test(slug)) {
    return CHARSET_MESSAGE;
  }
  return null;
}

/**
 * 저장(신청) 시점 검증용 — `^[a-z0-9-]{3,50}$` 전체를 강제한다.
 *
 * 문자셋 오류를 길이 오류보다 먼저 판정한다. `QA Flow` 처럼 길이는 통과하지만
 * 문자셋이 틀린 입력에서 사용자가 고쳐야 할 것은 문자셋이기 때문이다.
 */
export function getSlugSaveError(slug: string): string | null {
  if (slug.length === 0) return EMPTY_MESSAGE;
  if (!SLUG_PATTERN.test(slug)) return CHARSET_MESSAGE;
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) return LENGTH_MESSAGE;
  return null;
}
