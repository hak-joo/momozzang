/** 슬러그는 영문 소문자/숫자/하이픈만 허용한다. */
const SLUG_PATTERN = /^[a-z0-9-]*$/;

export function getSlugError(slug: string): string | null {
  if (slug.length === 0) return null; // 빈 값은 별도 처리(이번 스프린트에선 형식 검증만)
  if (!SLUG_PATTERN.test(slug)) {
    return '영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요.';
  }
  return null;
}
