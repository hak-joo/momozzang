/**
 * 이미지(및 향후 오디오 등) URL 조립 헬퍼.
 *
 * 저장 형태를 "절대 public URL" → "객체 키"로 전환하면서, 화면에서 읽을 때
 * 환경변수 기반 베이스 URL과 키를 조합해 최종 URL을 만든다.
 * 이미 절대 URL로 저장된 기존 데이터는 그대로 통과시켜 하위 호환을 보장한다.
 *
 * 베이스 결합 로직은 범용이라 오디오 등 다른 "외부 호스트 자원"에도 재사용 가능하다.
 * (BGM 도입 시 동일 헬퍼 재사용 권고 — SPEC §2 오디오 판단 참고)
 */

/** 이미 완성된 URL(또는 임시 객체 URL)로 간주해 그대로 통과시킬 접두사 */
const PASSTHROUGH_PREFIXES = ['http://', 'https://', '//', 'data:', 'blob:'];

/**
 * 입력값이 이미 완성된 URL(혹은 data/blob URI)인지 판별한다.
 * 이 경우 베이스와 결합하지 않고 그대로 사용해야 한다.
 */
function isAbsoluteOrInlineUrl(value: string): boolean {
  return PASSTHROUGH_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/** 변형 파라미터를 붙이면 안 되는(원본 그대로 통과시켜야 하는) 인라인 URI인지 판별 */
function isInlineUri(value: string): boolean {
  return value.startsWith('data:') || value.startsWith('blob:');
}

/** 베이스 끝 슬래시, 키 앞 슬래시 중복/누락을 슬래시 1개로 정규화해 결합 */
function joinBaseAndKey(baseUrl: string, key: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const trimmedKey = key.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedKey}`;
}

export interface BuildImageUrlOptions {
  /**
   * 베이스 URL override. 미지정 시 `import.meta.env.VITE_IMAGE_BASE_URL`를 읽는다.
   * (테스트/주입용)
   */
  baseUrl?: string;
}

/**
 * 키 또는 절대 URL을 화면에 바로 쓸 수 있는 최종 URL로 변환한다.
 *
 * - `http://`/`https://`/`//`/`data:`/`blob:` 로 시작하면 입력을 그대로 반환한다. (하위 호환)
 * - 그 외 비어있지 않은 문자열은 베이스 URL + 키로 안전하게 결합한다.
 *   (베이스 끝 슬래시 / 키 앞 슬래시 중복·누락을 슬래시 1개로 정규화)
 * - 빈 문자열 / `undefined` / `null` 입력은 빈 문자열을 반환해 깨진 `<img>`를 만들지 않는다.
 *
 * 불변식: 실제 업로드 키 형식(영숫자·`-`·`.`)에서
 * `buildImageUrl(K)` === `supabase.storage.from('wedding-images').getPublicUrl(K).publicUrl`
 * (getPublicUrl 의 encodeURI 는 해당 키 형식에서 no-op 이라 문자 단위 동일)
 */
export function buildImageUrl(
  keyOrUrl: string | null | undefined,
  options: BuildImageUrlOptions = {},
): string {
  if (!keyOrUrl) return '';

  if (isAbsoluteOrInlineUrl(keyOrUrl)) {
    return keyOrUrl;
  }

  const baseUrl = options.baseUrl ?? import.meta.env.VITE_IMAGE_BASE_URL ?? '';
  if (!baseUrl) {
    // 베이스가 없으면 결합할 수 없으므로 키를 그대로 반환(최소한의 폴백).
    return keyOrUrl;
  }

  return joinBaseAndKey(baseUrl, keyOrUrl);
}

export interface BuildThumbnailUrlOptions extends BuildImageUrlOptions {
  /** 썸네일 너비(px). Supabase 변형 파라미터 `?width=N` 으로 적용된다. */
  width: number;
}

/**
 * 키 또는 절대 URL에 썸네일(변형) 파라미터를 적용한 URL을 반환한다.
 *
 * - 내부적으로 `buildImageUrl` 결과를 만든 뒤 `?width=N` 을 부착한다.
 * - `data:`/`blob:`/빈 입력은 변형을 붙이지 않고 그대로 통과한다.
 *
 * 현행 `GalleryManager.getThumbnailUrl`(`?width=200`)의 동작을 보존한다.
 */
export function buildThumbnailUrl(
  keyOrUrl: string | null | undefined,
  options: BuildThumbnailUrlOptions,
): string {
  if (!keyOrUrl) return '';

  // data:/blob: 은 변형 미적용·그대로 통과
  if (isInlineUri(keyOrUrl)) {
    return keyOrUrl;
  }

  const url = buildImageUrl(keyOrUrl, options);
  if (!url) return '';

  return `${url}?width=${options.width}`;
}
