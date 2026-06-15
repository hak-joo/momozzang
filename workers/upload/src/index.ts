/**
 * Cloudflare Worker — 이미지 업로드 중개 (어드민 → Worker → R2 바인딩)
 *
 * 흐름: 어드민 브라우저가 리사이즈한 이미지를 이 Worker 의 `POST /upload` 로 보낸다.
 * Worker 가 (a) Origin 화이트리스트 + 공유비밀(X-Upload-Token) 인증 (b) 타입/크기 검증
 * (c) 객체 키 생성 (d) `env.BUCKET.put()` 으로 R2 저장 → 저장된 **키** 를 JSON 으로 응답한다.
 * 하객 조회는 이 Worker 를 거치지 않고 R2 커스텀 도메인(img.momozzang.com)으로 직접 서빙된다.
 *
 * ── 보안 등급 (SPEC §2 F2 / 계약 §3.2) ────────────────────────────────────────
 * - `UPLOAD_TOKEN` (Worker 시크릿): 브라우저에 절대 노출되지 않는 검증값. `wrangler secret put UPLOAD_TOKEN`.
 * - 어드민이 보내는 `X-Upload-Token` 의 출처값 `VITE_UPLOAD_TOKEN` 은 Vite 번들에 평문 치환되는
 *   **클라이언트 노출형 약한 1차 방어**(anon-key 수준). R2 Access Key/Secret 같은 고위험 자격증명과 동급이 아니다.
 * - 따라서 토큰 검증만으로는 "노출 즉시 무의미"에 가깝다. 이를 보완해 **CORS Origin 화이트리스트**
 *   (와일드카드 금지)를 병행한다. 단 Origin/Referer 는 브라우저-only 신뢰값이라 curl 등 비브라우저
 *   요청은 우회 가능 → 토큰 검증을 대체하지 않고 병행 1차 방어로 둔다(README 의 보안 한계 참고).
 * - **R2 Access Key/Secret 은 이 코드·wrangler.toml·환경변수 어디에도 없다.** R2 바인딩(env.BUCKET)을 쓴다.
 */

export interface Env {
  /** R2 버킷 바인딩 (wrangler.toml 의 [[r2_buckets]] binding = "BUCKET", 대상 버킷 momozzang-images) */
  BUCKET: R2Bucket;
  /** Worker 가 검증하는 공유비밀. `wrangler secret put UPLOAD_TOKEN` 으로 주입. 평문 금지. */
  UPLOAD_TOKEN: string;
  /**
   * (선택) 쉼표로 구분한 추가 허용 Origin. 미설정 시 아래 DEFAULT_ALLOWED_ORIGINS 만 사용.
   * 배포 후 어드민 도메인이 바뀌면 `wrangler secret`/var 로 주입할 수 있게 열어둔다.
   */
  ALLOWED_ORIGINS?: string;
}

/**
 * 허용 content-type → 확장자 매핑.
 * 확장자는 **원본 파일명이 아니라 검증된 content-type** 에서 결정한다(헤더 위조 시에도 키가 오염되지 않게).
 * 허용 타입·상한은 여기 한 곳에서 관리한다(SPEC §2 F3).
 */
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** 업로드 상한 (바이트). 리사이즈 후 합리적 상한. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/** 허용 키 prefix (용도 네임스페이스). 기존 관행 계승: 단일=admin, 갤러리=gallery. */
const ALLOWED_PREFIXES = ['admin', 'gallery'] as const;
const DEFAULT_PREFIX = 'admin';

/**
 * CORS 허용 Origin 화이트리스트 (와일드카드 금지 — 계약 §3.2).
 * 어드민 배포 도메인 + 로컬 dev origin 을 명시한다.
 * 배포 도메인이 바뀌면 여기 또는 env.ALLOWED_ORIGINS 로 관리한다.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'https://admin.momozzang.com',
  'https://momozzang.com',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
];

function getAllowedOrigins(env: Env): string[] {
  const extra = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_ORIGINS, ...extra];
}

function isAllowedOrigin(origin: string | null, env: Env): origin is string {
  return origin != null && getAllowedOrigins(env).includes(origin);
}

/** 허용 Origin 에 대해서만 CORS 헤더를 부여(와일드카드 미사용). 비허용/누락이면 빈 헤더. */
function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  if (!isAllowedOrigin(origin, env)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

/** prefix-timestamp-random.ext 형식의 키 생성. 문자셋: 영숫자·`-`·`.` (buildImageUrl 불변식 유지). */
function buildObjectKey(prefix: string, ext: string): string {
  const safePrefix = (ALLOWED_PREFIXES as readonly string[]).includes(prefix)
    ? prefix
    : DEFAULT_PREFIX;
  const random = Math.random().toString(36).slice(2, 9);
  return `${safePrefix}-${Date.now()}-${random}.${ext}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);
    const url = new URL(request.url);

    // ── CORS preflight ──────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      // 비허용 Origin 의 preflight 는 거부(CORS 헤더 없이 403).
      if (!isAllowedOrigin(origin, env)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: cors });
    }

    // 업로드 라우트만 허용.
    if (url.pathname !== '/upload') {
      return json({ error: 'Not found' }, 404, cors);
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    // ── Origin 화이트리스트 (병행 1차 방어) ──────────────────────
    // 브라우저발 요청은 Origin 을 자동 부여한다. 비허용 Origin 은 거부.
    // (Origin 누락 == 비브라우저 요청 가능성. 토큰 검증으로 한 번 더 거른다.)
    if (origin != null && !isAllowedOrigin(origin, env)) {
      return json({ error: 'Origin not allowed' }, 403, {});
    }

    // ── F2: 공유비밀 인증 ───────────────────────────────────────
    const token = request.headers.get('X-Upload-Token');
    if (!env.UPLOAD_TOKEN || !token || token !== env.UPLOAD_TOKEN) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }

    // ── 본문 추출 (multipart/form-data 또는 raw 바이너리) ───────
    let bytes: ArrayBuffer;
    let declaredType: string;
    let requestedPrefix = DEFAULT_PREFIX;

    const contentType = request.headers.get('Content-Type') ?? '';
    try {
      if (contentType.includes('multipart/form-data')) {
        const form = await request.formData();
        const file = form.get('file');
        const prefixField = form.get('prefix');
        if (typeof prefixField === 'string' && prefixField) {
          requestedPrefix = prefixField;
        }
        // FormDataEntryValue 는 string | File. string 이면 파일 누락으로 간주.
        if (file == null || typeof file === 'string') {
          return json({ error: 'Missing file field' }, 400, cors);
        }
        bytes = await file.arrayBuffer();
        declaredType = file.type;
      } else {
        // raw 바이너리: content-type 으로 타입 판별, prefix 는 쿼리스트링에서.
        const qp = url.searchParams.get('prefix');
        if (qp) requestedPrefix = qp;
        bytes = await request.arrayBuffer();
        declaredType = contentType;
      }
    } catch {
      return json({ error: 'Invalid request body' }, 400, cors);
    }

    // ── F3: 타입 검증 (415) ─────────────────────────────────────
    const normalizedType = declaredType.split(';')[0].trim().toLowerCase();
    const ext = ALLOWED_CONTENT_TYPES[normalizedType];
    if (!ext) {
      return json(
        { error: `Unsupported media type: ${normalizedType || 'unknown'}` },
        415,
        cors,
      );
    }

    // ── F3: 크기 검증 (413) — 실제 본문 바이트 기준 ─────────────
    if (bytes.byteLength === 0) {
      return json({ error: 'Empty body' }, 400, cors);
    }
    if (bytes.byteLength > MAX_UPLOAD_BYTES) {
      return json(
        { error: `Payload too large: ${bytes.byteLength} > ${MAX_UPLOAD_BYTES}` },
        413,
        cors,
      );
    }

    // ── F4: 키 생성 (검증된 content-type 기반 확장자) ───────────
    const key = buildObjectKey(requestedPrefix, ext);

    // ── R2 저장 (바인딩) ────────────────────────────────────────
    try {
      await env.BUCKET.put(key, bytes, {
        httpMetadata: {
          contentType: normalizedType,
          // 조회는 img.momozzang.com 커스텀 도메인(긴 TTL Cache Rule)을 거치므로
          // 객체 자체에도 장기 캐시 힌트를 남긴다(기존 Supabase cacheControl 31536000 계승).
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
    } catch (e) {
      return json(
        { error: 'Storage error', detail: e instanceof Error ? e.message : String(e) },
        500,
        cors,
      );
    }

    // ── 성공: 키 + content-type 응답 ────────────────────────────
    return json({ key, contentType: normalizedType }, 200, cors);
  },
};
