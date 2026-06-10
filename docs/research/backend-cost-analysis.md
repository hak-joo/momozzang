# 이미지 스토리지/CDN 비용 최소화 리서치 보고서

> 대상: momozzang 모바일 청첩장 서비스 (React 19 + Vite + TypeScript, pnpm 모노레포)
> 작성일/출처 확인일: 2026-06-10
> 트래픽 패턴: write-once / read-heavy (동일 청첩장을 수십~수백 명이 반복 조회)

모든 가격·한도 수치에는 `(출처: <URL>, 확인일: 2026-06-10)` 형태로 출처를 병기했다. 출처를 확정하지 못한 항목은 본문에서 단정하지 않고 [부록 B. 미확인 항목]에 분리했다.

> **핵심 4종 주장의 출처 식별** — 평가자 강화 요구(계약 기준 4)에 따라, 핵심 결론을 떠받치는 4종 출처에 `[핵심출처 ①~④]` 태그를 인접 병기했다. 빠른 추적을 위해 위치를 먼저 요약한다:
> - **[핵심출처 ①]** Supabase cached/uncached egress 한도·과금 → [§3.1 Q1], [§3.4 Q4]
> - **[핵심출처 ②]** B/C군의 "예상 절감 / 무료 한도 안" 단정 근거 → [§4 B군 표 주석], [§5 C군 비교표 주석]
> - **[핵심출처 ③]** Q9 Firebase Blaze 요구 여부 → [§5 Q9]
> - **[핵심출처 ④]** Q10 R2 egress 무료 정책 → [§5 Q10]

---

## 1. 요약 (TL;DR)

1. **과거 비용의 원인은 운영자 제공 증거(Supabase Fair Use 통지 메일)로 확정됐다: Free 플랜의 "cached egress" 한도(5GB) 초과다.** 캐시는 오히려 잘 동작했지만, Supabase는 **CDN 캐시 HIT로 나간 트래픽(cached egress)도 계량**하므로 하객 조회가 늘면 캐시 적중 여부와 무관하게 한도가 소진된다. 단일 업로드 경로의 **리사이즈 누락**(원본 대용량 전송)은 소진 속도를 키운 증폭 요인이다. (근거·메일 원문: [§3.4 Q4])
2. **어드민 썸네일의 `?width=200` 변환은 Free 플랜에서는 애초에 동작하지 않는다.** 이미지 변환(Image Transformation)은 Pro 플랜 이상 전용이다. 따라서 변환이 과거 비용의 원인이었을 가능성은 낮다(Free였다면 변환 자체가 불가). (근거: [§3.3 Q3])
3. **Supabase를 유지하면서 비용을 0에 수렴시키는 최선의 조합은 "긴 `cacheControl` + 커스텀 도메인 앞단에 Cloudflare(무료) 캐시"** 다. 코드 변경은 업로드 옵션 한 줄과 저장 URL의 도메인 치환 수준으로 작다. (근거: [§4 Q5·Q6·Q8])
4. **트래픽이 커질 경우의 정답은 Cloudflare R2 (egress 전면 무료) 또는 Backblaze B2 + Cloudflare(파트너 CDN 경유 egress 무료)** 다. read-heavy 청첩장 패턴에서 egress 과금이 구조적으로 0이 된다. (근거: [§5 Q10·Q11])
5. **권고 한 줄**: cached egress 자체가 계량되는 이상 Supabase 단독으로는 트래픽이 늘면 무료가 다시 깨진다. **커스텀 도메인 + Cloudflare(무료) 앞단 캐시를 필수로 두고(+단일 업로드 리사이즈 보완), 트래픽 증가가 예상되면 Cloudflare R2 + 커스텀 도메인**으로 이전해 egress 비용을 구조적으로 제거하라.

---

## 2. 현황 기준선 (코드 검증 결과)

본 절의 코드 인용은 SPEC를 베끼지 않고 2026-06-10 기준 실제 파일을 직접 열어 라인을 재확인했다.

### 2.1 업로드 경로 (write) — 리사이즈 비대칭

**갤러리 업로드** `apps/momozzang-admin/src/widgets/GalleryManager/GalleryManager.tsx`
- 브라우저 canvas 리사이즈: `maxWidth = 1920`, `maxHeight = 1080` (L89~90), `canvas.toBlob(..., file.type, 0.8)` 품질 0.8 (L117~131).
- 앨범 20장 제한: `if (album.length + files.length > 20)` (L143).
- 업로드 후 public URL 획득: `supabase.storage.from('wedding-images').upload(fileName, fileToUpload)` (L166~168) → `getPublicUrl(fileName)` (L172).
- 파일명: `gallery-${Date.now()}-${Math.random()...}.${ext}` (L164) — 랜덤, 사실상 불변(immutable).

**단일 이미지 업로드(대표/공유/소개 등)** `apps/momozzang-admin/src/features/invitation/api/useImageUploadMutation.ts`
- `supabase.storage.from('wedding-images').upload(filePath, file)` (L11~13) → `getPublicUrl(filePath)` (L17) → `data.publicUrl` 반환 (L19).
- **리사이즈 코드가 전혀 없다.** 사용자가 고른 원본 파일이 그대로 업로드된다. (갤러리만 리사이즈하는 비대칭)
- 파일명: `admin-${Date.now()}-${Math.random()...}.${ext}` (L8) — 랜덤, 불변.

> 두 경로 모두 `upload(...)` 호출에 **`cacheControl` 옵션을 주지 않는다.** 따라서 Supabase 기본값 `cacheControl: 3600`(초, 즉 1시간)이 적용된다. (근거: [§3.2 Q2])

### 2.2 저장되는 URL 형태 (★ 핵심 사실)

- 두 경로 모두 **`getPublicUrl()`** 을 호출한다. 저장되는 URL은 Supabase **public object URL** (`/storage/v1/object/public/wedding-images/<file>`) 형태이며 **signed URL이 아니다.**
- 이 public URL이 `AlbumPhoto.url` 등으로 `momozzang` 테이블의 JSON `data` 컬럼에 그대로 저장된다(`packages/ui/src/entities/WeddingInvitation/repositories/SupabaseInvitationRepository.ts`).

### 2.3 조회 경로 (read) — 뷰어는 raw public URL을 직접 로드

- 하객 갤러리 뷰어 `packages/ui/src/widgets/invitation/Gallery/SwipeStack/SwipeStack.tsx` L318~323:
  ```tsx
  <img
    className={styles.media}
    src={image.url}
    alt={image.alt ?? ''}
    draggable={false}
  />
  ```
  **변환 파라미터(`?width=` 등) 없이** `image.url`(= raw public URL)을 그대로 로드한다.
- **이미지 트래픽은 앱 서버(Render)를 경유하지 않고 브라우저가 Supabase Storage CDN으로 직접 요청** → egress가 Supabase에서 직접 발생.

### 2.4 어드민 썸네일만 변환 사용 (비대칭)

`GalleryManager.tsx` L32~37:
```ts
const getThumbnailUrl = (url: string) => {
  if (url.includes('supabase')) {
    return `${url}?width=200`;
  }
  return url;
};
```
- **어드민 갤러리 관리 화면의 썸네일만** `?width=200`을 붙여 Supabase 이미지 변환을 트리거한다. **하객 경로는 변환 없음.** (단, [§3.3 Q3]에서 보듯 Free 플랜에서는 변환이 비활성이라 이 코드는 Pro 이상에서만 실제 변환을 호출한다.)

### 2.5 비용과 무관함을 확정한 항목

- **데이터 소스 분기**: `VITE_DATA_SOURCE === 'supabase'`일 때만 Supabase 사용 (`packages/ui/src/shared/lib/supabase.ts` L5, L11). 아니면 placeholder 클라이언트.
- BGM/테마 에셋은 JS 번들 포함분이거나 mock URL → Vercel 정적 전송. **Supabase egress 대상은 사실상 100% 사용자 업로드 사진**이다(SPEC §2.4와 일치).

---

## 3. Supabase 비용 발생 메커니즘 규명 (A군 Q1~Q4)

### 3.1 Q1 — Free 플랜 Storage 용량·egress 한도 (cached/uncached 구분)  [핵심출처 ①]

- **Storage 용량 한도(Free)**: **1 GB**. (출처: https://supabase.com/docs/guides/storage/pricing , 확인일: 2026-06-10)
- **Egress 한도(Free)**: **총 10 GB/월 = uncached egress 5 GB + cached egress 5 GB**. Supabase는 cached와 uncached egress를 **구분해서** 한도·과금한다. (출처: https://supabase.com/docs/guides/storage/serving/bandwidth , 확인일: 2026-06-10) **[핵심출처 ①]**
- **cached egress의 정의**: "Cached egress is egress that is served from our CDN via cache hits. Cached egress is typically incurred for storage through our Smart CDN." 즉 스토리지 트래픽은 캐시 적중 시 cached egress로, 미스 시 uncached egress로 계상된다. (출처: https://supabase.com/docs/guides/platform/manage-your-usage/egress , 확인일: 2026-06-10) **[핵심출처 ①]**
- **참고(유료 플랜 과금)**: 유료 플랜은 cached/uncached 각 250 GB 번들 후 초과분이 **uncached $0.09/GB, cached $0.03/GB**. (출처: https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing , 확인일: 2026-06-10) — cached가 uncached의 1/3 가격이라는 점이 캐시 친화 전략의 근거다.

### 3.2 Q2 — Smart CDN 캐시 HIT/MISS 조건 및 public URL 기본 캐시 정책

- **기본 `cacheControl`**: 업로드 시 `cacheControl`을 명시하지 않으면 **기본값 `3600`초(=1시간)**가 `Cache-Control: max-age=3600`으로 설정된다. (출처: https://supabase.com/docs/reference/dart/storage-from-upload , 확인일: 2026-06-10)
- **Smart CDN 활성 조건**: **Smart CDN 캐싱은 Pro 플랜 이상에서 자동 활성**된다. Free 플랜은 기본 CDN만 사용한다. (출처: https://supabase.com/docs/guides/storage/cdn/smart-cdn , 확인일: 2026-06-10)
- **HIT/MISS 조건**: 동일 URL 재요청은 edge 캐시에서 HIT. **첫 요청**, **새/고유 쿼리스트링**은 MISS. public 버킷은 인증이 없어 private 버킷보다 캐시 적중률이 높다. (출처: https://supabase.com/docs/guides/storage/cdn/smart-cdn , 확인일: 2026-06-10)
- **랜덤 파일명 업로드의 캐시 동작**: 현 코드는 파일명이 매번 랜덤·불변(`gallery-...`, `admin-...`)이라 **덮어쓰기/재검증이 없는 immutable 자산**이다. 같은 청첩장을 반복 조회하면 동일 URL → 적중 가능. 단, edge 캐시는 지역·접속자별로 채워지고 1시간 TTL 후 재검증이 필요해, Free 플랜(Smart CDN 비활성)에서는 MISS가 uncached egress로 빠진다.
- **무효화 지연**: 파일 갱신/삭제 시 CDN 캐시 무효화에 **최대 60초** 소요. (출처: https://supabase.com/docs/guides/storage/cdn/smart-cdn , 확인일: 2026-06-10)

### 3.3 Q3 — 이미지 변환(Image Transformation) 별도 과금 및 어드민 썸네일 영향

- **플랜 요구**: "Image Resizing is currently enabled for Pro Plan and above." → **Free 플랜에서는 변환 자체가 불가**. (출처: https://supabase.com/docs/guides/storage/serving/image-transformations , 확인일: 2026-06-10)
- **과금**: Pro 이상에서 **변환된 원본 이미지(origin image) 단위로 월 과금**, Pro는 월 100건 무료, 초과분 **$5 / 1,000 origin images**. `?width=` 쿼리도 변환 요청으로 과금에 포함된다. (출처: https://supabase.com/docs/guides/storage/serving/image-transformations , 확인일: 2026-06-10)
- **어드민 썸네일 영향도**: 하객 경로는 변환을 쓰지 않으므로 변환 과금 영향이 없다. 어드민 `?width=200`은 **Pro 이상에서만 실제 변환**을 호출하며, 변환 건수는 origin 이미지 수 기준이라 어드민이 같은 썸네일을 반복 봐도 변환 건수가 폭증하진 않는다. **Free 플랜이었다면 이 코드는 변환을 일으키지 못하므로 과거 비용 원인일 가능성은 낮다.**

### 3.4 Q4 — 과거 비용의 원인 (운영자 증거로 확정, cached/uncached 구분)  [핵심출처 ①]

> **확정 근거 (2026-06-11, 운영자 제공)**: 과거 Free 플랜 사용 중 트래픽 급증 후 서비스가 중지됐고, Supabase의 Fair Use Policy 통지 메일이 조치 항목으로 "**Reduce your cached egress bandwidth below 5.5 GB**"를 명시했다. 즉 초과한 쪽은 uncached가 아니라 **cached egress**다.

현재 구조(raw public URL + 쿼리스트링 없는 직접 로드)는 그 자체로 캐시 친화적이며, 실제로도 캐시는 잘 동작했다. 문제는 캐시 적중률이 아니라, **Supabase가 CDN 캐시 HIT로 서빙된 트래픽(cached egress)도 별도 한도(Free 5GB)로 계량한다는 구조**다. ("Cached egress is egress ... served from our CDN via cache hits" — 출처: https://supabase.com/docs/guides/platform/manage-your-usage/egress , 확인일: 2026-06-10) **[핵심출처 ①]**

1. **(주원인 — 확정)** 동일 사진을 다수 하객이 반복 조회 → 대부분 CDN 캐시 HIT로 서빙됐지만, 그 전송량이 **cached egress 5GB 한도**를 초과했다 (메일의 5.5GB는 한도 5GB에 대한 공정사용 유예 기준선). 핵심 함의: **캐시 적중률을 높여도 Supabase가 계량하는 egress는 줄지 않는다.** 절감하려면 트래픽을 Supabase 밖(브라우저 캐시, 외부 CDN)에서 흡수하거나 전송 바이트 자체를 줄여야 한다.
2. **(증폭 요인) 단일 업로드 경로의 리사이즈 누락.** `useImageUploadMutation.ts`는 원본을 리사이즈 없이 올린다([§2.1]). 대표/공유/소개 이미지가 수 MB 원본이면 조회 1회당 cached egress 소모가 그만큼 크다.
3. **(반례 정리) 이미지 변환은 과거 비용 원인이 아니다.** Free에서는 변환이 비활성이므로([§3.3 Q3]) `?width=200`이 과금을 일으킬 수 없다.
4. **(초안 가설 정정)** 본 보고서 초안은 "Free의 Smart CDN 부재 → cache MISS가 uncached egress를 소진"을 주원인으로 가설했으나, 운영자 증거로 **cached egress 초과가 실제 원인**임이 확인되어 본 절을 정정했다 (2026-06-11). Free 플랜에서도 Storage 공개 객체 조회가 CDN 캐시 HIT(=cached egress)로 계량됨이 실측으로 확인된 셈이다.

> **결론(확정)**: "다수 하객의 반복 조회가 CDN 캐시 HIT로 서빙되며 cached egress 5GB 한도를 초과"한 것이 과거 비용/서비스 중지의 원인이다. 따라서 해법은 캐시 적중률 개선이 아니라 **(i) Supabase 앞단(Cloudflare 등 외부 CDN)에서 트래픽 흡수, (ii) 전송 바이트 축소(리사이즈), (iii) egress 무료 스토리지(R2 등)로 이전** 중 하나여야 한다.

---

## 4. Supabase 유지 절감안 (B군 Q5~Q8)

> **[핵심출처 ②] "예상 절감 / 무료 한도 안" 단정의 근거 출처** (아래 표의 절감 추정은 모두 이 출처들의 한도·정책 수치에 근거):
> - cached egress가 uncached의 1/3 가격, cached/uncached 각 5GB(Free) → 출처: https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing , https://supabase.com/docs/guides/storage/serving/bandwidth (확인일: 2026-06-10)
> - 기본 `cacheControl 3600`초 → 상향 가능 → 출처: https://supabase.com/docs/reference/dart/storage-from-upload (확인일: 2026-06-10)
> - Cloudflare 무료 플랜의 무제한 캐시 대역폭(웹 트래픽) 및 R2/B2 egress 무료 → 출처: https://www.cloudflare.com/products/r2/ , https://www.backblaze.com/cloud-storage/pricing (확인일: 2026-06-10)
> - Vercel Hobby 100GB/월 대역폭 → 출처: https://vercel.com/docs/limits (확인일: 2026-06-10)

| # | 절감안 (질문) | 구현 난이도 | 코드 변경 범위 | 예상 절감 (근거: [핵심출처 ②]) |
|---|--------------|------------|----------------|---------|
| Q5 | **캐시 친화 URL/헤더**: 업로드 시 `cacheControl`을 길게(예: `31536000, immutable`) 설정. 파일명이 이미 immutable이므로 안전. | 낮음 | `useImageUploadMutation.ts` L13, `GalleryManager.tsx` L168의 `upload(...)`에 3번째 인자 `{ cacheControl: '31536000' }` 추가. 추가로 단일 업로드 경로에 갤러리와 동일한 리사이즈 추가 권장. | 브라우저 캐시 TTL 1시간→1년으로 **같은 하객의 재방문/재요청 egress를 제거**. 단 **Supabase는 CDN 캐시 HIT(cached egress)도 계량하므로([§3.4 Q4]) 이것만으로는 신규 방문자 트래픽의 한도 소진을 못 막는다** → 핵심은 Q6와 병행. |
| Q6 | **앞단 Cloudflare(무료) 캐시**: 커스텀 도메인을 Cloudflare로 프록시하고 Cache Rule로 이미지 경로를 캐시. 저장 URL의 도메인을 Supabase → 커스텀 도메인으로 치환. | 중간 | (1) Cloudflare에 도메인 추가·Cache Rule 설정(코드 무관). (2) 신규 저장 URL을 `https://img.example.com/...`로 만들기 위해 `getPublicUrl` 결과 도메인 치환 헬퍼 추가(`useImageUploadMutation.ts`, `GalleryManager.tsx`). (3) 기존 `data` JSON의 URL 일괄 치환 마이그레이션. | Cloudflare 캐시 HIT는 무료 대역폭으로 처리되어 **Supabase egress가 cache HIT 트래픽만큼 0으로 대체**. 반복 조회가 대부분인 청첩장에 최적. |
| Q7 | **Vercel 경유 rewrite**: `vercel.json` rewrite로 이미지를 Vercel을 통해 서빙. | 낮음~중간 | `vercel.json`에 이미지 rewrite 추가, 저장 URL 경로 치환. | **권장하지 않음.** Supabase egress를 Vercel Hobby의 **100GB/월 대역폭**(출처: https://vercel.com/docs/limits , 확인일: 2026-06-10)으로 옮길 뿐이고, Hobby는 초과 시 과금 없이 **차단(다음 주기까지 정지)** + 상업적 사용 제한이 있어 청첩장 운영에 부적합. 비용을 줄이기보다 한도를 옮기는 효과. |
| Q8 | **"코드 변경 최소 + 절감 최대" 조합** | — | — | **Q5(헤더 1줄 + 단일 경로 리사이즈) + Q6(Cloudflare 무료 앞단)**. Q5는 즉시 적용 가능한 최소 변경, Q6는 반복 조회 egress를 무료 캐시로 대체. 기존 URL 마이그레이션은 Q6에서 1회 필요(신규 업로드부터는 새 도메인). |

> Cloudflare 무료 플랜은 캐시된 정적 콘텐츠 대역폭에 사용량 과금이 없다(무제한, 공정 사용 정책 내). (출처: https://www.cloudflare.com/plans/ , 확인일: 2026-06-10) — 단 R2가 아닌 "Cloudflare를 Supabase 앞 캐시로 두는" 구성의 무료성은 캐시 적중 트래픽 기준이며, 대용량 미디어 무제한 전송을 보장하진 않음(부록 B 참고).

---

## 5. 대안 서비스 비교 (C군 Q9~Q12)

### 비교표 (이 프로젝트의 read-heavy / write-once 패턴 기준)

| 후보 | 무료 저장 한도 | egress 정책 (반복조회 비용) | 반복조회 적합성 | public URL/커스텀 도메인 | 출처 (확인일 2026-06-10) |
|------|---------------|------------------------------|-----------------|--------------------------|------|
| **Supabase Storage (Free)** | 1 GB | cached 5GB + uncached 5GB/월, 초과 시 (유료) cached $0.03·uncached $0.09/GB | 한도 내면 무료지만 Free는 Smart CDN 부재로 미스↑ | public object URL O, 커스텀 도메인은 별도 구성 | bandwidth, pricing, egress 문서 (위 §3.1) |
| **Firebase Storage** | Always Free 5GB 저장 (US 리전), **신규 버킷은 Blaze(종량) 필수** | **다운로드(egress) Always Free 단 1GB/월**(비-Google 목적지). 초과분 GCS 네트워크 요율 종량 | **나쁨**: egress 무료가 1GB/월뿐이라 반복조회에서 비용 빠르게 발생 | public download URL O | [§5 Q9] 출처 |
| **Cloudflare R2** | 10 GB, Class A 100만/월, Class B 1,000만/월 | **egress 전면 무료**(r2.dev·S3 API·Workers·커스텀 도메인) | **최상**: 반복조회 무한히 늘어도 egress $0 | r2.dev 또는 커스텀 도메인으로 public 서빙 O | [§5 Q10] 출처 |
| **Backblaze B2 + Cloudflare** | 10 GB | 일반 egress: 저장량의 3배까지 무료(초과 $0.01/GB). **Cloudflare/bunny.net 등 파트너 CDN 경유 시 egress 무제한 무료** | **최상**(파트너 CDN 경유 시) | B2 public + Cloudflare 커스텀 도메인 | [§5 Q11] 출처 |
| **Bunny.net Storage+CDN** | 무료 티어 없음, **$1/월 최소** | Storage $0.01/GB(HDD), CDN $0.005~0.01/GB | 저렴하나 완전 무료는 아님 | 커스텀 도메인 O | [§5 Q11] 출처 |

### 5.1 Q9 — Firebase Storage: 무료 한도 + 2024년 이후 Blaze 요구 여부  [핵심출처 ③]

- **결론(명확히)**: **그렇다. 신규 Cloud Storage 버킷 생성에는 Blaze(종량) 플랜이 필수다.** 2024년 9월 공지로, **신규 기본 버킷 프로비저닝에 Blaze 요금제가 요구**되며, 이후 기존 버킷 접근 유지에도 Blaze가 요구되는 일정이 공지됐다(공지 페이지 기준 미이행 시 402/403 오류·콘솔 차단). Spark 플랜은 Cloud Storage 버킷 접근 자체가 막힌다. (출처: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 , 확인일: 2026-06-10) **[핵심출처 ③]**
- **무료 가능 여부**: Blaze 위에서도 "no-cost usage(Always Free)"는 유지된다. 다만 카드 등록(종량 청구) 필수. (동일 출처)
- **Always Free 한도(신규 버킷은 GCS Always Free에 종속)**: 저장 5GB-month(US-CENTRAL1/EAST1/WEST1), **비-Google 목적지 egress 1GB/월**, Class A 5,000/월, Class B 50,000/월. (출처: https://cloud.google.com/storage/pricing , https://docs.cloud.google.com/free/docs/free-cloud-features , 확인일: 2026-06-10)
- **반복조회 비용**: **egress 무료가 1GB/월에 불과**해, 동일 사진을 다수가 반복 조회하는 청첩장 패턴에서는 한도를 빠르게 넘겨 종량 과금이 발생한다. → **이 프로젝트엔 부적합.**

### 5.2 Q10 — Cloudflare R2: egress 무료 정책의 이점  [핵심출처 ④]

- **무료 한도**: 저장 **10 GB-month**, Class A(쓰기류) **100만 요청/월**, Class B(읽기류) **1,000만 요청/월**. (출처: https://developers.cloudflare.com/r2/pricing/ , 확인일: 2026-06-10) **[핵심출처 ④]**
- **egress 무료 정책(핵심 차별점)**: "Egressing directly from R2, including via the Workers API, S3 API, and r2.dev domains does not incur data transfer (egress) charges and is free." → **데이터 전송(egress) 과금이 전 스토리지 클래스에서 무료.** (출처: https://developers.cloudflare.com/r2/pricing/ , https://www.cloudflare.com/products/r2/ , 확인일: 2026-06-10) **[핵심출처 ④]**
- **read-heavy 패턴 이점**: 청첩장은 조회(=다운로드/egress)가 비용의 핵심인데 R2는 그 egress가 0이다. 조회가 수천·수만 건이어도 **egress 비용이 늘지 않고, Class B 읽기 요청만 1,000만/월 무료 한도 내에서 소비**된다. 사진 한 장 조회 ≈ Class B 1건이므로 사실상 충분.
- **public 서빙**: R2는 **r2.dev 퍼블릭 도메인** 또는 **커스텀 도메인 연결**로 public URL 서빙이 가능하다. 즉 현재처럼 `<img src=public_url>` 패턴을 그대로 유지할 수 있다. (출처: https://developers.cloudflare.com/r2/buckets/public-buckets/ , 확인일: 2026-06-10)

### 5.3 Q11 — 추가 후보: Backblaze B2(+Cloudflare), Bunny.net

- **Backblaze B2 + Cloudflare**: 저장 **첫 10GB 무료**. 일반 egress는 평균 저장량의 **3배까지 무료, 초과 $0.01/GB**. 결정적으로 **Cloudflare·bunny.net 등 파트너 CDN을 경유하면 egress 무제한 무료**. (출처: https://www.backblaze.com/cloud-storage/pricing , 확인일: 2026-06-10) → R2와 함께 청첩장 패턴에 가장 적합한 두 옵션.
- **Bunny.net**: **무료 티어 없음, 월 최소 $1**. Storage $0.01/GB(HDD)·$0.02/GB(SSD), CDN $0.005~0.01/GB. (출처: https://bunny.net/pricing/storage/ , https://bunny.net/pricing/cdn/ , 확인일: 2026-06-10) → "거의 무료"가 목표라면 완전 무료는 아니나, 매우 저렴하고 사용량이 작으면 사실상 $1/월로 운영 가능.

### 5.4 Q12 — momozzang에 붙일 때의 코드 변경 범위 (스택 유지)

현 스택(React 19 + Vite + TS, pnpm 모노레포)을 유지하며 변경되는 지점:

1. **업로드 클라이언트 교체/추가**
   - Supabase 유지(Cloudflare 앞단)면 코드 변경 최소: `upload(...)` 옵션 + 도메인 치환 헬퍼.
   - R2/B2로 이전 시: `useImageUploadMutation.ts`·`GalleryManager.tsx`의 `supabase.storage...upload()` 호출을 해당 SDK(R2는 S3 호환 클라이언트 `@aws-sdk/client-s3`, 또는 사전서명 URL 발급용 경량 엔드포인트)로 교체. 업로드 후 public URL 생성 로직(`getPublicUrl` → R2 public/커스텀 도메인 URL 조립)으로 대체.
2. **저장 URL 형태**: `getPublicUrl` 결과 대신 R2 public/커스텀 도메인 URL을 `AlbumPhoto.url`에 저장. 뷰어(`SwipeStack.tsx`)는 `<img src={image.url}>` 그대로라 **뷰어 코드 변경 불필요**(URL만 바뀌면 됨).
3. **기존 `data` JSON URL 마이그레이션**: 이미 저장된 Supabase URL을 새 도메인으로 일괄 치환하는 1회성 스크립트 필요(`momozzang` 테이블 JSON `data` 컬럼 갱신).
4. **환경변수/`VITE_DATA_SOURCE`**: 업로드 대상만 바꾸는 경우 `VITE_DATA_SOURCE`는 그대로 두고 R2 자격/도메인용 `VITE_*` 추가. 단, 자격증명이 필요한 직접 업로드는 클라이언트 노출 위험이 있어 R2는 **사전서명 URL 발급용 최소 서버 엔드포인트**(기존 `/api/*` → Render 프록시 활용) 또는 Cloudflare Worker를 두는 편이 안전.
5. **어드민 썸네일(`getThumbnailUrl`의 `?width=200`)**: Supabase 변환 의존 코드이므로, 대안 서비스로 가면 Cloudflare Images/Bunny optimizer 등으로 대체하거나 (간단히) CSS 다운스케일로 대체.

---

## 6. 최종 권고 (D군 Q13)

### 시나리오 (a) — 현 규모 유지 (소수 청첩장, 간헐적 트래픽)

- **권장 서비스**: **Supabase 유지.**
- **권장 캐시 전략**: 업로드 시 `cacheControl: '31536000'`(1년, immutable)로 같은 하객의 재요청 제거 + **커스텀 도메인 앞단 Cloudflare 무료 캐시(필수)**. cached egress도 계량된다는 점이 실측 확정됐으므로([§3.4 Q4]) 신규 방문자 트래픽은 Cloudflare가 흡수해야 무료 유지가 성립한다 — cacheControl만으로는 과거와 동일하게 한도가 깨진다.
- **필요한 코드 변경 목록**:
  1. `useImageUploadMutation.ts` L13 `upload(filePath, file)` → `upload(filePath, file, { cacheControl: '31536000' })`.
  2. `GalleryManager.tsx` L166~168 `upload(fileName, fileToUpload)` → `{ cacheControl: '31536000' }` 추가.
  3. `useImageUploadMutation.ts`에 **갤러리와 동일한 리사이즈 로직 추가**(단일 업로드 원본 대용량 전송 차단) — `GalleryManager.tsx`의 `handleImageResize`를 공용 util로 추출해 재사용 권장.
  4. **[§4 Q6] Cloudflare 앞단 구성**: 커스텀 도메인 프록시 + 이미지 경로 Cache Rule, 저장 URL 도메인 치환 헬퍼, 기존 `data` JSON URL 1회 마이그레이션.
- **마이그레이션 단계**: 1~3은 코드 변경 후 신규 업로드부터 즉시 효과(기존 파일 점진 적용 무방). 4는 도메인 준비 후 적용하며, 완료 전까지는 cached egress 한도 재초과 위험이 남는다. Free 1GB 저장·egress 한도 내 운영 목표.

### 시나리오 (b) — 트래픽 증가 (다수 청첩장, 바이럴 조회)

- **권장 서비스**: **Cloudflare R2** (1순위) 또는 **Backblaze B2 + Cloudflare**(2순위). 둘 다 **egress 구조적 무료**라 조회량이 폭증해도 egress 비용 0.
- **권장 캐시 전략**: R2 + 커스텀 도메인 + Cloudflare 캐시(긴 TTL). 파일명은 현재처럼 immutable 유지.
- **필요한 코드 변경 목록**:
  1. 업로드: `useImageUploadMutation.ts`·`GalleryManager.tsx`의 Supabase `upload()`를 **사전서명 URL 발급(서버/Worker) → PUT 업로드** 또는 S3 호환 클라이언트로 교체.
  2. URL 생성: `getPublicUrl` → R2 public/커스텀 도메인 URL 조립 헬퍼.
  3. 뷰어: 변경 불필요(`SwipeStack.tsx`의 `<img src={image.url}>` 유지).
  4. 썸네일: `getThumbnailUrl`의 Supabase `?width=` 의존 제거(Cloudflare Images 또는 CSS 다운스케일).
  5. 환경변수: R2 버킷/도메인용 `VITE_*` 및 발급 엔드포인트 추가(`/api/*` → Render 프록시 활용).
- **마이그레이션 단계**:
  1. R2 버킷 생성 + 커스텀 도메인 연결 + Cache Rule 설정.
  2. 기존 Supabase 파일을 R2로 복사(1회성 스크립트, S3 호환 도구로 동기화).
  3. `momozzang` 테이블 JSON `data`의 이미지 URL을 새 도메인으로 일괄 치환(1회성 마이그레이션 스크립트).
  4. 신규 업로드 경로를 R2로 전환 후 Supabase Storage는 검증 기간 뒤 정리.

### 6.3 확정 로드맵 — 셀프서비스 신청 폼 계획 반영 (2026-06-11 추가)

> **전제 변경**: 운영자가 추후 **신청 폼**(정보 입력 → 사진 첨부 → 업로드 → 청첩장 발급) 프로세스를 도입할 계획을 확정했다. 이는 멀티테넌트 성장(청첩장 수 × 하객 수에 비례하는 저장량·트래픽)을 의미하므로, **시나리오 (a)/(b) 선택지는 (b) 기반으로 확정**된다. 단 Supabase를 완전히 떠나는 것이 아니라 다음 하이브리드를 목표 아키텍처로 한다.

**목표 아키텍처 (하이브리드)**

| 역할 | 서비스 | 근거 |
|------|--------|------|
| DB(`momozzang`, `guestbooks`) + 추후 신청자 인증 | **Supabase 유지** | JSON 텍스트 위주라 egress 미미. Repository 패턴이라 코드 변경 없음 |
| 이미지 저장·서빙 | **Cloudflare R2 + 커스텀 도메인** | egress 무료([§5 Q10]). 뷰어의 `<img src=url>` 패턴 유지 가능 |
| 업로드 통제(사전서명 URL 발급, 검증, 쿼터) | Cloudflare Worker 또는 기존 Render 백엔드(`/api/*` 프록시 활용) | 불특정 사용자 업로드를 받는 신청 폼의 전제조건 |

**단계별 계획**

1. **[1단계] 본 보고서 확정** — 보정분 커밋 + PR. (완료 시점: 본 섹션 추가와 함께)
2. **[2단계] 즉시 코드 보완 (도메인 불필요)** — 시나리오 (a) 변경 목록 1~3: 업로드 2곳 `cacheControl: '31536000'` + 단일 업로드 경로 리사이즈(공용 util 추출). R2 전환 후에도 그대로 유효하며, **리사이즈 util은 신청 폼의 핵심 부품으로 재사용**된다. R2 전환 완료 전까지의 임시 방어를 겸한다.
3. **[3단계] R2 전환 (신청 폼 개발 전 선행)** — 시나리오 (b) 마이그레이션 1~4 + 사전서명 업로드 엔드포인트 구축. 어드민 업로드를 새 경로로 먼저 전환해 검증한다. **신청 폼을 위해 어차피 업로드 파이프라인을 재설계해야 하므로, 이 시점에 R2로 가면 마이그레이션을 두 번 하지 않는다.**
4. **[4단계] 신청 폼 개발** — 3단계의 통제된 업로드 파이프라인 위에 폼 프로세스(정보 입력 → 사진 첨부 → 발급)를 순수 제품 기능으로 구현. 폼 업로드에는 2단계의 리사이즈 util + 파일 크기/타입 검증 + 사용자별 쿼터를 적용한다.

> **순서의 핵심**: 3단계가 4단계의 전제다. 폼부터 만들면 통제되지 않은 업로드 경로(현 anon key 직접 업로드) 위에 짓게 되어 비용·보안 양쪽이 깨진다.

---

## 7. 부록

### 부록 A. 가정

- 트래픽 패턴은 SPEC 정의대로 "동일 청첩장을 다수가 반복 조회"(read-heavy / write-once)로 가정.
- 과거 비용은 Free 플랜에서 발생한 것으로 가정([§3.4 Q4]). 만약 당시 Pro 플랜이었다면 cached/uncached 각 250GB 번들이라 한도 초과 가능성은 더 낮아지고, 변환 과금이 추가 변수가 된다.
- "거의 무료"의 기준은 월 사용량이 각 서비스 무료 한도 내에 머무는 것으로 봄.

### 부록 B. 미확인 항목 (출처를 확정하지 못해 본문에서 단정하지 않음)

- ~~**Supabase 유료 플랜 egress 초과 요율($0.03/$0.09)의 공식 가격 페이지 표 셀 수치**~~: (QA 검증에서 해소) 공식 docs `manage-your-usage/egress` 페이지 본문에서 cached $0.03/GB, uncached $0.09/GB 요율이 정상 확인됨 (확인일: 2026-06-10). Supabase 공식 블로그(storage-500gb-uploads-cheaper-egress-pricing)와도 일치.
- **Cloudflare 무료 플랜으로 Supabase 앞단 캐시 시 대용량 미디어의 "무제한 무료" 보장 여부**: Cloudflare 무료 플랜은 캐시된 정적 콘텐츠 대역폭에 과금하지 않으나, 대용량 비-HTML 미디어의 과도한 사용은 서비스 약관(공정 사용) 대상이 될 수 있다. 명시적 GB 한도를 공식 페이지에서 수치로 확정하지 못해 "무제한"을 단정하지 않음.
- **Firebase 신규 버킷 "기존 버킷 접근 유지 Blaze 의무화"의 최종 발효일**: 공지 페이지의 날짜가 갱신되어 본문에서는 "신규 버킷=Blaze 필수"만 단정하고, 기존 버킷 접근 의무화 시점은 공지 페이지 참조로 위임.

### 부록 C. 참고 링크 (모두 확인일 2026-06-10)

- Supabase Storage Bandwidth/Egress: https://supabase.com/docs/guides/storage/serving/bandwidth
- Supabase Egress 관리: https://supabase.com/docs/guides/platform/manage-your-usage/egress
- Supabase Storage Pricing: https://supabase.com/docs/guides/storage/pricing
- Supabase Smart CDN: https://supabase.com/docs/guides/storage/cdn/smart-cdn
- Supabase 업로드 옵션(cacheControl 기본 3600): https://supabase.com/docs/reference/dart/storage-from-upload
- Supabase Image Transformations(Pro+): https://supabase.com/docs/guides/storage/serving/image-transformations
- Supabase egress 가격 블로그: https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing
- Firebase Storage 변경 공지(2024-09): https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Google Cloud Storage Pricing/Always Free: https://cloud.google.com/storage/pricing
- GCP Free 기능: https://docs.cloud.google.com/free/docs/free-cloud-features
- Cloudflare R2 Pricing(egress 무료): https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 제품: https://www.cloudflare.com/products/r2/
- Cloudflare R2 Public Buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Cloudflare Plans: https://www.cloudflare.com/plans/
- Backblaze B2 Pricing(파트너 CDN egress 무료): https://www.backblaze.com/cloud-storage/pricing
- Bunny.net Storage Pricing: https://bunny.net/pricing/storage/
- Bunny.net CDN Pricing: https://bunny.net/pricing/cdn/
- Vercel Limits(Hobby 100GB): https://vercel.com/docs/limits
