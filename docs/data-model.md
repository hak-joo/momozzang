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

- 조회 키: `slug` 컬럼.
- JSON `data` 컬럼에 `WeddingInvitation` 객체 전체를 저장.
- 조회: `SupabaseInvitationRepository.getInvitation(slug)` → `.from('momozzang').select('data').eq('slug', id).single()`.
- 저장: `updateInvitation(slug, data)` → `.from('momozzang').update({ data }).eq('slug', id)`.

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
