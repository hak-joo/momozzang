# 디자인 시스템

momozzang의 픽셀/싸이월드 감성을 떠받치는 **디자인 토큰**(색상·타이포·폰트·형태)과 **모바일 프레임/반응형 기준**을 실제 소스를 근거로 정리합니다. 새 UI를 만들 때 하드코딩 값 대신 여기에 정의된 토큰과 role mixin을 사용하세요.

> 관련 문서: [`overview.md`](./overview.md) · [`ui-logic.md`](./ui-logic.md) · [`ui-conventions.md`](./ui-conventions.md) · [`shared-ui.md`](./shared-ui.md)

## 1. 색상 토큰

색상 토큰은 두 곳에서 정의됩니다. 토큰별로 **정의 위치가 다르므로** 주의하세요.

- **정적 기본값(`:root`)**: `packages/ui/src/shared/styles/theme.css` — 빌드 시점에 항상 존재하는 PURPLE 기준 기본값.
- **런타임 주입 팔레트**: `packages/ui/src/shared/styles/utils.ts`의 `PALETTES` — `getThemeVariables(themeColor)`가 테마(PURPLE/PINK)에 맞는 CSS 변수 객체를 만들어 컨테이너 `style`로 주입.

### 1.1 Basic (테마 무관 공통)

`theme.css`의 `:root`와 `utils.ts`의 `PALETTES.BASIC` **둘 다**에 정의됩니다.

| 토큰 | 값(theme.css 기준) | 의미 |
|------|---------------------|------|
| `--color-basic-white` | `#ffffff` | 흰색 |
| `--color-basic-white50` | `rgba(255, 255, 255, 0.5)` | 50% 흰색 |
| `--color-basic-black` | `#484848` | 기본 텍스트(짙은 회색) |
| `--color-basic-black50` | `rgba(0, 0, 0, 0.5)` | 50% 검정 |

### 1.2 Main / Sub 단계

`--color-main-100`~`600`, `--color-sub-100`~`600`은 `theme.css`의 `:root`에 **PURPLE 기본값**이 정적으로 박혀 있고(주석 `/* Main (Default: Purple) */`), 런타임에는 `utils.ts`의 `PALETTES.PURPLE` / `PALETTES.PINK`에서 테마에 맞는 값이 주입됩니다.

| 토큰 그룹 | 토큰 | 정적 기본값(PURPLE, theme.css) | 런타임 출처 |
|-----------|------|--------------------------------|-------------|
| Main | `--color-main-100`~`600` | `#d5d2f6` / `#d1cbe2` / `#aca4ff` / `#967eb6` / `#7871c2` / `#5129b5` | `utils.ts` `PALETTES.PURPLE` / `PALETTES.PINK` |
| Sub | `--color-sub-100`~`600` | `#f4faff` / `#ebf6ff` / `#c2e4ff` / `#a1ceff` / `#95aeff` / `#76a3ff` | `utils.ts` `PALETTES.PURPLE` / `PALETTES.PINK` |

### 1.3 Gradient

| 토큰 | 정적 기본값(PURPLE, theme.css) | 런타임 출처 |
|------|--------------------------------|-------------|
| `--color-gradient-start` | `#aca4ff` | `utils.ts` `PALETTES.PURPLE`/`PINK` |
| `--color-gradient-end` | `#6aa3ff` | `utils.ts` `PALETTES.PURPLE`/`PINK` |

### 1.4 Shadow / box-shadow (utils.ts 전용 — theme.css에 없음)

다음 4개 토큰은 **`utils.ts`의 `PALETTES.PURPLE`/`PALETTES.PINK`에만** 정의되어 있습니다. `theme.css`의 `:root`에는 존재하지 않으므로, 테마가 주입되지 않은 상태에서는 비어 있습니다.

| 토큰 | 정의 위치 | 비고 |
|------|-----------|------|
| `--color-shadow-100` | `utils.ts` (PURPLE/PINK) | 예: PURPLE `rgba(176, 196, 255, 0.30)` |
| `--color-shadow-200` | `utils.ts` (PURPLE/PINK) | 예: PURPLE `rgba(51, 48, 255, 0.10)` |
| `--box-shadow-main` | `utils.ts` (PURPLE/PINK) | inset 그림자(위 두 shadow 변수 참조) |
| `--box-shadow-sub` | `utils.ts` (PURPLE/PINK) | inset 그림자(약한 버전) |

### 1.5 형태 토큰 (theme.css 전용 — utils.ts에 없음)

버튼/아이콘버튼 형태 토큰은 **`theme.css`의 `:root`에만** 정의됩니다. 테마와 무관하게 고정값입니다.

| 토큰 | 값 | 용도 |
|------|----|------|
| `--button-radius` | `8px` | 버튼 모서리 |
| `--button-font-weight` | `700` | 버튼 글자 굵기 |
| `--button-shadow` | `0 8px 18px rgba(84, 64, 171, 0.25)` | 버튼 외부 그림자 |
| `--button-inset-shadow` | `inset 0 2px 6px rgba(255, 255, 255, 0.55)` | 버튼 내부 하이라이트 |
| `--icon-button-radius` | `18px` | 아이콘버튼 모서리 |
| `--icon-button-hover-bg` | `rgba(149, 174, 255, 0.2)` | 아이콘버튼 hover 배경 |
| `--icon-button-shadow` | `0 6px 12px rgba(81, 41, 133, 0.25)` | 아이콘버튼 그림자 |

## 2. 테마 시스템 (출처: `packages/ui/src/shared/styles/utils.ts`)

- 런타임에 주입되는 팔레트는 **PURPLE / PINK 두 종**뿐입니다(`PALETTES`에 `BASIC`/`PURPLE`/`PINK`만 존재).
- 기본값은 **PURPLE**입니다. `getThemeVariables(themeColor)`는 `themeColor === 'PINK' ? 'PINK' : 'PURPLE'`로 분기하므로, `PINK`가 아니면 모두 PURPLE로 폴백합니다.
- `getThemeVariables`는 `{ ...PALETTES.BASIC, ...themeVars }`를 `CSSProperties`로 반환합니다. 호출 측은 이를 컨테이너 `style`에 펼쳐 CSS 변수로 주입합니다.
- `THEME_HUES`에는 `PURPLE: 270`, `PINK: 330` 외에 `GREEN: 120`, `BLUE: 210`이 남아 있으나, 이 둘은 **deprecated(타입 호환용)** 항목입니다(소스 주석 `Deprecated`). `PALETTES`에는 GREEN/BLUE 색 팔레트가 없으므로 색조(hue)값만 남은 상태입니다.

### 색조(Hue) 변환 연결

- `getThemeHue(themeColor)`는 테마의 Hue 숫자를 반환하며, 인자가 없으면 `PURPLE_HUE`(= `270`)를 반환합니다.
- 이 값은 이미지 색조 변환(`ThemedImage` / `useImageHueShift`)의 `targetHue`로 전달됩니다(예: `Box.tsx`가 `getThemeHue(customization?.themeColor)`를 `<ThemedImage targetHue={...}>`로 넘김). 색조 변환 로직 상세는 [`ui-logic.md`](./ui-logic.md)를 참조하세요.

## 3. 타이포그래피 (출처: `packages/ui/src/shared/styles/typography.css`)

### 3.1 크기 토큰 (px 원시 토큰)

`:root`에 폰트 크기/라인하이트/자간 토큰이 정의됩니다. 크기 단계는 **22 / 18 / 16 / 14 / 13 / 12** 6종입니다.

| 크기 토큰 | line-height 토큰 | letter-spacing 토큰 |
|-----------|------------------|----------------------|
| `--font-size-22` (22px) | `--line-height-22` (28px) | `--letter-spacing-22` (-0.03em) |
| `--font-size-18` (18px) | `--line-height-18` (24px) | `--letter-spacing-18` (-0.03em) |
| `--font-size-16` (16px) | `--line-height-16` (22px) | `--letter-spacing-16` (-0.04em) |
| `--font-size-14` (14px) | `--line-height-14` (20px) | `--letter-spacing-14` (-0.04em) |
| `--font-size-13` (13px) | `--line-height-13` (16px) / `--line-height-13-multi` (19px) / `--line-height-13-heading` (15px) | `--letter-spacing-13` (-0.04em) |
| `--font-size-12` (12px) | `--line-height-12` (14px) | `--letter-spacing-12` (-0.05em) |

이 밖에 `--font-weight-bold` (700)가 정의됩니다.

### 3.2 role mixin (권장 사용 단위)

새 글자 스타일은 px를 직접 지정하지 말고 **role mixin**을 쓰세요. `@mixin typo-*` 호출은 `*.module.css`에서 가능합니다(파이프라인은 [`ui-logic.md`](./ui-logic.md) 참조). 실재하는 role mixin은 다음 **10종**입니다.

| role mixin | 합성 내용 |
|------------|-----------|
| `typo-heading1` | `font-bold` + `font-22` |
| `typo-heading2` | `font-bold` + `font-18` |
| `typo-heading3` | `font-bold` + `font-16` |
| `typo-heading4` | `font-bold` + `font-14` |
| `typo-heading5` | `font-bold` + `font-13-heading` |
| `typo-body1` | `font-16` |
| `typo-body2` | `font-14` |
| `typo-desc1-single` | `font-13` |
| `typo-desc1-multi` | `font-13-multi` |
| `typo-desc2` | `font-12` |

> 이 목록 외의 role mixin(예: `typo-heading6`, `typo-body3`)은 **존재하지 않습니다.** 하위 빌딩 블록 mixin으로 `font-bold`, `font-22/18/16/14/13/13-multi/13-heading/12`가 있습니다.

## 4. 폰트 패밀리 (출처: `apps/momozzang-invitation/src/styles/global.css`)

`global.css`의 `:root`는 다음 **5개 폰트 CSS 변수**를 정의합니다.

| CSS 변수 | 변수가 참조하는 패밀리(스택) | 대표 용도 |
|----------|------------------------------|-----------|
| `--font-DungGeunMo` | `'DungGeunMo', 'Noto Sans KR', cursive` | 픽셀 감성 헤딩/배지 |
| `--font-PyeongChang` | `'PyeongChang', 'Noto Sans KR', sans-serif` | 기본 본문/버튼 (`html, body`·`button` 둘 다 적용) |
| `--font-Wanted-Sans` | `'Wanted Sans', 'Noto Sans KR', sans-serif` | Direction 등 |
| `--font-DepartureMono` | `'DepartureMono', 'Noto Sans KR', monospace` | 숫자/D-Day |
| `--font-PfStardust` | `'PfStardust', 'Noto Sans KR', sans-serif` | MiniRoom 등 |

- `html, body`와 `button`은 둘 다 `font-family: var(--font-PyeongChang)`을 사용합니다(기본 본문/버튼 폰트).
- 각 폰트는 `@font-face`로 jsDelivr CDN에서 로드되며 `font-display: swap`을 사용합니다.
- `@font-face` 선언명과 CSS 변수 참조명, 로드하는 woff2 파일명이 모두 `PyeongChang`(대문자 C)으로 일치합니다.

## 5. 모바일 프레임 / 반응형 (출처: `apps/momozzang-invitation/src/styles/global.css`)

청첩장은 단일 모바일 프레임(`.app-frame`) 안에서 동작합니다.

| 속성 | 값 | 비고 |
|------|----|------|
| `max-width` | `430px` | 프레임 최대 폭 |
| `min-width` | `375px` | 프레임 최소 폭 |
| 높이 | `min-height: 100vh; min-height: 100dvh;` | `dvh`로 모바일 주소창 영역 보정 |
| 정렬 | `flex-direction: column; align-items: center; justify-content: flex-start;` | 세로 스택, 가로 중앙 |
| 스크롤바 | `scrollbar-width: none; -ms-overflow-style: none;` | 스크롤바 숨김 |

`@media (max-width: 430px)` 분기에서 `.app-frame`은 `max-width: 100vw; min-width: 0; border-radius: 0; box-shadow: none;`으로 전환되어, 좁은 화면에서는 프레임 장식 없이 전체 폭을 사용합니다.

`html, body`는 `max-height: 100vh; max-height: 100dvh; overflow-y: hidden; background: #111;`이며, `#root`는 `min-height: 100dvh`입니다.
