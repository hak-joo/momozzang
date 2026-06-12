# 프론트엔드 개발 컨벤션

새 UI를 작성·수정할 때 그대로 따를 규칙입니다. 이 문서는 루트 [`CLAUDE.md`](../CLAUDE.md)의 "코딩 컨벤션"을 **대체가 아니라 보완**합니다 — CLAUDE.md가 얕게 다루는 디자인 시스템/스타일링/패턴 영역을 깊게 채우며, 중복 항목은 CLAUDE.md와 동일하게 진술합니다(상충 규칙을 새로 만들지 않습니다).

> 관련 문서: [`overview.md`](./overview.md) · [`design-system.md`](./design-system.md) · [`ui-logic.md`](./ui-logic.md) · [`shared-ui.md`](./shared-ui.md)

## 1. 토큰 우선

- 색상/폰트/스페이싱/그림자는 **하드코딩 값 대신 CSS 변수 토큰과 role mixin**을 사용합니다.
- 색상: `--color-*`, 형태: `--button-*`/`--icon-button-*`, 글자 크기: role mixin(`@mixin typo-*`). 토큰 목록은 [`design-system.md`](./design-system.md) 참조.
- 새 색/스타일이 필요하면 임의 값을 박지 말고 **토큰을 추가**합니다(테마 색은 `utils.ts`의 `PALETTES`, 정적/형태 토큰은 `theme.css`).
- 새 글자 스타일은 px 직접 지정 대신 `typo-heading*`/`typo-body*`/`typo-desc*` role mixin을 씁니다.

## 2. 스타일링 — CSS Modules + clsx

- 컴포넌트별 `*.module.css`로 스타일을 작성합니다.
- 클래스 합성은 **`clsx`**로 합니다(예: `clsx(styles.button, sizeClass, variantClass)`).
- 인라인 동적 값은 `style` prop에 **CSS 변수**로 전달합니다(예: `style={{ '--dot-offset': '16px' }}` → CSS에서 `var(--dot-offset, 16px)`).
- role mixin은 `postcss-mixins`가 `typography.css`를 주입해 `@mixin typo-*`로 호출합니다. 파이프라인 상세는 [`ui-logic.md`](./ui-logic.md) §6 참조.

## 3. FSD 레이어 의존 방향

- `packages/ui`는 FSD 레이어를 따릅니다: **`shared → entities → features → widgets → pages`** (하위가 상위를 참조).
- 역방향 import(예: `shared`가 `widgets`를 참조)를 만들지 않습니다.

## 4. import 별칭

각 앱 tsconfig에 정의된 별칭을 사용합니다(직접 상대 경로 `../../packages/ui/...`로 우회하지 않습니다).

| 별칭 | 매핑 | 사용처 |
|------|------|--------|
| `@momozzang/ui/*` | `packages/ui/src/*` | invitation 앱 |
| `@widgets/*` | `packages/ui/src/widgets/*` | 공통 |
| `@features/*` | `packages/ui/src/features/*` | 공통 |
| `@entities/*` | `packages/ui/src/entities/*` | 공통 |
| `@shared/*` | `packages/ui/src/shared/*` | 공통 |

별칭 해석은 Vite `vite-tsconfig-paths` 플러그인이 담당합니다(CLAUDE.md 코딩 컨벤션과 동일).

## 5. 컴포넌트 작성 규칙

- **함수형 컴포넌트 + hooks** 중심. props는 인터페이스/타입으로 명시합니다(예: `ButtonProps`, `Box`의 `Props`).
- 폴더당 배럴 패턴: `Component.tsx` + `Component.module.css` + `index.ts`(재노출). 기존 `shared/ui` 컨벤션 근거(예: `Box/`, `DdayBadge/`, `Toast/`).
  - 단, 한 폴더가 여러 변형을 담을 수 있습니다(예: `Button/`은 `BaseButton.tsx` + `IconButton.tsx`를 `index.ts`가 함께 재노출). 실제 구조는 [`ui-logic.md`](./ui-logic.md) §1 참조.
- ref 전달이 필요하면 `forwardRef`를 사용합니다(예: `Button`, `IconButton`).
- **스텁 금지**: 클릭만 되고 동작 없는 버튼, 표시만 되는 기능, 핵심 로직을 대체한 `TODO`는 미완성으로 간주합니다.

## 6. 상태 / 쿼리 / Repository 패턴

- 서버 상태는 **`@tanstack/react-query`**로 다룹니다.
- 데이터 접근은 **Repository 팩토리 경유**(`getInvitationRepository`, `getGuestBookRepository`). Supabase 클라이언트를 컴포넌트에서 **직접 호출하지 않습니다.**
- `VITE_DATA_SOURCE` 분기를 **우회하지 않습니다**(팩토리가 `'supabase'` 여부로 구현체를 고름).
- UI는 조회 데이터를 `InvitationProvider`/`useInvitation` 컨텍스트로 소비합니다(상세 [`ui-logic.md`](./ui-logic.md) §5).

## 7. 이미지 규칙

- 신규 업로드는 **객체 키만 저장**합니다(절대 URL 저장 금지).
- 렌더 시점에 `buildImageUrl` / `buildThumbnailUrl`(`packages/ui/src/shared/lib/imageUrl.ts`)을 **1회 경유**해 최종 URL을 만듭니다.
- 절대/`data:`/`blob:` URL은 헬퍼가 그대로 통과시킵니다(하위 호환). 헬퍼 계약은 [`ui-logic.md`](./ui-logic.md) §4 참조.

## 8. 네이밍 / 포매팅 / 커밋

- **Prettier**: `singleQuote: true`, `semi: true`, `trailingComma: 'all'`, `printWidth: 100` (CLAUDE.md 코딩 컨벤션과 동일).
- **린트**: ESLint(`eslint:recommended` + React + TS). 앱별 실행: `pnpm --filter momozzang-invitation lint` / `pnpm --filter momozzang-admin lint`.
- **커밋 메시지**: 한글 혼용 `feat:` / `fix:` 접두어. 예) `feat(admin): 갤러리 드래그 정렬 추가`, `fix: AboutUs 간격 수정`.
- **비밀값 금지**: 토큰/URL/키 **값**을 코드·문서·커밋에 남기지 않습니다(환경변수는 키 이름만). 색상 HEX는 비밀이 아니므로 토큰 문서화에 사용 가능합니다.
