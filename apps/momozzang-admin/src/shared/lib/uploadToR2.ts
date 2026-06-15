/**
 * Cloudflare Worker(R2 바인딩) 업로드 클라이언트.
 *
 * 어드민 두 업로드 경로(단일 `useImageUploadMutation`, 갤러리 `GalleryManager`)가 공유한다.
 * Worker 가 검증(타입/크기)+키 생성+R2 저장 후 **객체 키**를 응답한다.
 *
 * ── 보안 등급 (SPEC §2 F2 / 계약 §3.2) ──────────────────────────────────────
 * - `VITE_UPLOAD_TOKEN` 은 Vite 가 빌드 시 번들 JS 에 **평문 치환**하는 클라이언트 노출형 값이다.
 *   anon-key 수준의 **약한 1차 방어**이며, R2 Access Key/Secret 같은 고위험 자격증명과 동급이 아니다.
 *   (R2 Access Key/Secret 은 Worker 바인딩 사용으로 코드·env 어디에도 존재하지 않는다.)
 * - Worker 측은 이 토큰(X-Upload-Token) 검증에 더해 CORS Origin 화이트리스트를 병행한다.
 */

export interface UploadResult {
  /** R2 객체 키. 데이터에 저장하는 값(절대 URL 아님). */
  key: string;
  /** 저장된 객체의 content-type. */
  contentType?: string;
}

const ENDPOINT = import.meta.env.VITE_UPLOAD_ENDPOINT;
const TOKEN = import.meta.env.VITE_UPLOAD_TOKEN;

/**
 * 이미지 파일 1장을 Worker 로 업로드하고 객체 키를 반환한다.
 *
 * @param file 업로드할 파일(호출부에서 사전 리사이즈 권장).
 * @param prefix 키 네임스페이스. 'admin'(단일) | 'gallery'(갤러리).
 */
export async function uploadToR2(
  file: File,
  prefix: 'admin' | 'gallery' = 'admin',
): Promise<UploadResult> {
  if (!ENDPOINT) {
    throw new Error('VITE_UPLOAD_ENDPOINT 가 설정되지 않았습니다.');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('prefix', prefix);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      // 공유비밀 1차 방어. 값은 브라우저 노출형(VITE_) — 위 주석의 보안 등급 참고.
      'X-Upload-Token': TOKEN ?? '',
    },
    body: form,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ? `: ${body.error}` : '';
    } catch {
      // JSON 아닌 응답 무시
    }
    throw new Error(`업로드 실패 (${res.status})${detail}`);
  }

  const data = (await res.json()) as UploadResult;
  if (!data.key) {
    throw new Error('업로드 응답에 key 가 없습니다.');
  }
  return data;
}
