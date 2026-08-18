# 하네스 측정 스크립트 (스프린트 1~2)

`SPRINT_CONTRACT_1.md` / `SPRINT_CONTRACT_2.md` §3 성공 기준을 **세션 밖에서도 재현**하기 위한 Playwright 측정 스크립트다.
(수정 요구 E14 — 스크래치패드의 `baseline-s1.mjs` / `baseline-s1b.mjs` 를 이관·확장한 것)

계약 안에서는 이 디렉토리를 `scripts/` 상대경로로 참조한다.

## 사전 준비

이 저장소는 playwright를 의존성으로 갖지 않는다(측정 전용이므로 `package.json`을 건드리지 않는다).
임의의 작업 디렉토리에 설치한 뒤 `PLAYWRIGHT_DIR` 로 위치를 알려준다.

```bash
mkdir -p /tmp/mz-pw && cd /tmp/mz-pw
npm i playwright && npx playwright install chromium
export PLAYWRIGHT_DIR=/tmp/mz-pw/node_modules
```

두 앱의 dev 서버를 띄운다. **`pnpm dev` 는 이 환경에서 실행 불가**
(`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`)이므로 각 앱의 로컬 vite 바이너리를 직접 쓴다.

```bash
cd apps/momozzang-invitation && ./node_modules/.bin/vite            # → http://localhost:5176
cd apps/momozzang-admin      && ./node_modules/.bin/vite            # → http://localhost:3002
```

포트가 다르면 `--viewer` / `--admin` 인자로 넘긴다.

## 실행

```bash
cd .harness/runs/apply-admin-ux-polish/scripts

# 구현 전 (baseline)
node viewer-baseline.mjs  --out out/viewer-before.json
node preview-baseline.mjs --out out/preview-before.json

# 구현 후
node viewer-baseline.mjs  --out out/viewer-after.json
node preview-baseline.mjs --out out/preview-after.json

# 뷰어 무회귀 판정(기준 19~25): diff 가 0줄이어야 한다
diff out/viewer-before.json out/viewer-after.json
```

`--shots <디렉토리>` 를 주면 `preview-baseline.mjs` 가 프레임 상단 캡처를 남긴다.

## 각 스크립트가 담당하는 기준

| 스크립트 | 성공 기준 |
|---|---|
| `viewer-baseline.mjs` | 19, 20, 21(탭 색상 포함), 22(`Box` 카드 포함), 23, 24, 25(방명록) |
| `preview-baseline.mjs` | 1, 2, 3, 4, 13, 14, 15, 16, 17, 18, 28(RingPhoto 실렌더) |
| `verify-f2.mjs` | 6, 7, 8, 9, 10, 11, 12 (구현 스프린트에서 추가됨) |

### 스프린트 2 (`SPRINT_CONTRACT_2.md`)

| 스크립트 | 성공 기준 |
|---|---|
| `admin-baseline.mjs` | 1~9, 11~20 + **16-b** (`/admin` · `/apply` 어드민 크롬 전체) |
| `preview-baseline.mjs` | 10 (테마 스코프 — `frame.screenMain300` / `bodyMain300` / `bodyShadowMain`) |
| `viewer-baseline.mjs` | 21, 22 (뷰어 무회귀 관문 — `diff` 0줄) |
| **`func-baseline.mjs`** (신규, 2차 개정) | **26~32** (기능 무회귀 · 미리보기 격리 · 뷰어 포커스 신설) |

```bash
# 구현 전
node admin-baseline.mjs --out out/admin-before.json
node func-baseline.mjs  --save --out out/func-before.json
# 구현 후
node admin-baseline.mjs --out out/admin-after.json
node func-baseline.mjs  --save --out out/func-after.json
```

#### 2차 개정에서 바꾼 측정식 3곳 (`admin-baseline.mjs`)

계약 §0.0 과 같은 내용이다. **이 3곳을 되돌리면 계약 §3 의 기준값과 어긋난다.**

1. **카드 내 컨트롤 필터에 `radio` 추가** — `!['hidden','file','checkbox','radio'].includes(type)`.
   기준 1 의 대상 집합을 기준 4 의 `f5Total` 과 **동일한 정의**로 맞춘다. 이 수정으로
   `apply.step2.cardsSingleLanguage` 가 `3` → `4` 가 된다(스텝②의 유일한 혼재 원인이
   네이티브 `input[type=radio]` 2개뿐이었다). BGM 라디오 자체의 위젯 대체는 S3(F6)로 이월.
2. **`englishScan` 화이트리스트에서 `ok` · `no` 제거** — 실제 영문 UI 문구 `OK`/`No` 를
   통과시키던 구멍. `/admin` 현재값(`18`)은 바뀌지 않는다.
3. **`primaryActions` 에 슬러그 입력 포함** — `slugRect` 추가, `sameToolbar` 를 3요소 판정으로,
   행 정렬 지표로 `rowDeltaY`(세 요소의 **세로 중심** 최대-최소) 신설. `rect.y` 를 쓰지 않는 이유는
   세 요소의 높이가 달라(`46.36`/`46.36`/`40`) 완벽히 정렬돼도 `rect.y` 가 어긋나기 때문이다.
   기존 `deltaY`(두 버튼의 `rect.y` 차)는 대조용으로 JSON 에 그대로 남긴다.

#### `func-baseline.mjs` 가 재는 것

`admin-baseline.mjs` 가 "computed 스타일·문자열"만 재는 데 반해, 이 스크립트는
**배선이 살아 있는가**와 **격리·의도된 변화**를 잰다.

| 키 | 기준 | 내용 |
|---|---|---|
| `load` | 26 | 슬러그 입력 → 불러오기 → 카드 3 · 썸네일 2 · 슬러그 값 |
| `dnd` | 27 | 갤러리 드래그 중 `2 → 3`(DragOverlay 클론) + 두 아이템 `translate3d` y 부호 반대 → drop 후 `2` |
| `save` | 30 | 저장 클릭 → 네이티브 `alert` 의 문구 (Supabase 쓰기이므로 **`--save` 일 때만** 수행) |
| `selectWiring` | 28 | 테마 셀렉트 → `.screen` 의 `--color-main-300` 전이 (`#FF9FF1` → `#ACA4FF`) |
| `textareaWiring` | 29 | 첫 `textarea` 입력값 왕복 |
| `previewControlIsolation` | 31 | `/apply` 미리보기 방명록 3필드가 **기본 팔레트 값**(`rgb(244,250,255)`/`16px`/`12px`) 유지 |
| `viewerGuestBookFocus` | 32 | 뷰어 방명록 3필드의 unfocused(**`rgb(249,244,255)`**/`16px`/`12px` = DoD 28) + focused(3px solid / offset 2px) |

**측정상의 함정 (실측으로 확인)**

- **방명록 3필드에 도달하려면 4단계가 필요하다.** `방명록 남기기` 만 눌러서는 **미니미 선택 화면**이
  뜨고 입력 필드가 없다. `[class*="sheet"] button` 의 **`nth(1)` 이상**(미니미)을 고른 뒤
  `미니미로 방명록 남기기` 를 눌러야 3필드가 나온다. `nth(0)` 은 닫기 버튼이라 시트가 닫힌다.
- **시트는 Radix Portal 로 `document.body` 직속**에 렌더된다 — `#root` 밖·`.screen` 밖이다.
  `!el.closest('[class*="screen"]')` 류 필터로는 걸러지지 않으니 `#root` 밖도 수집해야 한다.
- **기준 31 과 32(a) 의 기대 배경색이 다르다.** 뷰어는 팔레트를 `document.body` **인라인**에
  주입하므로 시트가 PINK 팔레트를 받아 `rgb(249,244,255)`. `/apply` 미리보기는 팔레트를
  `.screen` 에 **스코프**하므로 시트는 그 밖이라 **기본 팔레트** `rgb(244,250,255)` 를 받는다.
- **저장(기준 30)은 측정이 데이터를 바꾼다.** 그래서 저장 직전에 `/admin` 을 깨끗이 재로드해
  기준 27 의 드래그 결과가 영속되지 않게 한다. `--save` 없이 돌리면 저장 단계를 건너뛴다.

`admin-baseline.mjs` 는 `viewer-baseline.mjs` 와 성격이 다르다 — **before/after diff 가 0줄이어야 하는
무회귀 스크립트가 아니라, 계약 §3 의 기대값과 대조하는 측정 스크립트**다. 값이 바뀌는 것이 정상이다.

수집 항목: 페이지/카드 표면 computed, 카드 폭, 경계 인구조사, 섹션 제목의 카드 내 오프셋,
라벨·보더 **대비비**(WCAG 2.x 상대휘도), 그림자/컨트롤 토큰, 폼 컨트롤 인벤토리(`id`/`label[for]`),
**포커스 표현**(키보드 모달리티 확립 후 `.focus()`), **영문 UI 문구 스캔**, 주요 액션 버튼 그룹핑,
중첩 카드 수, **테마 팔레트 내성**, 네이티브 다이얼로그 문구.

#### `admin-baseline.mjs` 측정상의 함정 (실측으로 확인)

- **`:focus-visible` 은 blind Tab 순회로 못 잰다.** `/apply` 에서 Tab 을 16회 눌러도 스텝퍼·내비·폰
  미리보기 내부 버튼에 막혀 **폼 컨트롤에 한 번도 도달하지 못한다**(실측 `formControlCount: 0`).
  그래서 Tab 을 1회만 눌러 **키보드 모달리티를 세운 뒤** 각 컨트롤에 `.focus()` 를 건다. 이 방식이
  Chromium 에서 `matches(':focus-visible') === true` 를 재현함을 확인했다.
- **중첩 카드 / 영문 스캔은 반드시 미리보기를 제외해야 한다.** 폰 미리보기 안은 뷰어 콘텐츠라
  `SectionContainer` 와 `Box .board` 가 있고 `Info` · `Save the Date` · `About Us!` 같은 영문도 있다.
  document 스코프로 재면 중첩 카드가 `3~4` 건, 영문이 10건 이상 잡힌다(전부 오탐).
  → 중첩 카드는 `[class*="formPane"]` 스코프로, 영문 스캔은 `[class*="screen"]` 내부를 제외한다.
- **카드 셀렉터는 `[class*="board"], [data-admin-panel]` 합집합**이다. 구현 후 `Box` → `Panel` 로
  바뀌므로 한쪽만 조회하면 0개가 되어 기준이 공허하게 통과한다.
- **`textAlign` 으로는 섹션 제목 정렬 불일치를 못 잡는다** — 3개 전부 `start` 다. 실제 원인은
  `Box.board{align-items:center}` 이므로 **카드 좌측으로부터의 오프셋**으로 잰다.
- **버튼의 "면"은 `backgroundColor` 가 아니라 `backgroundImage` 에 있을 수 있다.** `Load` 버튼은
  `backgroundColor: rgba(0,0,0,0)` 이지만 gradient 로 실제 면이 그려져 있다. 둘 다 기록한다.

```bash
node verify-f2.mjs --out out/f2.json --shots ../shots
```

`fixtures/sample.png` 는 기준 8 에서 `/admin` 슬롯에 유효한 이미지를 하나 넣어
`loaded -> error` 전이를 실제로 만들기 위한 픽스처다(데모 레코드의 원본 URL 이 이미 죽어 있어
불러온 직후 곧바로 `error` 라 주입 대상이 0개가 되기 때문이다 — 계약 §7 R3 의 데이터 결함).

### `verify-f2.mjs` 가 계약 문구와 달라진 두 곳 (실측 근거)

1. **표면 #6(GalleryItem) · #8(Carousel) 은 런타임 측정 대상이 없다.** 사진첩 섹션
   (`Gallery.tsx`)은 `<SwipeStack>` 하나만 렌더하고, 두 컴포넌트는 저장소 전체에 import 하는
   곳이 0곳인 dead code 다. 재현:
   ```bash
   grep -rn "GalleryItem\|from './Carousel'" --include="*.tsx" packages/ui/src apps/*/src \
     | grep -v "Gallery/GalleryItem.tsx\|Gallery/Carousel.tsx"   # → 출력 없음
   ```
   따라서 계약 기준 11 의 1·2단계(사진첩 그리드 진입 → 확대 캐러셀 진입)는 수행할 수 없다.
2. **AboutUs 는 `.screen` 밖(document.body 포털)에 렌더된다.** BottomSheet 이기 때문이다.
   계약 기준 11 의 `[class*="screen"] img[data-safe-image]` 스코프로는 보이지 않으므로
   이 표면만 document 스코프로 측정한다.

### 스프린트 3 (`SPRINT_CONTRACT_3.md`)

| 스크립트 | 성공 기준 |
|---|---|
| **`s3-baseline.mjs`** (신규) | 1~4, 9~11, 18~25 (F6 노출/드롭존/테마 내성 · F4 레이아웃·반응형 · F8 접근성 · N1) |
| **`s3-func.mjs`** (신규) | 5~8, 26, 27 (파일 등록 **클릭·드롭 2경로** · 라벨 클릭 · 스텝 왕복 · 갤러리 CRUD · BGM 선택) |
| **`s3-modal.mjs`** (신규) | 12~14, 17 (**F3-b** 미리보기 모달 6표면의 프레임 이탈 + 뷰어 무회귀) |
| `admin-baseline.mjs` (3차 개정) | 35(b), 36, 38 |
| `func-baseline.mjs` (3차 개정) | 16, 28, 29, 30, 31, 35(a) |
| `viewer-baseline.mjs` | 32, 33 |
| `preview-baseline.mjs` | 39 |

```bash
# 구현 전 (이미 out/ 에 있다)
node s3-baseline.mjs --out out/s3-before.json
node s3-func.mjs     --out out/s3-func-before.json
node s3-modal.mjs    --out out/s3-modal-before.json
node admin-baseline.mjs   --out out/s3-admin-before.json
node viewer-baseline.mjs  --out out/s3-viewer-before.json
node preview-baseline.mjs --out out/s3-preview-before.json

# 구현 후 — 같은 명령의 --out 만 -after 로
```

탐색용 probe(계약 §0.7 절차 검증에 쓴 것, 합격 판정에는 쓰지 않는다):
`s3-probe.mjs` · `s3-probe2.mjs` · `s3-dnd-probe.mjs` · `s3-drag-probe.mjs` · `s3-clip-probe.mjs`

#### 3차 개정에서 바꾼 측정식 3곳

**이 3곳을 되돌리면 계약 3 §3 의 기준값과 어긋난다.**

1. **`admin-baseline.mjs` — `f5WithoutAnyCue` 정의 교체** (QA_FINDINGS_2 §3.A / §10-2).
   구정의 `!changed` 는 `focusProbe` 가 모달리티 확립용으로 누르는 첫 `Tab` 의 착지점이
   측정 대상 자신일 때 거짓 양성을 만든다. 신정의는
   `!hasButtonRule && after.outlineStyle === 'none' && after.boxShadow === 'none'` 이며
   착지점과 무관하다. 구정의는 `f5WithoutAnyCue_legacyDef` 로 **병기**해 대조를 남긴다.
   실측 대조: `/admin` 신정의 `0` vs 구정의 `1`.
2. **`admin-baseline.mjs` — 카드 단일 언어 판정에 `measurable` 전제** (QA_FINDINGS_2 §10-6 / N3).
   `card.measurable = card.controls.length >= 1`. 컨트롤이 0개인 카드는 distinct 가 전부
   빈 배열이라 **항상 통과**하는 공허한 합격이었다. 합격식이
   `cardsSingleLanguage === cardsMeasurable && cardsMeasurable >= 1` 로 바뀐다.
   실측: 스텝① `10/10` → `9/9`(제외 `축의금 안내`), 스텝② `4/4` → `2/2`(제외 `이미지 등록`·`갤러리`).
3. **`func-baseline.mjs` — DnD 합격식 일반화** (QA_FINDINGS_2 §3.B / §10-1).
   `style.transform` 의 **y 성분** 부호 대조를 버리고, `data-qa-order` 표식 기반
   **드롭 후 순서 문자열 비교**로 바꿨다. 레이아웃(세로/가로/그리드 줄바꿈)·아이템 수·
   `DragOverlay` 구현 세부에 전부 불변이다. `n → n+1 → n` 개수 전이는 `countDuringDrag` 로
   **기록만** 하고 판정에서 뺐다.
   **주의: 드래그 전에 `items.first().scrollIntoViewIfNeeded()` 를 반드시 해야 한다** —
   생략하면 아이템이 뷰포트 밖에 있을 때 마우스 좌표가 어긋나 실패를 관측했다.

#### s3-* 스크립트의 측정 정의

- **`visuallyHidden(el)`** — `display:none || visibility:hidden || opacity:0 || (rect.w <= 1 && rect.h <= 1)`.
  UA 셰도우 DOM 문자열(`Choose File / No file chosen`)은 `textContent` 스캔에 잡히지 않으므로,
  네이티브 파일 위젯 노출 여부는 **문자열이 아니라 rect·computed 로** 잰다(계약 3 §0.1).
- **접근 가능한 이름** — `aria-label` → `aria-labelledby` → `label[for]` → 감싸는 `label` → `title`
  순으로 찾고, **`placeholder` 는 강한 근거로 인정하지 않는다**(`placeholder-only` 로 따로 표기).
- **드롭 시뮬레이션** — 페이지 컨텍스트에서 `new DataTransfer()` + `fetch('data:image/png;base64,…')`
  → `new File([blob], name)` → `locator.dispatchEvent('dragover'|'drop', { dataTransfer })`.
  실측 확인: 이렇게 보낸 이벤트는 `instanceof DragEvent`, `cancelable: true`,
  `dataTransfer.types === ["Files"]`, `files[0] instanceof File === true` 다.
- **모달 포함 판정** — `sheet.left >= screen.left - 0.5 && sheet.right <= screen.right + 0.5 && …`
  (0.5px 허용치는 서브픽셀 반올림 때문).

## 측정상의 주의 (실측으로 확인한 함정)

- **뷰어에는 `data:` `<img>` 가 이미 20개 있다.** Vite가 번들 PNG 장식 에셋을 인라인한 것이다.
  따라서 "`src.startsWith('data:')` 가 0개"는 성립하지 않는다. 시드 이미지 검사는
  **`data:image/svg+xml`** 접두사로만 해야 판별력이 있다.
- **미리보기의 실제 스크롤 컨테이너는 `.screen` 이 아니라 내부 `.mainWrapper`** 다
  (`.screen` 은 `overflow:hidden`, `.mainWrapper` 는 `overflow-y:auto` / `scrollHeight≈5698`).
  또 Playwright의 `hover()` 가 `scrollIntoViewIfNeeded` 로 **문서를 먼저 스크롤**시키므로
  문서 `scrollTop` 기준값은 반드시 hover **이후**에 읽어야 한다.
- **뷰어 홈 대표 이미지는 `<img>` 가 아니라 인라인 SVG의 `<image href>`** 라 `naturalWidth` 를
  직접 읽을 수 없다. 같은 href로 `new Image()` 를 만들어 `decode()` 시키고 캔버스에 그려
  불투명 픽셀 비율을 재는 방식으로 실렌더를 확인한다.
- **네트워크 집합은 세 번 걸러야 diff 가 성립한다.** ① dev 서버의 **모듈 요청**(`/@fs/....tsx`,
  `/@vite/...`)은 소스 파일이 하나만 늘어도 집합이 바뀐다 — 이번 스프린트는 신규 파일을 만드므로
  `resourceType` 이 `image|font|media|fetch|xhr` 인 것만 모은다. ② `?t=`/`?time=` 같은 **타임스탬프
  쿼리**는 정규화한다(`<ts>` 로 치환 — 제외가 아니라 정규화라 요청 존재는 남는다). ③ **네이버 지도
  타일·텔레메트리**는 타일 좌표가 매번 달라져 집합 diff 를 쓸 수 없다 — 집합에서 빼고
  `volatileHostCounts` 에 **호스트별 건수만** 남긴다.
- `img src` / 네트워크 URL 집합에는 dev 서버의 `@fs/<절대경로>` 가 남는다(에셋 요청). 같은 머신·같은
  기동 방식에서만 before/after diff 가 유효하다.
- `data:` URI 원문은 수십 KB라 diff 를 못 읽게 만든다. `srcSet` 에서는
  `data:image/png;base64,<len:12722>` 형태로 축약한다 — 개수·미디어타입·크기 변화는 그대로 잡힌다.

## 결정성 확인 (실측)

코드 변경 없이 각 스크립트를 **연속 2회 실행**해 산출 JSON이 **byte-identical**(diff 0줄)임을 확인했다.
따라서 구현 후 diff 에 나타나는 줄은 전부 **실제 변경**이다.
`admin-baseline.mjs` 도 동일하게 확인했다(`meta` 블록의 타임스탬프만 제외하면 diff **0줄**).

---

## 스프린트 3 · 3차 개정 (평가자 E1~E6 반영)

계약 `SPRINT_CONTRACT_3.md` §0.8 이 이 절과 대응한다. **개정은 계약 단계에서 끝났다** —
구현 중에는 합격식을 고치지 않는다(계약 §4.4 서두 규칙, 기준 35 가 `git diff` 로 이를 증명 가능하게 한다).

### 개정한 측정 스크립트

| 스크립트 | 개정 내용 | 기준 |
|---|---|---|
| `s3-modal.mjs` | `CLOSE_TARGET` + `closeByClick()` 신설 → `applyPreview.closeHitPass` / `closeHitRows`. 닫기 컨트롤 = 최상위 `[role=dialog]` 안의 `[class*="close"]`, 없으면 그 다이얼로그의 **마지막 `button`**(`MessageDialog` 는 `useAutoClose={false}` 라 X 버튼이 없다). **뷰어 블록은 `opts.closeProbe` 를 켜지 않아 산출이 종전과 완전히 동일**하다(확인 완료) | 12-c |
| `s3-baseline.mjs` | `hiddenControlFocusCue()` 신설 → `applyStep2.focusCue` · `admin.focusCue`. `[data-file-drop]` 은 안쪽 `input[type=file]` 을, `[class*="trackItem"]` 은 안쪽 `input[type=radio]` 을 `.focus()` 한 뒤 **바깥 시각 표면**의 computed 를 읽는다 | 25 · 25-b |
| `s3-func.mjs` | `/admin` 컨텍스트에 `adminPageErrors` 수집 추가(종전에는 `/apply` 의 `pageErrors` 만 있었다) | 31-c |
| `func-baseline.mjs` | `previewControlIsolation` 의 기대 배경색 `rgb(244,250,255) → rgb(249,244,255)` + not-admin 3절 + `screenSub100` · `pass_legacyDef` 병기 | 31 |

### 새로 만든 프로토타입/시뮬레이션 스크립트

```bash
# E1 — 컨테이너 주입 + 어드민 스코프 사이징 오버라이드가 6표면을 해결하는가
node s3-r3-proto-modal.mjs         --out out/s3-r3-proto-css1.json   # 채택안
node s3-r3-proto-modal.mjs --css=0 --out out/s3-r3-proto-css0.json   # 대조군(주입만)

# E3 — 상단바를 한 행(73px)으로 강제하면 preview-baseline diff 가 어떤 키를 내는가
node s3-r3-preview-sim.mjs --f4 --out out/s3-r3-preview-f4.json
diff <(sed 's|http://localhost:[0-9]*||g' out/s3-preview-before.json) \
     <(sed 's|http://localhost:[0-9]*||g' out/s3-r3-preview-f4.json)
```

측정상의 주의 2건:

- **`:focus-visible` 은 키보드 모달리티가 확립돼야 매치된다.** `hiddenControlFocusCue()` 는
  `admin-baseline.mjs` 의 `focusProbe` 와 같이 `Tab` 을 한 번 먼저 누른다. 이걸 빼면 `.focus()` 만으로는
  규칙이 적용되지 않아 **옳은 구현도 실패**한다.
- **`s3-r3-proto-modal.mjs` 의 DOM `appendChild` 는 Radix `container` prop 주입의 근사다.**
  렌더 트리·언마운트 경로가 다르므로 기준 15(잔여 노드 0)는 이 스크립트로 증명되지 않는다.
  또 표면마다 페이지를 새로 로드해야 한다 — 옮겨진 노드를 실제로 클릭해 닫으면 React 의 언마운트가
  어긋나 그 다음 조작이 막힌다(실측: 미니룸 탭 클릭 30초 타임아웃).
