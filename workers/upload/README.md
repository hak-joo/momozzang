# momozzang-upload Worker

어드민의 청첩장 이미지 업로드를 중개하는 Cloudflare Worker. 어드민 브라우저가 R2 Access Key/Secret 을
직접 다루지 않도록, Worker 가 **R2 바인딩**(`env.BUCKET.put()`)으로 객체를 저장하고 **키**를 응답한다.

```
어드민 브라우저 ──POST /upload (X-Upload-Token)──▶ Worker ──env.BUCKET.put()──▶ R2 (momozzang-images)
                                                          └─▶ { key, contentType } 응답
하객 조회: img.momozzang.com (R2 커스텀 도메인, Worker 미경유 순수 CDN)
```

## 엔드포인트

`POST /upload`

- 헤더: `X-Upload-Token: <공유비밀>` (필수)
- 본문: `multipart/form-data` (`file` 필드, 선택 `prefix` 필드) **또는** raw 바이너리(`Content-Type` 으로 타입 판별, `?prefix=` 쿼리)
- `prefix`: `admin` | `gallery` (그 외/누락 시 `admin`)

### 응답

| 상태 | 의미 |
|------|------|
| `200` | 저장 성공. `{ "key": "admin-...jpg", "contentType": "image/jpeg" }` |
| `400` | 본문 누락/파싱 실패/빈 본문 |
| `401` | `X-Upload-Token` 누락/불일치 |
| `403` | 비허용 Origin (CORS 화이트리스트 위반) |
| `413` | 본문 바이트가 상한(10MB) 초과 |
| `415` | 비허용 content-type (jpeg/png/webp/gif 만 허용) |
| `500` | R2 저장 실패 |

허용 타입·상한·키 prefix 는 `src/index.ts` 상단 상수(`ALLOWED_CONTENT_TYPES`, `MAX_UPLOAD_BYTES`, `ALLOWED_PREFIXES`)에서 한 곳으로 관리한다.

## 보안 등급 (중요)

| 자격증명 | 노출 여부 | 등급 |
|----------|-----------|------|
| **R2 Access Key/Secret** | **존재하지 않음** (R2 바인딩 사용) | — |
| `UPLOAD_TOKEN` (Worker 시크릿) | 브라우저 비노출 | 검증값 |
| `VITE_UPLOAD_TOKEN` (어드민 클라이언트) | **브라우저 노출**(Vite 번들 평문 치환) | anon-key 수준의 **약한 1차 방어** |

- `VITE_UPLOAD_TOKEN` 은 빌드 시 번들 JS 에 평문으로 박히므로, 정교한 공격자에게는 추출 가능하다.
  이는 R2 secret 같은 고위험 자격증명과 **동급이 아니다.** 피해는 (i) Worker 의 타입·크기 검증,
  (ii) 키 네임스페이스(`admin`/`gallery`)로 제한된다.
- **CORS Origin 화이트리스트 병행**: `DEFAULT_ALLOWED_ORIGINS`(어드민 도메인 + 로컬 dev) 외 Origin 의
  preflight/요청은 거부한다. 와일드카드(`*`)를 쓰지 않는다.
  - **한계**: Origin/Referer 는 브라우저-only 신뢰값이다. `curl` 등 비브라우저 요청은 Origin 헤더를
    임의로 붙이거나 생략할 수 있어 **우회 가능**하다. 따라서 Origin 검증은 토큰 검증을 **대체하지 않고**
    병행하는 1차 방어다(브라우저발 무단 업로드 차단 + 피해 표면 축소).
- 본격 인증(사용자/세션 기반)은 로드맵 4단계(신청 폼)에서 도입한다.

## 로컬 개발

```bash
cd workers/upload
pnpm install            # 또는 npm install (이 디렉토리는 pnpm 워크스페이스에 미포함)
cp .dev.vars.example .dev.vars   # UPLOAD_TOKEN 채우기 (커밋 금지)
pnpm dev                # wrangler dev — 로컬 R2 시뮬레이션
pnpm typecheck          # tsc --noEmit
pnpm dry-run            # wrangler deploy --dry-run (배포 없이 번들 검증)
```

> 이 디렉토리는 루트 `package.json` 의 workspaces(`apps/*`, `packages/*`)에 **포함되지 않는다.**
> 따라서 `pnpm -r build` / 루트 `pnpm install` 대상에서 자연 제외되어 앱 빌드와 분리된다.

## 배포 / 인계 체크리스트 (사용자 작업)

1. `wrangler login` → `wrangler deploy` 로 Worker 배포.
2. R2 바인딩 확인: `wrangler.toml` 의 `[[r2_buckets]]` binding=`BUCKET`, bucket_name=`momozzang-images`.
3. 공유비밀 주입: `wrangler secret put UPLOAD_TOKEN` (어드민 `VITE_UPLOAD_TOKEN` 과 동일 값).
4. 엔드포인트 도메인 결정:
   - 기본 `*.workers.dev` (배포만 하면 자동), 또는
   - 커스텀 `api.momozzang.com` (`wrangler.toml` 의 `routes` 주석 해제 + Cloudflare DNS zone 필요).
   - ⚠️ `momozzang.com/api/*` 는 금지 — `vercel.json` 의 `/api/:path*` → onrender 프록시와 충돌.
5. CORS 화이트리스트: 어드민 배포 도메인이 `DEFAULT_ALLOWED_ORIGINS`(`src/index.ts`)에 없으면 추가하거나,
   `ALLOWED_ORIGINS` var/secret 으로 쉼표 구분 주입.
6. R2 버킷 ↔ `img.momozzang.com` 커스텀 도메인 + Cache Rule(긴 TTL) 연결(조회 경로).
7. 어드민 각 환경(.env / Vercel)에 `VITE_IMAGE_BASE_URL`·`VITE_UPLOAD_ENDPOINT`·`VITE_UPLOAD_TOKEN` 설정.
8. 실 업로드 검증: 단일/갤러리 업로드 → R2 객체 생성 + 키 저장 → 청첩장 화면 `img.momozzang.com` 로드 확인.
9. 거부 케이스 검증: 잘못된/누락 토큰(401), 비허용 타입(415), 초과 크기(413) 가 실제 거부되는지 확인.
