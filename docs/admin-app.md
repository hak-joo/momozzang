# 관리 어드민 앱 (`momozzang-admin`)

청첩장 데이터를 슬러그로 불러와 이미지/갤러리를 편집하고 저장하는 관리 화면입니다.

- 위치: `apps/momozzang-admin`
- 진입점: `src/main.tsx` → `src/App.tsx`
- dev 서버: `pnpm dev:admin` (`apps/momozzang-admin/vite.config.ts`에서 `server.port: 3002`)
- 빌드: `pnpm build:admin`
- lint: `pnpm --filter momozzang-admin lint`

## 라우트

라우터 정의는 `src/App.tsx`에 있습니다.

| 라우트 | 컴포넌트 | 접근 조건 | 화면 이동 |
|--------|----------|-----------|-----------|
| `/` | `<Navigate to="/admin" replace />` | 공개(리다이렉트만) | — |
| `/login` | `LoginPage` (`src/pages/LoginPage/LoginPage.tsx`) | 공개 | — |
| `/admin` | `ApprovalsPage` (`src/pages/ApprovalsPage/ApprovalsPage.tsx`) | `RequireAdmin` (관리자 로그인) | 공통 상단바(`data-testid="admin-topbar"`)로 `/admin/edit` 과 상호 이동합니다. 목록의 각 행에는 그 슬러그를 실은 `편집` 딥링크가 있습니다 |
| `/admin/edit` | `AdminPage` (`src/pages/AdminPage.tsx`) | `RequireAdmin` (관리자 로그인) | 공통 상단바(`data-testid="admin-topbar"`)로 `/admin` 과 상호 이동합니다. `?slug=` 쿼리를 마운트 시 슬러그 입력·조회의 **초기값으로 수용**하며, 쿼리가 없으면 종전 기본값(`demo-captain-luna`)입니다 |
| `/apply` | `ApplyPage` (`src/pages/ApplyPage/ApplyPage.tsx`) | 공개 | — |
| `/edit` | `EditPage` (`src/pages/EditPage/EditPage.tsx`) | 공개 라우트 + 슬러그+비밀번호 게이트 | — |

`/admin` 은 신청 목록·승인/반려 화면(`ApprovalsPage`)이고, 슬러그를 불러와 이미지·갤러리를 고치는
관리자 편집 화면은 `/admin/edit`(`AdminPage`)로 옮겨졌습니다.

두 보호 화면은 `AdminTopBar`(`src/widgets/AdminTopBar/AdminTopBar.tsx`)를 공유합니다. 상단바는
`신청 관리` / `청첩장 편집` 링크(현재 화면에 `aria-current="page"`), 로그인한 관리자 이메일,
`로그아웃` 버튼을 갖습니다. 상단바는 라우터의 공통 레이아웃이 아니라 **각 보호 페이지의 최상단**에서
렌더합니다 — `RequireAdmin` 바깥으로 올리면 세션 판정 전에 마운트되어 가드 불변식이 깨집니다.

## 신청자 수정 흐름 (`/edit`)

1. **게이트** — 신청할 때 정한 주소(슬러그)와 편집 비밀번호를 입력해 `getInvitationForEdit(slug, editPassword)` 로 잠금을 해제합니다. 슬러그 미존재·비밀번호 불일치·해시 없는 레거시 행 세 경우 모두 `슬러그 또는 비밀번호가 올바르지 않습니다.` 한 문장으로 끝나 존재 여부가 새지 않고, 잠금 전에는 편집 폼을 마운트조차 하지 않습니다.
2. **폼 재사용** — 잠금이 풀리면 `/apply` 와 같은 `useApplyForm`·`ApplyForm`·`ImageStep`·`Stepper`·`PhonePreview` 를 그대로 쓰고, 불러온 청첩장으로 폼 전체를 교체합니다. 저장에 반영되지 않는 `신청 정보`(신청자 연락처·편집 비밀번호) 섹션은 이 화면에서 렌더하지 않습니다.
3. **저장** — 게이트에서 받은 비밀번호를 함께 실어 `updateInvitationWithPassword(slug, editPassword, data)` 로만 저장합니다(무인증 `updateInvitation` 을 쓰지 않습니다). 저장 대상 행은 게이트로 연 슬러그로 고정되며, 공개 상태(`status`)·신청 메타는 그대로 보존됩니다. 데이터 접점은 `src/features/apply/useEditGate.ts` 하나입니다.

## 관리자 편집 흐름 (`/admin/edit`)

`AdminPage`(`src/pages/AdminPage.tsx`)가 화면 전체를 담당합니다.

```mermaid
flowchart LR
    SLUG[슬러그 입력] -->|Load 클릭| Q[useInvitationQuery]
    Q --> EDIT[이미지/갤러리 편집]
    EDIT -->|Save Changes 클릭| M[useInvitationMutation]
    M --> SB[(Supabase momozzang 테이블)]
```

1. **슬러그 입력 → Load** — 입력 필드 기본값은 `demo-captain-luna`. `Load` 버튼(또는 Enter)으로 `slug` 상태를 확정하면 `useInvitationQuery(slug)`가 청첩장 데이터를 조회합니다. 조회 성공 시 로컬 편집 상태(`invitation`)에 반영하고, 실패 시 에러 메시지를 표시합니다.
2. **편집** — 메인 이미지, 공유 썸네일(카카오), 신랑/신부 이미지, 그리고 갤러리 앨범을 수정합니다. 모든 편집은 로컬 상태에만 반영되고, 저장 전까지 서버에 반영되지 않습니다.
3. **저장(Save Changes)** — `useInvitationMutation`으로 `updateInvitation(slug, data)`를 호출해 `momozzang` 테이블의 해당 행 `data` 컬럼을 갱신합니다. 성공/실패 시 `alert`로 결과를 알립니다.

데이터 조회/저장/업로드 훅은 `src/features/invitation/api/`에 있습니다.

- `useInvitationQuery.ts` — 슬러그로 청첩장 조회(react-query).
- `useInvitationMutation.ts` — 청첩장 저장(react-query mutation).
- `useImageUploadMutation.ts` — 이미지 업로드(아래 참조).

## 이미지 업로드 / 리사이즈

- 업로드 전, 클라이언트에서 `canvas`로 이미지를 리사이즈합니다. 최대 크기는 **1920 x 1080**, 가로/세로 비율을 유지하며 긴 변 기준으로 축소하고 품질 `0.8`의 blob으로 인코딩합니다(`AdminPage`의 `handleImageResize`, 갤러리도 동일 로직).
- 리사이즈된 파일을 Supabase Storage `wedding-images` 버킷에 업로드한 뒤 public URL을 사용합니다(`src/features/invitation/api/useImageUploadMutation.ts`).
- 단일 이미지 필드: 메인 이미지(`customization.mainImageUrl`), 공유 썸네일(`invitationInfo.shareImageUrl`), 신랑/신부 이미지(`aboutUs.groomImageUrl` / `aboutUs.brideImageUrl`).

<!-- 배치 사유: 주제 순서가 아니라 병합 독립성(스프린트 3 계약 §5.5)으로 정한 위치다. -->
## 승인 콘솔 좁은 폭 카드 레이아웃 (/admin)

- `768px` 이하에서 승인 목록 표가 **행 단위 카드**로 접힙니다. `thead` 를 숨기고 각 행을 카드 표면
  (테두리 + 라운드 + 여백)으로, 각 셀을 블록으로 바꿉니다. 그래서 **가로 스크롤이 발생하지 않고**
  `처리` 버튼이 스크롤 없이 화면 안에 들어옵니다.
- 항목 이름은 마크업이 아니라 `ApprovalsPage.module.css` 의 `::before` 로 그립니다
  (`슬러그` · `연락처` · `상태` · `신청일` · `신랑·신부` · `예식일` · `처리`).
  펼침 미리보기 행과 `내용 보기` 셀에는 라벨을 붙이지 않습니다.
- 선택자는 컬럼 개수에 흔들리지 않도록 앞·뒤·구조 기준으로 씁니다. 상태 셀은 `[data-badge]` 를 가진
  유일한 셀이고 신청일은 그 다음 셀입니다.
- `769px` 이상에서는 기존 표 레이아웃이 그대로입니다(`white-space: nowrap` 포함).


## 갤러리 드래그 정렬

갤러리 관리는 `src/widgets/GalleryManager/GalleryManager.tsx`가 담당하며 `@dnd-kit`(core/sortable/utilities)을 사용합니다.

- 사진을 드래그해 순서를 바꾸면 `arrayMove`로 앨범 배열 순서를 갱신합니다(`onChange`로 상위 상태 반영).
- `PointerSensor`(8px 이동 후 드래그 시작) + `KeyboardSensor`로 마우스/키보드 정렬을 지원하고, `DragOverlay`로 드래그 중 미리보기를 보여줍니다.
- 사진은 최대 **20장**까지 업로드 가능하며, 초과 시 경고를 표시합니다. 개별 사진 삭제(`confirm` 확인 후 배열에서 제거)도 지원합니다.
- 항목 컴포넌트는 `src/widgets/GalleryManager/SortableImage.tsx`입니다.

## 승인 콘솔 (`/admin`)

> 이 절의 **위치**는 서술 순서가 아니라 **독립성**으로 정해졌다. 같은 문서를 여러 태스크가 만지므로
> 각 태스크의 삽입 지점을 6줄 이상 떼어 놓는다(`.harness/runs/ux-diff-picks/APPLY.md` §2.1).

`ApprovalsPage`(`src/pages/ApprovalsPage/ApprovalsPage.tsx`)가 신청 목록과 승인/반려를 담당합니다.

- **확인 대화** — `승인`/`반려`는 되돌리기 어려운 공개 상태 변경이라 `useAdminConfirm`(`src/shared/ui/ConfirmDialog`)
  의 확인 대화를 먼저 띄웁니다. `승인`은 그 청첩장이 **공개**되어 주소를 아는 누구나 볼 수 있게 된다는 사실을,
  `반려`는 공개되지 않고 하객에게 안내 화면만 보인다는 사실을 설명에 적습니다. 반려 대화의 확인 버튼은
  `destructive` 표기입니다. **취소하면 요청을 만들지 않습니다**(`mutate` 를 호출하지 않습니다).
  `Esc`·오버레이 클릭은 취소와 같습니다.
- **결과 피드백** — 성공/실패를 **토스트**(`useAdminToast`, `src/shared/ui/Toast`)로 알립니다. `승인 대기` 필터에서
  승인하면 그 행이 목록에서 사라지므로 토스트 문구에 슬러그를 넣어 무엇이 처리됐는지 잃지 않게 합니다.
- **행 인라인 오류** — 실패는 토스트만으로 끝내지 않습니다. 그 행의 `처리` 셀에 `role="alert"` 인
  `처리하지 못했습니다. 잠시 후 다시 시도해 주세요.` 를 남겨, 토스트가 사라진 뒤에도 어느 행이 실패했는지 보입니다.
  이때 행의 상태는 바뀌지 않습니다.
- 판정 앵커: `approvals-approve` · `approvals-reject` · `approvals-row-error` ·
  `admin-confirm-dialog` / `-title` / `-description` / `-accept` / `-cancel`.

## 데이터/환경변수

- 데이터 접근은 공유 패키지의 Repository 팩토리(`getInvitationRepository`)를 사용합니다. `VITE_DATA_SOURCE === 'supabase'`일 때 Supabase로 분기합니다. 상세는 [`data-model.md`](./data-model.md), [`shared-ui.md`](./shared-ui.md) 참조.
- admin 전용 환경변수: `VITE_KAKAO_APP_KEY`, `VITE_KAKAO_TEMPLATE_ID`(카카오 공유). 공통 환경변수는 루트 [`CLAUDE.md`](../CLAUDE.md) 참조.

## 관련 명령

```bash
pnpm dev:admin                          # dev 서버 (port 3002)
pnpm build:admin                        # 빌드
pnpm --filter momozzang-admin lint      # lint
```

## 승인 콘솔 — 신청 내용 미리보기 (`/admin`)

승인 목록의 `내용` 컬럼(`내용 보기` 토글)으로 그 행을 **펼친 행**에서만 신청 내용을 확인합니다.

- **조회 시점** — 펼친 순간에만 `getInvitationRecord(slug)` 를 부릅니다
  (`src/features/invitation/api/useInvitationRecordQuery.ts`). 목록 진입 시 N건 일괄 조회는 코드 경로 자체가
  없습니다 — 훅의 `enabled` 에 기본값이 없고 `expandedSlug === slug` 일 때만 켜집니다. Repository 인터페이스는
  바꾸지 않았습니다.
- **카드가 담는 것** — 초대장 제목 · 신랑·신부 · 예식 일시 · 예식장명/주소 · 사진 수 · 대표 이미지 썸네일.
  예식 일시는 `toLocaleString` 없이 저장된 필드로 조립해 로케일·타임존에 흔들리지 않습니다.
- **조회 중·실패** — `내용을 불러오는 중입니다.` / `내용을 불러오지 못했습니다.`(`role="alert"`) + `다시 시도`.
  실패해도 **목록 자체는 정상**입니다(목록은 `listInvitations`, 미리보기는 `getInvitationRecord` 로 경로가 다릅니다).
- **표 컬럼** — 목록 조회가 돌려주는 `InvitationSummary` 는 본문(`data`)을 담지 않아
  **신랑·신부**·**예식일** 을 모든 행에 항상 그릴 수 없습니다. 그 컬럼은 요약 타입을 넓히는 별도 작업(T12)에서
  되살립니다. 이 절의 미리보기는 어드민 앱 안에서만 끝납니다(`packages/ui/` 무변경).
- 판정 앵커: `approvals-preview-toggle` · `-row` · `-card` · `-title` · `-couple` · `-datetime` · `-hall` ·
  `-photos` · `-thumb` · `-loading` · `-error` · `-retry`.
