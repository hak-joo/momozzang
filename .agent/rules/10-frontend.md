---
description: momozzang UI 작성 규칙 — 토큰 우선, CSS Modules, FSD 레이어, import 별칭
---

# 프론트엔드 작성 규칙

> 상세 정본: [`docs/design-system.md`](../../docs/design-system.md) · [`docs/ui-conventions.md`](../../docs/ui-conventions.md) · [`docs/ui-logic.md`](../../docs/ui-logic.md)
> UI 를 만들거나 고치기 전에 **최소한 `ui-conventions.md` 는 읽는다.**

## 1. 토큰 우선 — 하드코딩 금지

- 색상·폰트·글자 크기·형태 값을 **직접 px/hex 로 박지 않는다.** CSS 변수 토큰과 role mixin 을 쓴다.
  - 색상: `--color-*`
  - 형태: `--button-*`, `--icon-button-*`
  - 글자: role mixin `@mixin typo-heading*` / `typo-body*` / `typo-desc*`
- 새 색/스타일이 필요하면 임의 값을 박지 말고 **토큰을 추가**한다.
  - 테마 색 → `utils.ts` 의 `PALETTES`
  - 정적/형태 토큰 → `theme.css`
- **admin 앱도 동일 규칙**이다. admin 은 공통 SSOT(`packages/ui/src/index.css`)를 `@import` 로 연결해 같은 토큰을 쓴다. 단 admin 모듈 CSS 는 시각 무회귀를 위해 `@mixin typo-*` 전면 도입 대신 **크기 토큰(`var(--font-size-*)`)만** 치환하며, 표준에 없는 비표준 크기(24px·15px)는 raw px 로 보존한다.

## 2. 스타일링 방식

- 컴포넌트별 `*.module.css` 로 작성한다.
- 클래스 합성은 `clsx` 로 한다. 예: `clsx(styles.button, sizeClass, variantClass)`
- 인라인 동적 값은 `style` prop 에 **CSS 변수**로 전달한다. 예: `style={{ '--dot-offset': '16px' }}` → CSS 에서 `var(--dot-offset, 16px)`

## 3. FSD 레이어 의존 방향

- `packages/ui` 는 `shared → entities → features → widgets → pages` 순서를 따른다(하위가 상위를 참조).
- **역방향 import 금지.** 예: `shared` 가 `widgets` 를 참조하면 안 된다.
- 새 코드를 어느 레이어에 둘지 애매하면 가장 낮은 레이어에 두고 위에서 참조한다.

## 4. import 별칭

- 상대 경로(`../../packages/ui/...`)로 우회하지 않고 tsconfig `paths` 별칭을 쓴다.
  - `@momozzang/ui/*` → `packages/ui/src/*` (invitation 앱)
  - `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*` → `packages/ui/src/{widgets,features,entities,shared}/*`

## 5. 재사용 우선

- 새 컴포넌트를 만들기 전에 `packages/ui/src/shared/ui` 에 이미 있는지 확인한다([`docs/ui-logic.md`](../../docs/ui-logic.md) 의 공유 컴포넌트 카탈로그).
- 두 앱 모두에서 쓰일 것이면 앱 안이 아니라 `packages/ui` 에 만든다.

## 6. 스택

- React 19 함수형 컴포넌트 + hooks. 클래스 컴포넌트를 만들지 않는다.
- 데이터 조회는 `@tanstack/react-query`, 라우팅은 `react-router-dom` 7 을 쓴다.
- 데이터 접근은 Repository 패턴을 거친다. 컴포넌트에서 Supabase 클라이언트를 직접 호출하지 않는다.
