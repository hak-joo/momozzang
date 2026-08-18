/**
 * 편집 비밀번호 해시 유틸 (Web Crypto SHA-256, 소문자 hex 64자).
 *
 * **로컬 데이터소스 전용이다. 운영(원격 DB) 경로에서 사용하지 않는다.**
 * `VITE_DATA_SOURCE` 가 원격 값일 때의 해시 생성·대조는 전부 서버 RPC 안에서
 * pgcrypto `crypt(..., gen_salt('bf'))` 로 수행한다. 클라이언트는 평문 비밀번호를
 * RPC 인자로만 넘기고 해시를 만들지도, 내려받지도 않는다.
 *
 * 이 함수의 SHA-256 은 무염(unsalted)이라 운영 수준의 비밀번호 저장에는 적합하지 않다.
 * 원격 DB 없이 전체 플로우를 재현하기 위한 로컬(localStorage) 경로에서만 쓴다.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
