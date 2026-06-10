# momozzang

픽셀/싸이월드 감성의 **모바일 청첩장** 모노레포입니다. 하객용 청첩장 뷰어(`momozzang-invitation`)와 청첩장 데이터 관리 어드민(`momozzang-admin`), 그리고 두 앱이 공유하는 UI/도메인/데이터 레이어 패키지(`@momozzang/ui`)로 구성됩니다.

> 이 문서는 저장소의 허브입니다. 영역별 상세 스펙은 [`docs/`](./docs) 폴더를 참조하세요.

## 구성

- `apps/momozzang-invitation` — 청첩장 뷰어 (하객용 공개 화면). 슬러그로 청첩장을 조회해 인트로 → 본문 흐름으로 보여줍니다.
- `apps/momozzang-admin` — 청첩장 데이터 관리 어드민. 슬러그로 데이터를 불러와 이미지/갤러리를 편집하고 저장합니다.
- `packages/ui` — 패키지명 `@momozzang/ui`. 두 앱이 공유하는 UI 컴포넌트, 도메인 엔티티(`WeddingInvitation`, `GuestBook`), Repository 데이터 레이어를 담습니다.

스택: React 19, Vite 7, TypeScript 5.8, react-router-dom 7, @tanstack/react-query 5, Supabase JS. 컴파일 시 `babel-plugin-react-compiler`를 사용합니다. 패키지 매니저는 **pnpm**이며 워크스페이스(`apps/*`, `packages/*`)로 묶여 있습니다.

## 자주 쓰는 명령어

저장소 루트에서 실행합니다.

```bash
# 의존성 설치
pnpm install

# 전체 앱 동시 실행 / 빌드
pnpm dev          # pnpm -r dev
pnpm build        # pnpm -r build

# 앱별 개발 서버
pnpm dev:invitation     # invitation 앱 dev 서버
pnpm dev:admin          # admin 앱 dev 서버 (port 3002)

# 앱별 빌드
pnpm build:invitation
pnpm build:admin

# 앱별 lint (각 앱 디렉토리의 스크립트)
pnpm --filter momozzang-invitation lint
pnpm --filter momozzang-admin lint

# 데이터 마이그레이션 (invitation 앱 전용 스크립트)
pnpm --filter momozzang-invitation migrate
```

각 앱(`momozzang-invitation`, `momozzang-admin`)의 자체 스크립트는 `dev`(vite), `build`(`tsc -b && vite build`), `lint`(`eslint .`), `preview`입니다. `momozzang-invitation`은 추가로 `migrate`(`tsx src/features/migration/migrateData.ts`) 스크립트를 가집니다.

> 비고: 이 저장소에는 루트 통합 테스트 스크립트(`pnpm test` 등)나 통합 lint 스크립트(`pnpm lint:all` 등)가 **없습니다.** lint는 위와 같이 앱별 `--filter`로 실행하세요.

## 디렉토리 구조

```
momozzang/
├── apps/
│   ├── momozzang-invitation/   # 하객용 청첩장 뷰어
│   │   └── src/
│   │       ├── page/           # AppWrapper, Invitation, InvitationById, InvitationExperience
│   │       ├── styles/
│   │       ├── Layout.tsx
│   │       └── main.tsx
│   └── momozzang-admin/        # 청첩장 관리 어드민
│       └── src/
│           ├── pages/          # AdminPage
│           ├── features/       # invitation/api (query/mutation/upload 훅)
│           ├── widgets/        # GalleryManager (@dnd-kit 갤러리 정렬)
│           └── main.tsx
├── packages/
│   └── ui/                     # @momozzang/ui (공유 패키지)
│       └── src/
│           ├── shared/         # ui 컴포넌트, lib(supabase), hooks, styles, util, assets
│           ├── entities/       # WeddingInvitation, GuestBook (모델 + Repository)
│           ├── features/       # 도메인 훅 (useCurrentMenuByScroll 등)
│           ├── widgets/        # invitation 위젯 (Home, Gallery, MiniRoom, Direction, Account, Music 등)
│           └── pages/          # WeddingInvitation (본문 페이지 조립)
├── docs/                       # 상세 스펙 문서 (이 문서가 진입점)
├── .claude/                    # Claude Code 에이전트/커맨드
├── package.json                # 루트 워크스페이스 + 스크립트
├── vercel.json                 # SPA rewrite + /api 프록시
└── tsconfig.base.json          # 공통 TS 설정
```

## 데이터 소스 분기 (`VITE_DATA_SOURCE`)

데이터 레이어는 Repository 패턴 + 팩토리로 구현되며, 환경변수 `VITE_DATA_SOURCE` 값으로 구현체를 분기합니다.

- `VITE_DATA_SOURCE === 'supabase'` 일 때 → Supabase 구현체 사용
  - 청첩장: `SupabaseInvitationRepository` (`packages/ui/src/entities/WeddingInvitation/repositories/`)
  - 방명록: `SupabaseGuestBookRepository` (`packages/ui/src/entities/GuestBook/api/`)
- 그 외(기본) → 로컬/API 구현체 사용
  - 청첩장: `LocalInvitationRepository`
  - 방명록: `ApiGuestBookRepository`

분기 진입점은 팩토리 함수입니다: `invitationRepositoryFactory.ts`의 `getInvitationRepository()`, `guestBookRepositoryFactory.ts`의 `getGuestBookRepository()`. Supabase 클라이언트는 `packages/ui/src/shared/lib/supabase.ts`에서 생성합니다.

## 환경변수 (키 이름만)

값은 `.env` 파일에서 관리하며 **이 문서를 포함한 어떤 산출물에도 값을 적지 않습니다.** 사용되는 키는 다음과 같습니다.

| 키 | 사용처 | 설명 |
|----|--------|------|
| `VITE_DATA_SOURCE` | 공통 | `'supabase'`면 Supabase, 아니면 로컬/API 구현으로 분기 |
| `VITE_SUPABASE_URL` | 공통 | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 공통 | Supabase anon 키 |
| `VITE_NAVER_MAP_CLIENT_ID` | 공통 | 네이버 지도 클라이언트 ID (Direction/지도 위젯) |
| `VITE_KAKAO_APP_KEY` | admin | 카카오 앱 키 |
| `VITE_KAKAO_TEMPLATE_ID` | admin | 카카오 공유 템플릿 ID |

`.env` 위치: 루트 `.env`, `apps/momozzang-invitation/.env`, `apps/momozzang-admin/.env`. `.gitignore`에 `.env*`가 등록되어 있어 커밋되지 않습니다.

## 배포 / 프록시

- 배포는 루트 `vercel.json`을 기준으로 합니다.
- SPA rewrite: `/(.*)` → `/index.html` (클라이언트 라우팅 지원).
- API 프록시: `/api/:path*` → 외부 백엔드(`momozzang.onrender.com`)의 `/api/:path*`로 rewrite. 즉 별도의 외부 API 백엔드가 존재합니다.
- 로컬 개발 시 invitation 앱은 `apps/momozzang-invitation/vite.config.ts`에서 `/api`를 `http://localhost:8081`로 프록시합니다(외부 백엔드 로컬 대체).

## 코딩 컨벤션

- **언어/스택**: React 19 + Vite + TypeScript. 함수형 컴포넌트, hooks 중심.
- **디렉토리**: `packages/ui`는 FSD(Feature-Sliced Design) 스타일 레이어를 따릅니다 — `shared/` → `entities/` → `features/` → `widgets/` → `pages/` (하위가 상위를 참조).
- **import 별칭**: 앱 tsconfig의 `paths`로 정의됩니다.
  - `@momozzang/ui/*` → `packages/ui/src/*` (invitation 앱)
  - `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*` → `packages/ui/src/{widgets,features,entities,shared}/*`
  - 별칭 해석은 Vite `vite-tsconfig-paths` 플러그인이 담당합니다. 자세한 내용은 [`docs/shared-ui.md`](./docs/shared-ui.md) 참조.
- **포매팅**: Prettier(`singleQuote: true`, `semi: true`, `trailingComma: 'all'`, `printWidth: 100`). 린트는 ESLint(`eslint:recommended` + React + TS).
- **커밋 메시지**: 한글 혼용 `feat:` / `fix:` 접두어를 사용합니다. 예) `feat(admin): 갤러리 드래그 정렬 추가`, `fix: AboutUs 간격 수정`.
- **비밀값 금지**: 토큰/URL/키 값을 코드/문서/커밋에 남기지 않습니다.

## 작업 라우팅 (언제 무엇을 쓰는가)

이 저장소에는 일상 개발용 에이전트 `dev`, 사용자 관점 검증용 `e2e-tester`, 그리고 장기 구현 루프 `/harness`가 있습니다.

| 도구 | 언제 사용 | 산출물 |
|------|-----------|--------|
| `dev` 에이전트 | 범위가 명확한 단발성 개발 작업(버그 수정, 소규모 기능, 리팩터링) | 코드 변경 + 커밋 |
| `e2e-tester` 에이전트 | 이미 만들어진 화면을 사용자처럼 검증(클릭/입력/라우팅/방명록/갤러리 정렬). 하네스 밖에서도 단독 사용 | 검증 보고서(코드 미수정) |
| `/harness` (planner/generator/evaluator) | 한두 문장 아이디어 → 완성 기능까지 도는 장기 스프린트 루프 | SPEC/계약/QA_FINDINGS + 구현 |

- 상세 스펙은 [`docs/`](./docs)를 참조하세요. 진입점은 [`docs/overview.md`](./docs/overview.md)입니다.
- 개발은 [`dev`](./.claude/agents/dev.md), E2E 검증은 [`e2e-tester`](./.claude/agents/e2e-tester.md), 큰 기능 구현은 `/harness`를 사용하세요.
- `/harness`의 planner/generator/evaluator 3종 에이전트(`.claude/agents/harness-*.md`)와 `.claude/commands/harness.md`는 하네스 전용이며, 일상 개발 라우팅에서는 `dev`/`e2e-tester`를 우선합니다.
