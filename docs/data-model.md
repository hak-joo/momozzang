# 데이터 모델

도메인 엔티티는 공유 패키지 `@momozzang/ui`에 정의됩니다. 핵심은 청첩장(`WeddingInvitation`)과 방명록(`GuestBook`)입니다.

- 청첩장 타입: `packages/ui/src/entities/WeddingInvitation/model.ts`
- 방명록 타입: `packages/ui/src/entities/GuestBook/model/types.ts`

## `WeddingInvitation`

청첩장의 모든 영역을 담는 최상위 객체입니다. Supabase에서는 `momozzang` 테이블의 JSON `data` 컬럼에 이 객체 전체가 저장됩니다.

| 필드 | 타입(요약) | 설명 |
|------|------------|------|
| `version` | `string` | 스키마 버전 |
| `theme` | `'CYWORLD' \| 'RETRO'` | 테마 종류 (`ThemeKind`) |
| `invitationInfo` | `InvitationInfo` | 주문자/URL(슬러그)/제목/문구/공유 이미지 |
| `couple` | `{ groom: Person; bride: Person }` | 신랑/신부 정보 |
| `parents` | `Parents` | 혼주 정보(`enabled` + 양가 부모/기타) |
| `weddingHallInfo` | `WeddingHallInfo` | 예식 일시/예식장/주소/좌표(`latitude`/`longitude`) |
| `rsvpRequest` | `RsvpSettings` | 참석 의사(RSVP) 설정 |
| `etcInfo` | `EtcInfo` | 교통(버스/자가용/지하철/셔틀) 안내 |
| `congratulatoryMoneyInfo` | `GiftMoneySettings` | 축의금/마음 전하실 곳 설정 |
| `images` | `ImageAsset[]` | 이미지 자산(대표/공유 플래그 포함) |
| `album` | `AlbumPhoto[]` | 갤러리 앨범 사진 |
| `bgm?` | `BgmSettings` | 배경 음악 설정(선택) |
| `customization?` | `Customization` | 테마 색상/메인 이미지/D-Day/미니룸 등(선택) |
| `aboutUs?` | `AboutUs` | 신랑·신부 소개(제목/설명/이미지)(선택) |

주요 하위 타입:

- `Person` — `name`, `phone`(`Phone`), `email?`, `isDeceased?`, `deceasedType?`(`'flower' | 'hanja' | 'none'`), `accounts?`(`Account[]`).
- `Phone` — `number`(하이픈 없는 번호), `isInternational`, `countryCode`(기본 `+82`).
- `Account` — `id`, `target`(`'self' | 'parent' | 'custom'`), `customLabel?`, `bank`, `accountNumber`, `accountHolder`, `kakaoPayEnabled`, `kakaoPayCode?`.
- `WeddingHallInfo` — `date`(YYYY-MM-DD), `ampm`(`'AM' | 'PM'`), `hour`, `minute`, `hallName`, `hallDetail`, `lineBreakBetweenNameAndHall`, `tel`, `address`, `latitude`, `longitude`.
- `RsvpSettings` — `enabled`, `include`(`RsvpIncludeToggles`), `separateForBrideGroom`, `popupOnAccess`, 선택적 `perSide`(신랑/신부 분리 설정).
- `Customization` — `enabled`, `themeColor`(`'PURPLE' | 'GREEN' | 'PINK' | 'BLUE'`), `mainImageUrl`, `showDDay`, `mood?`, `miniRoom?`(`coupleAvatarTemplateId?`, `roomTemplateId?`).
- `AlbumSettings` — `enabled`, `maxCount`(기본 20), `photos`(`AlbumPhoto[]`). `AlbumPhoto`는 `id`, `url`, `alt?`.
- `AboutUs` — `title`, `brideDesc`, `brideImageUrl`, `groomDesc`, `groomImageUrl`.

> 참고: 화면 호환용 평면 모델 `WeddingInvitationFlat`(`couple`/`parents`를 펼친 형태)도 같은 파일에 정의되어 있습니다.

## `GuestBook`

방명록 한 건을 나타냅니다(`packages/ui/src/entities/GuestBook/model/types.ts`).

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `number` | 방명록 ID |
| `contents` | `string` | 내용 |
| `writer?` | `string` | 작성자 닉네임(선택) |
| `miniMeId` | `number` | 미니미(아바타) ID |
| `weddingInvitationId?` | `string` | 소속 청첩장 슬러그(선택) |
| `date?` | `string` | 작성 일시(선택) |

작성/삭제 시 사용하는 페이로드 타입도 같은 파일에 있습니다.

- `SaveGuestBookPayload` — `invitationId?`, `miniMeId`, `nickname`, `message`, `password`, `isMock?`.
- `DeleteGuestBookPayload` — `id`, `password`, `isMock?`.

## Supabase 테이블 매핑

`VITE_DATA_SOURCE === 'supabase'`일 때 사용하는 두 테이블입니다.

### `momozzang` (청첩장)

조회 키는 `slug` 컬럼이고, JSON `data` 컬럼에 `WeddingInvitation` 객체 전체가 저장됩니다. 신청→승인→공개 흐름을 위해 수명주기 컬럼 4개가 추가되어 있습니다(DDL: `apps/momozzang-invitation/supabase/business_flow.sql`).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `slug` | `text` | 조회 키(청첩장 주소) |
| `data` | `jsonb` | `WeddingInvitation` 객체 전체 |
| `status` | `text` (`pending` \| `approved` \| `rejected`, 기본 `pending`) | 신청 수명주기. 뷰어는 `approved` 일 때만 본문을 렌더합니다. |
| `edit_password_hash` | `text` | 편집 비밀번호 해시(pgcrypto bf). **클라이언트로 절대 내려보내지 않습니다** — 조회 select 목록에 넣지 않고, 대조는 서버(RPC) 안에서만 합니다. |
| `applicant_contact` | `text` (기본 `''`) | 신청자 연락처. 관리자만 봅니다. |
| `approved_at` | `timestamptz` | 승인 시각. 반려/승인 취소 시 `null` 로 되돌립니다. |

### `admin_users` (관리자 화이트리스트)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `email` | `text` (PK) | 관리자 이메일. `anon` 은 읽을 수 없고 `authenticated` 는 자기 행만 읽습니다. |

Supabase 경로에서는 이 테이블이 관리자 판정의 정본이고, 로컬 데이터소스에서만 `VITE_ADMIN_EMAILS` 를 씁니다.

### 수명주기 타입

`packages/ui/src/entities/WeddingInvitation/model.ts` · `.../repositories/types.ts`

- `InvitationStatus` — `'pending' | 'approved' | 'rejected'`.
- `InvitationRecord` — `slug`, `status`, `data`, `applicantContact`, `createdAt`, `approvedAt`.
- `InvitationSummary` — `Omit<InvitationRecord, 'data'>` 에 `groomName` · `brideName` · `weddingDate` 세 필드를 더한 타입(목록 조회용, 본문 제외).
  - 세 값은 `/admin` 승인 목록 표의 `신랑·신부` · `예식일` 컬럼을 채웁니다. 본문 `data` 는 여전히 내려오지 않습니다.
  - 로컬 구현은 `toSummary` 가 본문에서 옮겨 담고, Supabase 구현은 `select` 의 JSON 경로 추출(`data->couple->groom->>name` 등)로 세 값만 가져옵니다 — 목록 진입 시 슬러그별 본문 조회가 생기지 않습니다.
- `CreateInvitationInput` — `slug`, `data`, `editPassword`(평문, 저장 시 반드시 해시), `applicantContact`.

### Repository 메서드

`InvitationRepository`(`packages/ui/src/entities/WeddingInvitation/repositories/types.ts`)는 기존 2개(`getInvitation`·`updateInvitation`)에 더해 아래 6개를 가집니다. 로컬·Supabase 두 구현이 같은 인터페이스를 만족합니다.

| 메서드 | 용도 | Supabase 구현 |
|--------|------|----------------|
| `getInvitationRecord(slug)` | 뷰어 status 게이트용 레코드 조회 | `select('slug, data, status, created_at, approved_at')` (해시 컬럼 제외) |
| `createInvitation(input)` | `/apply` 신청 접수(`status='pending'` + 해시 저장) | `rpc('create_invitation')` |
| `listInvitations(status?)` | `/admin` 신청 목록 | `select` + 관리자 RLS |
| `setInvitationStatus(slug, status)` | 승인/반려 | `update` + 관리자 RLS |
| `getInvitationForEdit(slug, editPassword)` | `/edit` 게이트. 미존재·불일치·해시 없음 모두 `null` | `rpc('get_invitation_for_edit')` |
| `updateInvitationWithPassword(slug, editPassword, data)` | `/edit` 저장(본문 `data` 만 갱신) | `rpc('save_invitation_edit')` |

### RPC 3종 (`security definer`)

| 함수 | 하는 일 |
|------|---------|
| `public.create_invitation(...)` | 슬러그 중복을 원자적으로 선검사하고 `status='pending'` 행을 만들며 비밀번호를 해시해 저장 |
| `public.get_invitation_for_edit(slug, edit_password)` | 서버에서 bcrypt 대조 후 본문 `data` 만 반환(실패 시 `null`) |
| `public.save_invitation_edit(slug, edit_password, data)` | 서버에서 대조 후 `data` 만 갱신. `status`·해시·신청 메타는 건드리지 않음 |

전체 DDL·RLS 정책·RPC 정의는 `apps/momozzang-invitation/supabase/business_flow.sql` 한 파일에 있습니다.

기존 2메서드는 그대로입니다.

- 조회: `SupabaseInvitationRepository.getInvitation(slug)` → `.from('momozzang').select('data').eq('slug', id).single()`.
- 저장: `updateInvitation(slug, data)` → `.from('momozzang').update({ data }).eq('slug', id)` — 관리자 편집(`/admin/edit`) 경로 전용입니다.

### `guestbooks` (방명록)

`SupabaseGuestBookRepository`가 매핑합니다(`packages/ui/src/entities/GuestBook/api/SupabaseGuestBookRepository.ts`).

| 테이블 컬럼 | `GuestBook`/페이로드 필드 | 비고 |
|-------------|---------------------------|------|
| `id` | `id` | |
| `wedding_invitation_id` | `weddingInvitationId` / `invitationId` | 조회 필터 키, `created_at desc` 정렬 |
| `writer` | `writer` / `nickname` | |
| `contents` | `contents` / `message` | |
| `password` | `password` | 삭제 시 비밀번호 검증에 사용 |
| `mini_me_id` | `miniMeId` | |
| `created_at` | `date` | |

조회는 `wedding_invitation_id`로 필터하고 `created_at` 내림차순 정렬(옵션 `limit`)합니다. 삭제는 비밀번호 일치 검증 후 행을 제거합니다.

## 관련 문서

- 데이터 접근 계층(Repository + 팩토리, `VITE_DATA_SOURCE` 분기)은 [`shared-ui.md`](./shared-ui.md) 참조.
- 어드민에서의 편집/저장 흐름은 [`admin-app.md`](./admin-app.md) 참조.
