# 공유 패키지 `@momozzang/ui`

두 앱(`momozzang-invitation`, `momozzang-admin`)이 공유하는 UI 컴포넌트, 도메인 엔티티, 데이터 레이어 패키지입니다.

- 위치: `packages/ui`
- 패키지명: `@momozzang/ui` (`package.json`의 `name`)
- 워크스페이스 의존: 두 앱이 `"@momozzang/ui": "workspace:*"`로 참조.
- 패키지는 빌드 산출물(`dist`)이 아니라 **소스(`src`)를 직접 import** 하며, 별칭 해석을 Vite `vite-tsconfig-paths` 플러그인이 담당합니다.

## 레이어 구조 (FSD 스타일)

`packages/ui/src` 아래는 Feature-Sliced Design 스타일 레이어로 나뉩니다. 의존 방향은 위에서 아래로, 하위 레이어가 상위 레이어를 참조합니다.

```
packages/ui/src/
├── shared/      # 가장 낮은 레이어: 재사용 UI/유틸/인프라
│   ├── ui/      # Button, Input, Box, Dialog, BottomSheet, NaverMap, MiniMe, Toast 등
│   ├── lib/     # supabase.ts (Supabase 클라이언트), miniMe 등
│   ├── hooks/   # useImageHueShift 등 공용 훅
│   ├── styles/  # 테마 변수/유틸 (getThemeVariables 등)
│   ├── util/
│   └── assets/  # css / images / videos
├── entities/    # 도메인 모델 + 데이터 레이어
│   ├── WeddingInvitation/   # model.ts, Context, hooks, repositories
│   └── GuestBook/           # model, api(repository)
├── features/    # 도메인 동작 훅 (useCurrentMenuByScroll 등)
├── widgets/     # invitation 위젯 (Home, Gallery, MiniRoom, Direction, Account, Music, Header, Intro 등)
└── pages/       # WeddingInvitation (본문 페이지 조립)
```

> `packages/ui/src/index.ts` 배럴 파일이 존재하지만 비어 있습니다. 실제 import는 아래의 경로 별칭을 통해 개별 모듈을 직접 가리킵니다.

## import 경로 별칭

별칭은 각 앱의 tsconfig `paths`에 정의되어 있으며 Vite `vite-tsconfig-paths`로 해석됩니다.

**invitation 앱** (`apps/momozzang-invitation/tsconfig.json`):

| 별칭 | 매핑 |
|------|------|
| `@momozzang/ui/*` | `packages/ui/src/*` |
| `@widgets/*` | `packages/ui/src/widgets/*` |
| `@features/*` | `packages/ui/src/features/*` |
| `@entities/*` | `packages/ui/src/entities/*` |
| `@shared/*` | `packages/ui/src/shared/*` |

**admin 앱** (`apps/momozzang-admin/tsconfig.app.json`): `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*` (위와 동일). admin은 `@momozzang/ui/*` 별칭을 명시적으로 두지 않지만, 패키지명 기반 경로(`@momozzang/ui/src/...`)로도 소스를 직접 참조합니다(예: `AdminPage.tsx`).

> 실제 코드에는 `@momozzang/ui/...`와 `@momozzang/ui/src/...` 두 형태, 그리고 짧은 별칭(`@widgets` 등)이 함께 쓰입니다. 새 코드는 해당 앱 tsconfig에 정의된 별칭을 따르세요.

## Repository 패턴 + 팩토리

데이터 접근은 인터페이스 + 복수 구현체 + 팩토리로 분리되어 있습니다. 환경변수 `VITE_DATA_SOURCE`로 구현체를 분기합니다.

### 청첩장 (`entities/WeddingInvitation/repositories/`)

- 인터페이스: `types.ts`의 `InvitationRepository` (`getInvitation(id)`, `updateInvitation(id, data)`).
- 구현체: `SupabaseInvitationRepository`, `LocalInvitationRepository`.
- 팩토리: `invitationRepositoryFactory.ts`의 `getInvitationRepository()`.

```ts
// invitationRepositoryFactory.ts (요약)
export function getInvitationRepository(): InvitationRepository {
  const dataSource = import.meta.env.VITE_DATA_SOURCE;
  if (dataSource === 'supabase') return new SupabaseInvitationRepository();
  return new LocalInvitationRepository();
}
```

### 방명록 (`entities/GuestBook/api/`)

- 인터페이스: `types.ts`의 `GuestBookRepository`.
- 구현체: `SupabaseGuestBookRepository`, `ApiGuestBookRepository`.
- 팩토리: `guestBookRepositoryFactory.ts`의 `getGuestBookRepository()` — `VITE_DATA_SOURCE === 'supabase'`면 Supabase, 아니면 `ApiGuestBookRepository`.

### Supabase 클라이언트

- 생성 위치: `packages/ui/src/shared/lib/supabase.ts`.
- `VITE_DATA_SOURCE === 'supabase'`이고 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 모두 있을 때 실제 클라이언트를 만들고, 그렇지 않으면 임포트 시 크래시를 막기 위한 placeholder 클라이언트를 생성합니다(실제 사용은 `VITE_DATA_SOURCE` 가드로 보호).
- 이미지 업로드(어드민)는 Supabase Storage `wedding-images` 버킷을 사용합니다.

## 컨텍스트 / 훅

- `entities/WeddingInvitation/Context.tsx` — `InvitationProvider`로 `WeddingInvitation` 데이터를 하위 위젯에 주입합니다(뷰어와 어드민 모두 사용).
- `entities/WeddingInvitation/hooks/useInvitation.ts` — 슬러그로 청첩장을 조회하는 훅(`{ invitation, loading, error }`). 뷰어의 `/` 라우트가 사용합니다.
- `features/lib/hooks/useCurrentMenuByScroll` — 본문 스크롤 위치로 현재 메뉴를 추적.

## 관련 문서

- 엔티티 필드 상세와 테이블 매핑은 [`data-model.md`](./data-model.md).
- 위젯이 화면에 조립되는 방식은 [`invitation-app.md`](./invitation-app.md).
