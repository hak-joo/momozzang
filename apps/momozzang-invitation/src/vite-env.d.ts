/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 온보딩 CTA 가 가리킬 신청 페이지 절대 URL(어드민 앱의 `/apply`).
   * 값이 비어 있으면 CTA 앵커를 렌더하지 않는다(죽은 링크를 만들지 않는다).
   */
  readonly VITE_APPLY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
