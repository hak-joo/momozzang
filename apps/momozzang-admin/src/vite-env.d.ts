/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 조회 base URL. 객체 키를 buildImageUrl 로 최종 URL 조립할 때 사용. 예: https://img.momozzang.com */
  readonly VITE_IMAGE_BASE_URL?: string;
  /** Worker 업로드 엔드포인트 절대 URL(조회 base 와 분리). 예: https://api.momozzang.com/upload */
  readonly VITE_UPLOAD_ENDPOINT?: string;
  /**
   * 어드민이 X-Upload-Token 헤더로 보내는 공유비밀.
   * ⚠️ Vite 가 번들에 평문 치환하는 클라이언트 노출형 약한 1차 방어(anon-key 수준).
   * R2 Access Key/Secret 같은 고위험 자격증명과 동급이 아니다(그쪽은 Worker 바인딩 사용으로 부재).
   */
  readonly VITE_UPLOAD_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
