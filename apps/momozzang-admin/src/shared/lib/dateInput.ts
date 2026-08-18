/**
 * `input[type=date]` 가 받아들이는 `YYYY-MM-DD` 형식으로 정규화한다.
 *
 * 브라우저의 date 입력은 `YYYY-M-D` 처럼 zero-pad 가 없는 값을 **조용히 버리고** 빈칸이 된다.
 * (Chromium 151 은 콘솔 경고조차 내지 않는다.) 시드/외부 데이터가 비정규 값을 담고 있어도
 * 폼이 빈칸으로 보이지 않도록, 상태 진입 지점과 렌더 시점 양쪽에서 이 함수를 통과시킨다.
 *
 * - `'2030-1-24'`  -> `'2030-01-24'`
 * - `'2030-1-4'`   -> `'2030-01-04'`
 * - `'2030-01-24'` -> `'2030-01-24'` (이미 정규형이면 그대로)
 * - `''` / `undefined` / 해석 불가 값 -> `''`
 */
const DATE_PARTS = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export function toDateInputValue(raw: string | undefined | null): string {
  if (!raw) return '';

  const matched = DATE_PARTS.exec(raw.trim());
  if (!matched) return '';

  const [, year, rawMonth, rawDay] = matched;
  const month = Number(rawMonth);
  const day = Number(rawDay);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
