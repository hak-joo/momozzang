# momozzang — 에이전트 공통 컨텍스트

픽셀/싸이월드 감성의 **모바일 청첩장** 모노레포입니다. 하객용 청첩장 뷰어(`momozzang-invitation`)와 청첩장 데이터 관리 어드민(`momozzang-admin`), 그리고 두 앱이 공유하는 UI/도메인/데이터 레이어 패키지(`@momozzang/ui`)로 구성됩니다.

> **이 문서는 도구 무관 정본입니다.** Claude Code · Antigravity · Gemini CLI 등 어떤 에이전트로 작업하든 이 파일의 규칙이 적용됩니다.
> 도구별 실행 방식은 각각 [`CLAUDE.md`](./CLAUDE.md), [`.agent/rules/`](./.agent/rules) 를 참조하세요.
> 영역별 상세 스펙은 [`docs/`](./docs) 폴더에 있으며 진입점은 [`docs/overview.md`](./docs/overview.md) 입니다.

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

> **비고: 이 저장소에는 루트 통합 테스트 스크립트(`pnpm test` 등)나 통합 lint 스크립트(`pnpm lint:all` 등)가 없습니다.** 존재하지 않는 스크립트를 호출하지 마세요. lint는 위와 같이 앱별 `--filter`로 실행합니다.

## 디렉토리 구조

```
momozzang/
├── apps/
│   ├── momozzang-invitation/src/   # page/(AppWrapper, OnboardingPage, InvitationById,
│   │                               #       InvitationExperience), styles/, Layout.tsx, main.tsx
│   └── momozzang-admin/src/        # pages/(Login, Approvals, Apply, Edit, Admin),
│                                   # features/invitation/api, widgets/GalleryManager
├── packages/ui/src/            # @momozzang/ui — FSD 레이어
│   ├── shared/                 # ui 컴포넌트, lib(supabase), hooks, styles, util, assets
│   ├── entities/               # WeddingInvitation, GuestBook (모델 + Repository)
│   ├── features/               # 도메인 훅 (useCurrentMenuByScroll 등)
│   ├── widgets/                # invitation 위젯 (Home, Gallery, MiniRoom, Direction, Account…)
│   └── pages/                  # WeddingInvitation (본문 페이지 조립)
├── workers/                    # Cloudflare Workers (pnpm 워크스페이스 밖, 각자 npm + wrangler)
│   ├── upload/                 # 어드민 이미지 업로드 중개 → R2 (공개 POST 엔드포인트)
│   └── cron/                   # Supabase keep-alive + DB 백업 (스케줄 전용, 공개 API 없음)
├── docs/                       # 상세 스펙 문서
├── .harness/                   # 인수인계 산출물 (SPEC/계약/QA/HANDOFF) + 템플릿
├── .claude/                    # Claude Code 전용 에이전트/커맨드
├── .agent/                     # Antigravity 전용 규칙/워크플로
├── AGENTS.md                   # ← 이 문서 (도구 무관 정본)
├── package.json / vercel.json / tsconfig.base.json
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

값은 `.env` 파일에서 관리하며 **이 문서를 포함한 어떤 산출물에도 값을 적지 않습니다.**

| 키 | 사용처 | 설명 |
|----|--------|------|
| `VITE_DATA_SOURCE` | 공통 | `'supabase'`면 Supabase, 아니면 로컬/API 구현으로 분기 |
| `VITE_SUPABASE_URL` | 공통 | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 공통 | Supabase **공개** 키 — publishable(`sb_publishable_…`) 또는 legacy anon. secret/service_role 키를 넣으면 빌드가 중단된다(`scripts/check-public-env.mjs`) |
| `SUPABASE_SECRET_KEY` | 마이그레이션 스크립트 | RLS 를 우회하는 서버 전용 키. **`VITE_` 를 붙이지 않는다** — 붙이면 클라이언트 번들에 인라인되어 공개된다 |
| `VITE_NAVER_MAP_CLIENT_ID` | 공통 | 네이버 지도 클라이언트 ID (Direction/지도 위젯) |
| `VITE_KAKAO_APP_KEY` | admin | 카카오 앱 키 |
| `VITE_KAKAO_TEMPLATE_ID` | admin | 카카오 공유 템플릿 ID |
| `VITE_APPLY_URL` | invitation | 온보딩 CTA 가 가리킬 신청 페이지 절대 URL. 비어 있으면 CTA 앵커를 렌더하지 않음 |
| `VITE_EDIT_URL` | invitation | 랜딩의 `내 청첩장 수정하기` 앵커가 가리킬 수정 페이지 절대 URL. 비어 있으면 앵커를 렌더하지 않음 |
| `VITE_ADMIN_EMAILS` | admin | 쉼표로 구분한 관리자 이메일 목록(로컬 데이터소스 전용. Supabase 경로는 `admin_users` 테이블이 정본) |
| `VITE_LOCAL_ADMIN_PASSWORD` | admin | 로컬 데이터소스 전용 관리자 비밀번호 |
| `VITE_INVITATION_BASE_URL` | admin | 신청 접수 완료 카드가 안내할 공개 청첩장 베이스 URL. 비어 있으면 절대 URL 대신 `/<슬러그>` 경로만 안내 |

`.env` 위치: 루트 `.env`, `apps/momozzang-invitation/.env`, `apps/momozzang-admin/.env`. `.gitignore`에 `.env*`가 등록되어 있어 커밋되지 않습니다.

## 배포 / 프록시

- 배포는 루트 `vercel.json`을 기준으로 합니다.
- SPA rewrite: `/(.*)` → `/index.html` (클라이언트 라우팅 지원).
- API 프록시: `/api/:path*` → 외부 백엔드(`momozzang.onrender.com`)의 `/api/:path*`로 rewrite. 즉 별도의 외부 API 백엔드가 존재합니다.
- 로컬 개발 시 invitation 앱은 `apps/momozzang-invitation/vite.config.ts`에서 `/api`를 `http://localhost:8081`로 프록시합니다(외부 백엔드 로컬 대체).

## 코딩 컨벤션

- **언어/스택**: React 19 + Vite + TypeScript. 함수형 컴포넌트, hooks 중심.
- **디렉토리**: `packages/ui`는 FSD(Feature-Sliced Design) 레이어를 따릅니다 — `shared/` → `entities/` → `features/` → `widgets/` → `pages/` (하위가 상위를 참조). **역방향 import 금지.**
- **import 별칭**: 앱 tsconfig의 `paths`로 정의됩니다. 상대 경로(`../../packages/ui/...`)로 우회하지 않습니다.
  - `@momozzang/ui/*` → `packages/ui/src/*` (invitation 앱)
  - `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*` → `packages/ui/src/{widgets,features,entities,shared}/*`
  - 별칭 해석은 Vite `vite-tsconfig-paths` 플러그인이 담당합니다. 상세는 [`docs/shared-ui.md`](./docs/shared-ui.md) 참조.
- **스타일링**: 컴포넌트별 `*.module.css` + `clsx` 클래스 합성. 색/폰트/크기는 하드코딩 대신 **CSS 변수 토큰과 role mixin(`@mixin typo-*`)** 을 사용합니다. 상세는 [`docs/design-system.md`](./docs/design-system.md), [`docs/ui-conventions.md`](./docs/ui-conventions.md) 참조.
- **포매팅**: Prettier(`singleQuote: true`, `semi: true`, `trailingComma: 'all'`, `printWidth: 100`). 린트는 ESLint(`eslint:recommended` + React + TS).
- **커밋 메시지**: 한글 혼용 `feat:` / `fix:` 접두어를 사용합니다. 예) `feat(admin): 갤러리 드래그 정렬 추가`, `fix: AboutUs 간격 수정`.
- **비밀값 금지**: 토큰/URL/키 **값**을 코드/문서/커밋에 남기지 않습니다. 키 *이름*만 언급합니다.

## 작업 전 읽을 문서

| 작업 성격 | 읽을 문서 |
|---|---|
| 전반 파악 | [`docs/overview.md`](./docs/overview.md) |
| 뷰어 앱 | [`docs/invitation-app.md`](./docs/invitation-app.md) |
| 어드민 앱 | [`docs/admin-app.md`](./docs/admin-app.md) |
| 데이터/엔티티/Supabase | [`docs/data-model.md`](./docs/data-model.md) |
| 공유 패키지 구조 | [`docs/shared-ui.md`](./docs/shared-ui.md) |
| 색/타이포/토큰 | [`docs/design-system.md`](./docs/design-system.md) |
| 공유 컴포넌트·UI 로직 | [`docs/ui-logic.md`](./docs/ui-logic.md) |
| UI 작성 규칙 | [`docs/ui-conventions.md`](./docs/ui-conventions.md) |

## 도구 간 협업 프로토콜

이 저장소는 Claude Code(계획·검증)와 Antigravity(구현·시각 검증)를 **하나의 문서 버스로 인수인계**하며 함께 씁니다. 도구끼리 서로를 호출하지 않으며, 릴레이는 사람이 창을 전환해 수행합니다. 인수인계 정본은 커밋된 마크다운입니다.

- **Heavy 레인** (신규 기능, 다중 파일 리팩터링): `.harness/runs/<슬러그>/` 아래 `SPEC.md` → `SPRINT_CONTRACT_<N>.md` → 구현 → `QA_FINDINGS_<N>.md` 순환. 단계 전환마다 `HANDOFF.md` 갱신.
- **Light 레인** (단일 위젯 수정, 스타일 조정, 버그): `.harness/templates/HANDOFF.md` 한 장 또는 지시문만으로 구현 → 검증 → PR.

역할 배치와 각 도구의 진입점은 [`CLAUDE.md`](./CLAUDE.md) 와 [`.agent/workflows/`](./.agent/workflows) 를 참조하세요.

**동시 편집 금지** — 두 도구가 하나의 워킹 트리를 공유합니다. 한 사이클에서는 한쪽만 쓰기 작업을 수행합니다.
