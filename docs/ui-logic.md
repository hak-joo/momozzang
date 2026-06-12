# 핵심 UI 로직

`@momozzang/ui`의 **공유 컴포넌트 카탈로그**와, 화면을 떠받치는 핵심 로직(테마 색조 변환, 스크롤 메뉴 추적, 이미지 키→URL 헬퍼, 데이터 레이어→UI 경로, CSS Modules + postcss-mixins 파이프라인)을 실제 소스를 근거로 정리합니다.

> 관련 문서: [`overview.md`](./overview.md) · [`design-system.md`](./design-system.md) · [`ui-conventions.md`](./ui-conventions.md) · [`shared-ui.md`](./shared-ui.md) · [`data-model.md`](./data-model.md)

## 1. 공유 컴포넌트 카탈로그 (출처: `packages/ui/src/shared/ui/`)

아래 디렉토리에 실재하는 항목만 카탈로그에 포함합니다(없는 컴포넌트는 적지 않습니다). `packages/ui/src/shared/ui/` 하위 항목 전체:

| 항목 | 구성 파일 | 역할 / 주요 props |
|------|-----------|--------------------|
| `Accordion` | `Accordion.module.css`, `Content.tsx`, `Trigger.tsx`, `index.ts` | 펼침/접힘. `Trigger`/`Content` 합성 패턴 |
| `Blur` | `Blur.tsx`, `index.ts` | 블러 오버레이 |
| `BottomSheet` | `BottomSheet.module.css`, `Close.tsx`, `Content.tsx`, `index.ts` | 하단 시트. `Content`/`Close` 합성 |
| `Box` | `Box.tsx`, `Box.module.css`, `index.ts` | 콘텐츠 보드. props: `variant`(`primary`/`secondary`/`reversed`/`plain`), `shape`(`rect`/`rounded`), `hasBalloon`, `hasDecoration`, `dotOffset`(`16`/`24`), `wrapperClassName`, `className` |
| `Button` | `BaseButton.tsx`, `IconButton.tsx`, `Button.module.css`, `index.ts` | 버튼/아이콘버튼 — 아래 §1.1 |
| `DdayBadge` | `DdayBadge.tsx`, `DdayBadge.module.css`, `index.ts` | D-Day 배지 |
| `Decoration` | `Decoration.tsx` | 장식 요소 |
| `Dialog` | `Close.tsx`, `Contents.tsx`, `Overlay.tsx`, `Dialog.module.css`, `index.ts` | 다이얼로그. `Overlay`/`Contents`/`Close` 합성 |
| `Icon` | `ClipboardIcon.tsx`, `Phone.tsx`, `PixelChevron.tsx`, `PixelHeart.tsx`, `RabbitEar.tsx`, `Trash.tsx`, `XIcon.tsx` | 개별 픽셀 아이콘 컴포넌트 묶음(단일 `Icon.tsx`가 아님) |
| `IconContainer` | `IconContainer.tsx`, `IconContainer.module.css`, `index.ts` | 아이콘 크기/정렬 래퍼. `size`(`IconSize`) |
| `Input` | `Input.tsx`, `Textarea.tsx`, `Input.module.css`, `index.ts` | 입력/멀티라인 입력 |
| `MessageDialog` | `MessageDialog.tsx`, `MessageDialog.module.css`, `index.ts` | 메시지형 다이얼로그 |
| `MiniMe` | `MiniMe.tsx`, `MiniMe.module.css`, `index.ts` | 미니미 캐릭터 |
| `NaverMap` | `NaverMap.tsx`, `NaverMap.module.css`, `index.ts` | 네이버 지도 임베드 |
| `PixelBadge` | `PixelBadge.tsx`, `PixelBadge.module.css`, `index.ts` | 픽셀 배지 |
| `Primitives` | `Dialog.tsx` | 저수준 다이얼로그 프리미티브(이 디렉토리에는 `Dialog.tsx`만 존재) |
| `ThemedImage` | `ThemedImage.tsx` | 테마 색조 적용 이미지 — 아래 §2 |
| `Toast` | `ToastProvider.tsx`, `ToastContext.ts`, `Toast.module.css`, `index.ts` | 토스트 — 아래 §1.2 |
| `decorations` | `SpeechBubbleDot.tsx` | 말풍선 점 장식 |

### 1.1 Button (`BaseButton.tsx` + `IconButton.tsx`)

`Button` 디렉토리에는 `Button.tsx`가 아니라 `BaseButton.tsx`, `IconButton.tsx`, `index.ts`가 있습니다. 배럴(`index.ts`)이 `Button`/`IconButton`과 타입을 재노출합니다.

- **`Button`** (`BaseButton.tsx`, `forwardRef`): props
  - `size`: `'xs' | 'sm' | 'md' | 'lg'` (기본 `'md'`)
  - `variant`: `'primary' | 'secondary' | 'ghost' | 'plain'` (기본 `'primary'`)
  - `shape`: `'round' | 'rect'` (기본 `'rect'`)
  - `fullWidth`: `boolean` (기본 `false`)
  - 그 외 `ButtonHTMLAttributes`. 클래스는 `clsx`로 `size{Size}`/`variant{Variant}`/`shape{Shape}` 등을 합성.
- **`IconButton`** (`IconButton.tsx`, `forwardRef`): `Button`을 감싸며 `icon: ReactNode`를 `IconContainer`로 감쌈. `size`: `'sm' | 'md' | 'lg'`(기본 `'md'`), `iconSize`(기본 `size`), `variant` 기본 `'ghost'`.

### 1.2 Toast (`ToastProvider.tsx` + `ToastContext.ts`)

Provider/Context 패턴입니다(Radix `@radix-ui/react-toast` 기반).

- `ToastContext.ts`: `ToastVariant = 'info' | 'success' | 'error'`, `ToastOptions`(`title`, `description?`, `duration?`), `ToastApi`(`info`/`success`/`error`), `ToastContext` 생성.
- `ToastProvider.tsx`: 토스트 큐 상태를 관리하고 `info`/`success`/`error` API를 컨텍스트로 제공. `useToast()` 훅은 Provider 밖에서 호출 시 에러를 던짐. 기본 지속시간 `2000ms`.

## 2. 테마 색조 변환 — `ThemedImage` + `useImageHueShift`

- **`ThemedImage`** (`packages/ui/src/shared/ui/ThemedImage/ThemedImage.tsx`): `<img>`를 감싸 색조가 이동된 src를 렌더. props(실제 존재하는 것만):
  - `src: string`
  - `originalHue?: number` — 원본 주조색 Hue(기본 `270`, 보라)
  - `targetHue?: number` — 목표 Hue. 주어지지 않으면 변환하지 않음
  - `strategy?: 'absolute' | 'relative'` (기본 `'absolute'`)
  - `preserveSkinTones?: boolean` (기본 `false`)
  - 그 외 `className`/`style`/`alt` 및 `ImgHTMLAttributes`
- **`useImageHueShift`** (`packages/ui/src/shared/hooks/useImageHueShift.ts` — 경로가 `shared/hooks/`이며 이 디렉토리에는 이 파일만 존재): 시그니처 `useImageHueShift(src, targetHue?, originalHue = 270, options?: { strategy?, preserveSkinTones? })`.
  - `targetHue`가 없거나 `originalHue`와 같으면 원본 그대로 사용.
  - 그렇지 않으면 캔버스에 이미지를 그려 픽셀별로 `rgbToHsl`→Hue 조정→`hslToRgb` 후 `canvas.toDataURL()`로 변환 결과 반환.
  - `strategy === 'relative'`: 각 픽셀 Hue에 `targetHue - originalHue` 차이를 더해 회전. 그 외(`absolute`): 모든 픽셀을 `targetHue`로 고정.
  - `preserveSkinTones`가 true면 Hue 10~50(오렌지/살구 계열) 픽셀은 변경하지 않음.
- **사용처 예**: `Box.tsx`가 `getThemeHue(customization?.themeColor)`를 `<ThemedImage targetHue={themeHue}>`로 넘겨 풍선/장식 이미지를 테마 색으로 물들임. `getThemeHue`/`PURPLE_HUE`는 [`design-system.md`](./design-system.md) 참조.

## 3. 스크롤 기반 메뉴 추적 — `useCurrentMenuByScroll`

- 진입점: `packages/ui/src/features/useCurrentMenuByScroll/index.ts`. 이 파일은 `features/lib/hooks/useCurrentMenuByScroll`의 구현을 재노출합니다(`export { useCurrentMenuByScroll } from '../lib/hooks/useCurrentMenuByScroll';`).
- 본문 섹션 스크롤 위치를 추적해 헤더 메뉴 하이라이트를 현재 보이는 섹션과 동기화하는 데 사용됩니다.

## 4. 이미지 키→URL 헬퍼 (출처: `packages/ui/src/shared/lib/imageUrl.ts`)

신규 업로드는 **객체 키만 저장**하고, 화면에서 읽을 때 렌더 시점에 베이스 URL과 결합합니다.

### `buildImageUrl(keyOrUrl, options?)`
- `http://` · `https://` · `//` · `data:` · `blob:` 로 시작하면 입력을 **그대로 통과**(하위 호환).
- 그 외 비어있지 않은 키는 베이스 URL(`options.baseUrl` 우선, 없으면 `import.meta.env.VITE_IMAGE_BASE_URL`)과 결합. 베이스 끝 슬래시/키 앞 슬래시 중복·누락을 슬래시 1개로 정규화.
- 빈 문자열 / `null` / `undefined` 입력은 **빈 문자열** 반환(깨진 `<img>` 방지).
- 베이스가 없으면(베이스 미설정) 키를 그대로 반환(최소 폴백).

### `buildThumbnailUrl(keyOrUrl, options)`
- `options.width: number`(필수)로 Supabase 변형 파라미터 `?width=N`을 부착.
- 내부적으로 `buildImageUrl` 결과에 `?width=N`을 붙임.
- `data:` / `blob:` / 빈 입력에는 **변형을 붙이지 않고 그대로 통과**(빈 입력은 빈 문자열 반환).
- 현행 `GalleryManager.getThumbnailUrl`(`?width=200`)의 동작을 보존.

### 규칙
**모든 이미지 소비 지점은 렌더 시점에 이 헬퍼를 1회 경유**합니다(절대 URL을 직접 저장/사용하지 않음). 환경변수 키 이름·역할은 [`overview.md`](./overview.md)의 환경변수 표(`VITE_IMAGE_BASE_URL`)를 참조하세요.

## 5. 데이터 레이어 → UI 경로

데이터 모델/Repository 상세는 [`data-model.md`](./data-model.md) · [`shared-ui.md`](./shared-ui.md)에 있으므로 여기서는 UI에 닿는 경로만 요약합니다.

1. **Repository 팩토리**: `getInvitationRepository()`(`packages/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory.ts`)가 `import.meta.env.VITE_DATA_SOURCE === 'supabase'`면 `SupabaseInvitationRepository`, 아니면 `LocalInvitationRepository`를 반환. (방명록은 `getGuestBookRepository()`.)
2. **컨텍스트 주입**: `InvitationProvider`(`packages/ui/src/entities/WeddingInvitation/Context.tsx`)가 조회한 `WeddingInvitation` 데이터를 컨텍스트로 제공.
3. **위젯 소비**: 각 위젯은 `useInvitation()`으로 데이터를 읽음(Provider 밖 호출 시 에러). 예: `Box.tsx`가 `useInvitation()`에서 `customization`을 꺼내 테마 색조를 계산.

## 6. CSS Modules + postcss-mixins 파이프라인

- 컴포넌트 스타일은 `*.module.css`로 작성하고, 클래스 합성은 **`clsx`**로 합니다(예: `Box.tsx`, `BaseButton.tsx`가 `clsx(styles.x, ...)` 사용).
- role mixin(`@mixin typo-*`)은 `postcss-mixins`가 `typography.css`를 주입해 `*.module.css`에서 호출 가능합니다.
- **postcss 설정은 두 곳에 존재**합니다. 둘 다 `packages/ui/src/shared/styles/typography.css`를 `mixinsFiles`로 가리킵니다.
  - 루트 `./postcss.config.cjs`: `path.resolve(__dirname, 'packages/ui/src/shared/styles/typography.css')`
  - `apps/momozzang-invitation/postcss.config.cjs`: `path.resolve(__dirname, '..', '..', 'packages/ui/src/shared/styles/typography.css')`
  - `apps/momozzang-admin`에는 `postcss.config.cjs`가 **없습니다**(단정 금지: 두 곳에만 존재).
- 인라인 동적 값은 `style` prop에 CSS 변수로 전달합니다. 예: `Box.tsx`가 `{ '--dot-offset': '16px' }`를 `style`로 넘기고 `Box.module.css`가 `var(--dot-offset, 16px)`로 소비.
