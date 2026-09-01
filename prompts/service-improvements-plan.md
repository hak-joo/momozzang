# momozzang 서비스 개선 구현 계획 (뷰어·어드민 일괄)

> 작성: Claude Code (2026-08-31) | 수신: Gemini CLI (또는 임의의 구현 에이전트)
> 이 문서는 **자기완결**을 목표로 한다. 대화 컨텍스트 없이 이 문서와 저장소만으로 작업할 수 있어야 한다.
> 저장소 공통 규칙(구조·명령어·컨벤션)은 [`AGENTS.md`](../AGENTS.md) 가 정본이며, 이 문서와 충돌하면 AGENTS.md 가 우선한다.

---

## 0. 배경 — 이 계획이 나온 근거

두 앱(`apps/momozzang-invitation` 뷰어, `apps/momozzang-admin` 어드민)과 공유 패키지(`packages/ui`)를 정적 분석한 결과를 저장소 소유자가 검토하고 아래 범위를 확정했다. 분석의 핵심 발견:

1. **신청 폼은 입력받는데 뷰어가 렌더하지 않는 필드**가 다수 있다 (showDDay, 고인 표기, RSVP, 카카오페이, BGM). 이 중 소유자가 고른 것만 반영한다.
2. **OG 메타태그가 전무**해 카톡 링크 전달 시 썸네일·제목이 뜨지 않는다 (`apps/momozzang-invitation/index.html`).
3. **관리자는 텍스트 필드를 편집할 수 없다** — `/admin/edit`(`apps/momozzang-admin/src/pages/AdminPage.tsx`)는 이미지 5종 + 갤러리만 편집 가능하고 미리보기도 없다.
4. 실제 버그 5건과 UX 견고성 결함(lazy 로딩 0건, ErrorBoundary 부재, 미저장 이탈 경고 부재 등)이 확인됐다.

### 확정 범위 (소유자 결정)

| 구분 | 포함 | 명시적 제외 |
|---|---|---|
| 데이터 미반영 해소 | showDDay 토글 와이어링, 고인(故) 표기 렌더 | RSVP, 카카오페이, BGM |
| 신규 기능 | OG 메타태그, 캘린더 저장(ICS), 관리자 텍스트 편집 | 섹션 딥링크, 방명록 페이징, 화환 문구 설정화 |
| UX 개선 | 뷰어: 이미지 lazy 로딩 / MiniRoom ErrorBoundary / 방명록 저장 실패 피드백. 어드민: 미저장 이탈 경고 / `/admin/edit` 미리보기 / 형식 검증 / themeColor 4종 노출 | 핀치 줌 차단 해제, 인트로 스킵, 폰트 셀프호스팅 |
| 버그 | 5건 전부 (§PR1 참조) | — |
| 보안 | — | 전부 보류 (업로드 토큰·레이트리밋·방명록 비밀번호 등 손대지 않는다) |

### 계획에 영향을 준 기술 전제 (코드로 확인됨)

- **어드민은 `BrowserRouter` 사용 중** (`apps/momozzang-admin/src/App.tsx:40`). 이탈 경고에 쓸 `useBlocker`(react-router-dom 7)는 데이터 라우터 전용이므로 `createBrowserRouter` 마이그레이션이 선행돼야 한다.
- **뷰어 테마 팔레트는 PURPLE/PINK 2종만 실존** (`packages/ui/src/shared/styles/utils.ts` — `PALETTES`는 2종, GREEN/BLUE는 hue 값만 있고 "Deprecated" 주석, 그 외 값은 PURPLE 폴백). 모델 타입은 4종(`PURPLE|GREEN|PINK|BLUE`). 따라서 "themeColor 4종 노출"은 폼 수정만으로 안 되고 **뷰어 팔레트 2종 신설이 함께** 필요하다.

---

## 1. 작업 규칙 (전 PR 공통)

- 브랜치: PR 단위로 `feat/<슬러그>` 또는 `fix/<슬러그>` 하나. 커밋 메시지는 한글 혼용 `feat:`/`fix:` 접두어 (예: `fix(ui): 계좌 복사 시 하이픈 전체 제거`).
- 자가 점검: 매 PR에서 `pnpm build:invitation && pnpm build:admin`, `pnpm --filter momozzang-invitation lint`, `pnpm --filter momozzang-admin lint` 통과. (루트 통합 `pnpm test`/`pnpm lint` 는 **존재하지 않는다** — 호출하지 말 것.)
- 스타일: `*.module.css` + CSS 변수 토큰 + `@mixin typo-*`. 하드코딩 색/폰트 금지. [`docs/design-system.md`](../docs/design-system.md), [`docs/ui-conventions.md`](../docs/ui-conventions.md) 준수.
- FSD 레이어(`shared → entities → features → widgets → pages`) 역방향 import 금지. 별칭(`@momozzang/ui/*`, `@widgets/*` 등) 사용, 상대 경로 우회 금지.
- 비밀값(토큰·키·URL 값)을 코드/문서/커밋에 남기지 않는다.
- 진행 순서는 §2의 PR 번호 순서를 따른다. **PR1 의 `toHour24` 유틸을 PR6b 가, PR4 의 라우터 마이그레이션·dirty 추적을 PR5 가 의존한다.**

---

## 2. PR 분할과 상세 태스크

### PR 1 — `fix: 버그 일괄 수정 + 죽은 코드 정리` (소형)

| # | 작업 | 파일 | 방법 |
|---|---|---|---|
| 1-1 | 계좌 하이픈 복사 버그 | `packages/ui/src/widgets/invitation/Account/Account.tsx` | `accountNumber.replace('-', '')` 가 첫 하이픈만 제거한다. `replaceAll('-', '')` 로 교체 |
| 1-2 | 인트로 AM/PM 버그 | `packages/ui/src/widgets/invitation/Intro/Intro.tsx` | `Intro`가 `weddingHallInfo.ampm`을 읽지 않아 오후 예식이 오전으로 표시된다(코드 판독 기반 — 수정 전 오후 예식 데이터로 실행 재현 먼저 확인). **`toHour24(hour: number, ampm: 'AM'\|'PM'): number` 공유 유틸을 `packages/ui/src/shared/util/` 에 신설**하고 `Intro` · `WeddingCalendar` · `Summary` 가 모두 이 유틸을 쓰도록 통일 (현재 뒤 두 컴포넌트는 각자 올바르게 변환 중 — 로직을 유틸로 흡수). 이 유틸은 PR6b(ICS)가 재사용한다 |
| 1-3 | 승인 목록 colSpan 버그 | `apps/momozzang-admin/src/pages/ApprovalsPage/ApprovalsPage.tsx` | 펼침 미리보기 행이 `colSpan={6}` 인데 헤더는 8컬럼. `8` 로 정정 |
| 1-4 | 죽은 코드 정리 | `apps/momozzang-admin/src/features/invitation/api/useImageUploadMutation.ts`(import 0건 — 삭제), `packages/ui/src/widgets/invitation/IntroOverlay/`(import 0건 — 삭제), `apps/momozzang-admin/src/widgets/ApplyForm/ApplyForm.tsx` 의 `(이미지는 다음 스프린트)` 안내 문구(이미 구현됨 — 문구 삭제) | 삭제 전 각각 전역 grep 으로 참조 0건 재확인. **`packages/ui/src/widgets/invitation/Music/` 은 삭제하지 않는다** — BGM 은 "현재 제외"이지 폐기 결정이 아니다 |
| 1-5 | 문서 드리프트 정정 | `docs/admin-app.md` | 3곳: ① 저장 결과 알림이 `alert` 라는 서술 → 실제는 토스트(`AdminToastProvider`) ② "신랑·신부/예식일 컬럼은 별도 작업(T12)에서 되살립니다" → 이미 출시됨 ③ 이미지 업로드가 Supabase Storage `wedding-images` 버킷 + `handleImageResize` 라는 서술 → 실제는 Cloudflare Worker(`workers/upload`) + R2 + 지연 커밋(`usePendingImages.ts`) |

검증: 빌드+린트, 오후 예식 슬러그로 Intro 표기 실행 확인, 계좌 복사 결과 클립보드 확인.

### PR 2 — `feat(ui): 입력받은 데이터를 뷰어가 실제로 반영` (소형)

| # | 작업 | 방법 |
|---|---|---|
| 2-1 | `customization.showDDay` 와이어링 | 현재 `DdayBadge`(`packages/ui/src/shared/ui/DdayBadge/DdayBadge.tsx`, Account 하단에서 렌더)가 무조건 렌더된다. `showDDay === false` 일 때만 미렌더. **`undefined`(레거시 데이터)는 기존 동작 유지 = 렌더** |
| 2-2 | 고인 표기 렌더 | 모델: `Person.isDeceased?: boolean`, `deceasedType?: 'flower'\|'hanja'\|'none'` (`packages/ui/src/entities/WeddingInvitation/model.ts`). 렌더 지점 두 곳 — ① `Introduction`(혼주 소개 문구, `packages/ui/src/widgets/invitation/Home/` 하위) ② `ContactInfo`(축하의 말 전하기 다이얼로그). 규칙: `'hanja'` → 이름 앞 `故`, `'flower'` → 국화 표기(픽셀 감성에 맞는 아이콘/문자 — 디자인 판단 필요, `docs/design-system.md` 톤 준수), `'none'`/미설정 → 표기 없음. **고인에게는 `tel:`/`sms:` 버튼을 노출하지 않는다** |

검증: `isDeceased` 조합별(4혼주 × 3타입) 시드 데이터로 렌더 확인, showDDay true/false/undefined 3케이스 확인.

### PR 3 — `feat(ui): 뷰어 견고성 — lazy 로딩·ErrorBoundary·방명록 실패 피드백` (중형)

| # | 작업 | 방법 |
|---|---|---|
| 3-1 | 이미지 lazy 로딩 | `packages/ui` 의 `<img>` 전수(9곳, `SafeImage` 포함)에 `loading="lazy"` + `decoding="async"`. 단 **첫 화면 요소(인트로 이미지, Home 대표사진)는 `loading="eager"` 유지**. CLS 억제를 위해 width/height 속성 또는 CSS `aspect-ratio` 를 함께 지정 (기존 레이아웃 치수는 각 module.css 에서 확인) |
| 3-2 | MiniRoom ErrorBoundary | `MiniRoom`(`packages/ui/src/widgets/invitation/MiniRoom/MiniRoom.tsx`)이 `useSuspenseQuery` 를 쓰는데 상위에 ErrorBoundary 가 없어 방명록 조회 실패가 본문 전체를 무너뜨릴 수 있다. `packages/ui/src/shared/ui/` 에 공용 ErrorBoundary 신설(어드민의 `src/widgets/ErrorBoundary` 는 앱 소속이라 공유 불가 — 참고만) → `packages/ui/src/pages/WeddingInvitation/WeddingInvitation.tsx` 에서 MiniRoom 구간만 감싼다. 폴백: "방명록을 불러오지 못했어요" + `다시 시도` 버튼(react-query `refetch` 또는 boundary reset). 본문 나머지 섹션은 살아 있어야 한다 |
| 3-3 | 방명록 저장 실패 피드백 | `packages/ui/src/widgets/invitation/MiniRoom/GuestBookForm/GuestBookForm.tsx` 의 catch 가 `console.error` 만 한다. 기존 `ToastProvider`(`packages/ui/src/shared/ui/`)로 실패 토스트를 띄우고, **바텀시트를 닫지 않고 입력값을 보존**해 재시도할 수 있게 한다 (성공 경로의 기존 토스트 패턴과 대칭) |

검증: 네트워크 차단 상태에서 방명록 저장/조회 실패 시나리오 확인, Lighthouse 또는 DevTools 로 lazy 적용·CLS 확인.

### PR 4 — `feat(admin): 이탈 경고 + 형식 검증 + themeColor 4종` (중형)

| # | 작업 | 방법 |
|---|---|---|
| 4-1 | 라우터 마이그레이션 (선행) | `apps/momozzang-admin/src/App.tsx` 를 `BrowserRouter` → `createBrowserRouter` + `RouterProvider` 로 전환. **불변식 유지**: `RequireAdmin` 은 세션 판정 전 자식을 렌더하지 않으며, `AdminTopBar` 는 라우터 공통 레이아웃이 아니라 각 보호 페이지 최상단에서 렌더한다(가드 바깥으로 올리면 안 된다 — `docs/admin-app.md` 명시) |
| 4-2 | 미저장 이탈 경고 | `apps/momozzang-admin/src/features/apply/useApplyForm.ts` 에 dirty 추적 추가(로드/초기화 시점 스냅샷과 깊은 비교, 또는 변경 액션 발생 플래그). 적용 화면: `/apply` · `/edit` · `/admin/edit`(PR5 이후 폼 공유). 라우팅 이탈은 `useBlocker` + 확인 다이얼로그(기존 `MessageDialog` 재사용), 탭 닫기/새로고침은 `beforeunload`. **저장 성공 시 dirty 리셋**. pending 이미지(`usePendingImages`)가 있으면 dirty 로 간주 |
| 4-3 | 형식 검증 추가 | `apps/momozzang-admin/src/features/apply/validateInvitation.ts` 에 규칙 추가: 전화번호(숫자만, 9~11자리 — 모델 `Phone.number` 는 하이픈 없는 번호), 이메일(형식), 계좌번호(숫자/하이픈만), 좌표(위도 -90~90, 경도 -180~180). 기존 패턴 유지: 저장 시점 일괄 검증 → 이슈 배너(`role="alert"`) + 토스트, 검증 실패 시 업로드/저장 미호출. **빈 값 허용 여부는 기존 필수 필드 목록을 바꾸지 않는다** (형식이 틀린 경우만 잡는다) |
| 4-4 | themeColor 4종 | ① `packages/ui/src/shared/styles/utils.ts` 의 `PALETTES` 에 GREEN/BLUE 팔레트 신설 — 기존 PURPLE/PINK 팔레트의 키 구성을 그대로 따르고, hue 는 기존 `THEME_HUES`(GREEN 120, BLUE 210) 기준. `getThemeVariables` 의 PURPLE 폴백 분기(`safeTheme`)를 4종 대응으로 수정 ② `ApplyForm.tsx` 테마 셀렉트에 GREEN/BLUE 추가. **뷰어 시각 변경이므로 PhonePreview 로 4종 각각 스크린샷 검증 필수** (색조 변환 훅 `useImageHueShift` 가 GREEN/BLUE 에서도 성립하는지 포함) |

검증: 편집 → 저장 없이 라우팅/새로고침 시 경고 확인, 저장 후 경고 미발생 확인, 형식 위반 입력별 배너 확인, 4테마 스크린샷.

### PR 5 — `feat(admin): /admin/edit 전체 필드 편집 + 실시간 미리보기` (대형)

**목표**: 관리자가 신청 내용의 텍스트(이름·일시·문구·계좌 등 전 필드)를 고칠 수 있게 하고, 편집하면서 실제 청첩장 모습을 본다.

**접근 — 새로 만들지 말고 재사용한다**: `/edit`(`apps/momozzang-admin/src/pages/EditPage/EditPage.tsx`)가 이미 하는 방식 그대로, `ApplyForm` + `useApplyForm` + `PhonePreview` + 지연 업로드(`usePendingImages`) 조합을 `/admin/edit`(`AdminPage.tsx`)에 이식한다. 차이점만 분기:

- 저장 경로: 신청자 경로(`updateInvitationWithPassword`)가 아니라 **관리자 무비밀번호 경로 `updateInvitation(slug, data)`** (서버 RLS 가 관리자로 제한하므로 안전 — `apps/momozzang-invitation/supabase/business_flow.sql` 검증 완료)
- 기존 이미지 전용 에디터 UI 는 폼으로 대체하되, **슬러그 입력·조회 UI 와 `?slug=` 딥링크(승인 목록 `편집` 링크가 사용)는 유지**
- `신청 정보` 섹션(신청자 연락처)은 신청자 화면에서는 비렌더지만, 관리자에게는 **읽기 전용으로 표시** (편집 비밀번호는 어떤 형태로도 표시하지 않는다)
- 저장 시 `status`·신청 메타(연락처, approved_at 등)를 건드리지 않는다 — `data` 컬럼만 갱신
- 좁은 폭(≤768px) 탭 토글(`입력 폼`/`미리보기`)은 `/edit` 와 같은 구조(`role="tablist"`) 재사용
- PR 4 의 dirty 추적/이탈 경고가 이 화면에도 그대로 걸리는지 확인

**주의**: 이 PR 은 규모가 커서 저장소 협업 프로토콜상 Heavy 레인(`.harness/runs/<슬러그>/` SPEC → 계약 → 구현 → 독립 QA) 대상이다. Gemini 단독으로 진행한다면 최소한 구현 후 **구현자가 아닌 별도 검증 패스**(사람 또는 다른 에이전트)로 QA 할 것.

검증: 임의 슬러그 로드 → 텍스트 수정 → 미리보기 즉시 반영 → 저장 → 뷰어에서 반영 확인. status 미변경 확인. 이미지 편집(기존 기능) 회귀 없음 확인.

### PR 6a — `feat(invitation): 슬러그별 OG 메타태그` (중~대형, 아키텍처 결정 포함)

**문제**: `apps/momozzang-invitation/index.html` 에 OG/twitter 메타태그가 없다. SPA 라 크롤러가 슬러그별 제목·썸네일을 볼 수 없어 카톡 링크 전달 시 미리보기가 뜨지 않는다. 모델의 `invitationInfo.shareImageUrl` 은 존재하나 미사용.

**권장 구조** (배포가 Vercel — 루트 `vercel.json` 의 SPA rewrite):

1. `index.html` 에 **정적 기본 OG** (서비스명·기본 이미지) 추가 — 이것만으로도 최소한의 미리보기가 성립.
2. **Vercel Edge Middleware**(또는 Edge Function)로 `/:slug` 요청 중 **크롤러 UA**(카카오톡 스크랩러 `kakaotalk-scrap`, `facebookexternalhit`, `Twitterbot` 등)만 가로채, Supabase REST 로 해당 슬러그의 **승인(`status='approved'`) 행**을 anon 키로 조회(`slug, data->invitationInfo` 최소 컬럼)해 `og:title`(invitationInfo.title), `og:description`(invitationInfo.message 요약), `og:image`(`buildImageUrl(shareImageUrl)` 조립 결과 — `VITE_IMAGE_BASE_URL` 과 같은 조립 규칙) 을 심은 HTML 을 응답.
3. 미승인/미존재 슬러그·조회 실패는 기본 OG 로 폴백. 일반 사용자 UA 는 기존 SPA 흐름 그대로 (TTFB 영향 없음).
4. Edge 환경 환경변수는 `VITE_` 접두 없이 서버 전용으로 둔다 — anon 키는 공개 키라 노출 무방하나 관례 유지.

검증: `curl -A "facebookexternalhit" https://<도메인>/<슬러그>` 로 메타 확인, 카카오 링크 디버거, 실제 카톡 전달. 미승인 슬러그가 실명·예식장 정보를 OG 로 새지 않는지 반드시 확인(승인 행만 조회하므로 구조상 안전해야 하나 실측할 것).

### PR 6b — `feat(ui): 캘린더 저장` (소형)

- 위치: `WeddingCalendar`(Home 섹션) 하단 또는 Direction 섹션에 `캘린더에 저장` 버튼.
- 동작: ① **ICS 파일** — 클라이언트에서 blob 생성·다운로드. DTSTART 는 `weddingHallInfo.date` + `toHour24(hour, ampm)`(PR 1 유틸) + `minute`, Asia/Seoul. SUMMARY 는 `invitationInfo.title` 또는 "OOO ♥ OOO 결혼식", LOCATION 은 `hallName + ' ' + address`. ② **Google Calendar 링크** — `calendar.google.com/calendar/render?action=TEMPLATE&...` URL 병행 제공.
- **iOS Safari 는 ICS 다운로드 UX 가 불안정**하므로 Google 링크를 항상 함께 노출하고, 실패해도 막다른 골목이 없게 한다.
- 스타일은 기존 픽셀 감성 버튼(`BaseButton`/`IconButton`) 재사용.

검증: 생성된 ICS 를 실제 캘린더 앱에서 열어 일시·장소 확인 (특히 오후 예식이 오후로 들어가는지 — PR 1 유틸 회귀 확인).

---

## 3. 진행 순서 요약

```
PR1 (버그·정리)        ← toHour24 유틸이 여기서 생김
  → PR2 (데이터 반영)
  → PR3 (뷰어 견고성)
  → PR4 (어드민 UX)     ← 라우터 마이그레이션·dirty 추적이 여기서 생김
  → PR5 (관리자 편집)   ← PR4 의존, 대형
  → PR6a (OG) / PR6b (캘린더)  ← 상호 독립, 병렬 가능. 6b 는 PR1 의존
```

## 4. 하지 말 것 (전 구간)

- 보안 항목(업로드 토큰 구조, 편집 비밀번호 레이트리밋, 방명록 비밀번호 방식)에 손대지 않는다 — 소유자가 보류 결정.
- RSVP·카카오페이·BGM 렌더를 이번 범위에 넣지 않는다. `Music/` 위젯도 삭제하지 않는다.
- `packages/ui` 변경 시 뷰어 회귀 금지 — 뷰어는 하객이 보는 운영 화면이다. 시각 변경이 있는 태스크(2-2, 4-4)는 before/after 스크린샷을 남긴다.
- Supabase 운영 인스턴스에 DDL 을 실행하지 않는다 (이번 범위에 스키마 변경 없음 — 필요해 보이면 멈추고 사람에게 확인).
- 존재하지 않는 루트 스크립트(`pnpm test`, `pnpm lint`)를 호출하지 않는다.

## 5. 미확정 사항 (구현 중 판단 필요)

1. **국화(`flower`) 표기의 시각 디자인** (PR 2-2) — 픽셀 감성에 맞는 아이콘/문자 선택. `docs/design-system.md` 톤 안에서 구현자가 제안하고 스크린샷으로 확인받는 것을 권장.
2. **GREEN/BLUE 팔레트의 구체 색값** (PR 4-4) — hue 120/210 기준으로 기존 PURPLE/PINK 팔레트의 명도·채도 구성을 평행 이동해 도출. 결과 스크린샷 확인 필수.
3. **OG 미들웨어의 정확한 배포 방식** (PR 6a) — Vercel Edge Middleware vs Function 은 현재 Vercel 프로젝트 설정(빌드 구성)을 보고 결정.
