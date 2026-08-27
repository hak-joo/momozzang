# 파리티 검증 스크립트 (스프린트 1 / 묶음 1 · 스프린트 2 / 묶음 2)

`SPRINT_CONTRACT_1.md` §4 의 성공 기준을 **브라우저 없이** 판정하기 위한 Node 스크립트다.
이 저장소에는 Playwright MCP 가 없으므로(FINDINGS §C-1) 판정 수단은 계약 §0 의 6종뿐이며,
그중 `Node비교` 채널을 이 디렉토리가 담당한다.

> **스프린트 2 추가분은 이 문서 아래쪽 "스프린트 2 (묶음 2) 추가 3종" 절**을 보라.

## 공통 규약

- **Node 내장 모듈만** 사용한다 (`node:fs`, `node:path`, `node:crypto`, `node:zlib`,
  `node:child_process`, `node:module`). `npm install` 이 필요 없고 `node_modules` 를 참조하지 않는다.
  → 계약 기준 4(의존성 무변경) / 기준 26 을 만족한다.
  **스프린트 2 의 3종은 여기서 한 걸음 넓힌다** — 저장소에 **이미 있는 devDependency**
  (`@babel/core` 7.28.0 · `babel-plugin-react-compiler` 1.0.0 · `vite` · `@vitejs/plugin-react`
  · `vite-tsconfig-paths`)를 쓴다. 새 의존성을 추가하지 않으므로 계약 2 기준 E3·F3 을 만족한다.
- **판정 채널은 stdout 이다.** `module.stripTypeScriptTypes` 가 내는 `ExperimentalWarning` 은
  stderr 로만 나가므로 판정에 섞이지 않는다.
- **모든 스크립트는 파일을 쓰지 않는다.** `--help` 는 사용법을 stdout 에 출력하고 exit 0 이다.
- **변경 전 파일 추출은 계약 §0(라) / §7 `C-9` 규약을 따른다.** 셸을 경유한
  `git show <rev>:<path>` 는 이 환경에서 stdout 이 오염되므로(간헐적) 쓰지 않는다.
  대신 `execFileSync('git', ['cat-file','blob', …], { encoding: 'buffer' })` 로 직접 받고,
  **추출 직후 바이트 수와 해시를 출력하며 어긋나면 즉시 중단(exit≠0)** 한다.
- **셸 globbing 에 의존하지 않는다** (계약 §8.10 D-1: zsh 는 `GLOB_SUBST` 가 꺼져 있어
  `ls -d $var` 형태가 항상 0을 반환한다). 패턴 매칭은 `find` 또는 `dist-measure.mjs` 가 수행한다.

실행은 저장소 루트에서 한다.

## 스크립트 6종

| 스크립트 | 무엇을 판정하는가 | 계약 기준 |
|---|---|---|
| `ico-inspect.mjs` | ICO 컨테이너 프레임 표(BMP/PNG), 프레임별 RGBA sha256, AND마스크↔알파 불일치 전수 집계 | 기준 9·10·12 (F2 미수행 근거) |
| `repo-stateless.mjs` | Repository 구현체 6종의 무상태성(`this.` / 인스턴스 필드 / constructor) | 기준 16 (**G3 게이트**) |
| `factory-singleton.mjs` | 팩토리 3종의 지연 싱글턴 의미론 + 분기 문장 2줄 보존 + 생성자 예외 시 캐시 무오염 | 기준 17 |
| `minime-pages.mjs` | 미니미 페이지 분할과 `page[0]` 안정 키의 존재·유일성 | 기준 19 (**G5 게이트**) |
| `ts-erasure.mjs` | TS 변경이 타입 수준뿐임(런타임 토큰 스트림 동일) | 기준 21 |
| `dist-measure.mjs` | 빌드 산출물의 파일 수·총 바이트·패턴별 존재 개수·지정 파일 정수 바이트 | 기준 8·15 보조 |

`ico-parity.mjs` 는 **만들지 않는다.** F2(favicon 재인코딩)가 게이트 `G2-d` 불합격으로
미수행 확정이라 비교 대상이 없다 (계약 §2 G2).

## 사용 예

```bash
# G3 게이트 — 6종 구현체 무상태성 (마지막 줄이 ALL STATELESS: yes 여야 한다)
node .harness/runs/perf-refactor-parity/scripts/repo-stateless.mjs

# G5 게이트 — 안정 키 존재·유일성
node .harness/runs/perf-refactor-parity/scripts/minime-pages.mjs

# F4 — 지연 싱글턴 의미론 (변경 전 rev 기본값 1fe77bd)
node .harness/runs/perf-refactor-parity/scripts/factory-singleton.mjs

# F5 — 타입 단언 제거가 런타임에 영향이 없음
node .harness/runs/perf-refactor-parity/scripts/ts-erasure.mjs \
  packages/ui/src/widgets/invitation/MiniRoom/api/guestBook.ts 1fe77bd

# F2 미수행 근거 — 변경 전 blob 과 작업 트리 파일이 프레임 단위로 동일한가
S=.harness/runs/perf-refactor-parity/scripts/ico-inspect.mjs
node $S git:1fe77bd:apps/momozzang-invitation/public/favicon.ico \
  --expect-size=203826 --expect-md5=8fb64bad6a4a960bf0def99f72f7bc19

# F1 — 배포 산출물 계측 (셸 glob 미사용)
node .harness/runs/perf-refactor-parity/scripts/dist-measure.mjs apps/momozzang-invitation/dist \
  --name='assets/bg-blue-*.png' --name='assets/groom-bride-*.png' \
  --name='assets/pixel-wedding-*.png' --name='vite.svg' --dir='assets/images'
```

## 종료 코드 규약

| 코드 | 뜻 |
|---:|---|
| 0 | 판정 통과 (또는 `--help`) |
| 1 | 판정 불통과 (검사는 정상 수행됨) |
| 2 | 입력 문제 — 파일/디렉토리 부재, 추출 0바이트, 크기·해시 assert 실패 |
| 3 | 예상하지 못한 소스 구문 — 검사 전제가 깨졌다. `OK` 를 찍지 않고 중단한다 |

---

# 스프린트 2 (묶음 2) 추가 3종

`SPRINT_CONTRACT_2.md` §1.2 5·6·7 행의 산출물이다. 묶음 2 는 브라우저(Playwright)를 쓸 수
있으므로(`BASELINE_2 §6`) 판정 수단이 7종이며, 이 3종은 그중 `Node비교`·`브라우저관측` 채널을
담당한다.

| 스크립트 | 무엇을 하는가 | 계약 2 기준 |
|---|---|---|
| `react-compiler-status.mjs` | 지정 rev/작업 트리 파일에 React Compiler 를 걸어 **컴파일 성공/베일아웃 상태와 사유**를 출력. 스캔 모드는 디렉토리 전량 집계 | G7 (1)(2) · **B4(G8)** · **C3(G9)** · D1 · D5 |
| `probe-init.mjs` | 브라우저 주입용 계측 스니펫을 stdout 에 출력(카운터 4종) | **B5** · **B7-b** · **D6** |
| `pilot-no-compiler.vite.config.mjs` | 어드민 앱을 **컴파일러 없이** 띄우는 진단 전용 vite config. F8 단독 귀속 측정용 | **C6** |

## `react-compiler-status.mjs`

```bash
S=.harness/runs/perf-refactor-parity/scripts/react-compiler-status.mjs

# G7 (1) — 렌더 중 부수효과 위반 후보 3건의 처분
node $S packages/ui/src/widgets/invitation/Gallery/SwipeStack/SwipeStack.tsx \
        apps/momozzang-admin/src/pages/EditPage/EditPage.tsx \
        apps/momozzang-admin/src/pages/AdminPage.tsx

# G7 (2) — packages/ui 전량 스캔 (수치 정의를 출력 헤더에 함께 적는다)
node $S --scan=packages/ui/src

# G8 — F7 이 WeddingInvitation.tsx 를 베일아웃 -> 컴파일로 뒤집지 않았는가
node $S --gate=bailout --revs=6ba4c83,WORKTREE \
        packages/ui/src/pages/WeddingInvitation/WeddingInvitation.tsx

# G9 — F8 이 MiniRoomScene.tsx 를 컴파일 -> 베일아웃으로 뒤집지 않았는가
node $S --gate=compile --revs=6ba4c83,WORKTREE \
        packages/ui/src/widgets/invitation/MiniRoom/MiniRoomScene.tsx

# 변경 전 blob 을 크기·md5 assert 와 함께 판정 (규약 §0(라))
node $S git:6ba4c83:packages/ui/src/pages/WeddingInvitation/WeddingInvitation.tsx \
        --expect-size=4390 --expect-md5=d40a0b8f68f15383e302c14c443917c3
```

집계 수치의 정의(계약 §2 (2) · §7.5)를 **출력 헤더에 그대로 적는다**:

- `compiled` = `CompileSuccess >= 1` 인 파일 수
- `bailed` = `CompileSuccess = 0` 이고 `CompileError >= 1` 인 파일 수 (= 전량 베일아웃)
- `no-component` = 이벤트 0건 파일 수
- `--- bail-outs (N) ---` = 베일아웃 **함수**(`CompileError` 이벤트) 행 수. 고유 파일 수·전량/부분
  베일아웃 수를 같은 줄에 함께 적는다

`verdict` 4값: `compile` / `bailout` / `partial-bailout`(성공·실패 둘 다 가진 파일) / `no-component`.
`compiledOutput` 은 **출력에 `react.memo_cache_sentinel` 리터럴이 있는가**일 뿐이므로
`CompileSuccess` 판정과 다를 수 있다(슬롯이 sentinel 을 필요로 하지 않는 경우). **정본은
`CompileSuccess`/`CompileError` 이벤트다.**

## `probe-init.mjs`

```bash
node .harness/runs/perf-refactor-parity/scripts/probe-init.mjs            # 여러 줄
node .harness/runs/perf-refactor-parity/scripts/probe-init.mjs --oneline  # 한 줄
```

출력 스니펫을 `page.evaluate(<스니펫>)`(또는 `browser_evaluate`)에 그대로 넣는다. 주입 후:

```js
window.__parityProbe.read()   // 카운터 4종
window.__parityProbe.short()  // {set, rm} — 계약 §4.B B7-b 표기와 같은 축약형
window.__parityProbe.reset()  // 구간 측정용
window.__parityProbe.uninstall()
```

카운터는 **주입 후 증분만** 센다(StrictMode 마운트 시 호출은 주입 전이라 안 잡힌다). 스니펫은
멱등이며 두 번 주입하면 `'already-installed'` 를 반환한다.

## `pilot-no-compiler.vite.config.mjs`

```bash
cd apps/momozzang-admin
npx vite --config ../../.harness/runs/perf-refactor-parity/scripts/pilot-no-compiler.vite.config.mjs \
         --port 3095 --strictPort
```

컴파일러가 실제로 빠졌는지는 dev 서버가 내는 모듈로 직접 확인할 수 있다:

```bash
R=$(pwd); P="$R/packages/ui/src/widgets/invitation/MiniRoom/MiniRoomScene.tsx"
curl -s "http://localhost:3099/@fs$P" | grep -o memo_cache_sentinel | grep -c .   # 실제 구성: 4
curl -s "http://localhost:3095/@fs$P" | grep -o memo_cache_sentinel | grep -c .   # 파일럿: 0
```

이 config 는 앱 빌드 경로에 들어가지 않는다. `apps/momozzang-admin/vite.config.ts` 는 그대로다.

> 주의: `tsconfigPaths()` 에 `root` 를 넘기지 않는다. 기본값이 pnpm 워크스페이스 루트를 찾아
> `packages/ui/tsconfig.json` 의 `@widgets/*` 등 별칭까지 수집한다. `root: <adminRoot>` 로 좁히면
> 그 별칭을 못 찾아 뷰어 트리가 500 으로 죽는다(구현 중 실측).

## 판정 셸 주의

`grep -c .` 는 매치 0건일 때 **exit 1** 이다(계약 `C-13`). 판정 명령을 `set -e` 셸에서 돌리면
*정상 통과(0건)* 가 실패로 보인다. 이 디렉토리의 예시 명령은 `set -e` 없이 실행한다.

---

# 스프린트 3 (묶음 3) 추가 2종 + 확장 1종

`SPRINT_CONTRACT_3.md` §1.2 5·6·7·8 행의 산출물이다. 묶음 3 은 **색조 훅 자체**를 고치므로
"시각에 영향을 주는 파일의 diff 가 0" 이라는 스프린트 1·2 의 시각 판정 근거가 구조적으로
사라진다. 그래서 HC-2(색상 무변화)를 **3중 방어선**으로 판정하며, 이 디렉토리는 그중
**정적**·**Node** 축을 담당한다(브라우저 축은 Playwright + `probe-init.mjs` 가 담당).

| 스크립트 | 무엇을 판정하는가 | 계약 3 기준 |
|---|---|---|
| `hue-pixels-parity.mjs` | 픽셀 루프 추출의 **바이트 동등성**(경계 전수 입력)과 **문자 동일성** | **N1(G-a)** · **S2** |
| `hue-cache-parity.mjs` | 캐시 키 순수성 · `Direction` 4호출→3키 · LRU 상한 축출 · single-flight · 실패 미캐시 | **N2·N3·N4·N5·N6(G-e)** |
| `probe-init.mjs` (확장) | 캔버스 카운터 2종 + 형상 다중집합 + 뷰어 `main` 인라인 `style` 관측기 | **M1·M2·M3** · **V4** |

## `hue-pixels-parity.mjs`

```bash
S=.harness/runs/perf-refactor-parity/scripts/hue-pixels-parity.mjs

# N1 (게이트 G-a) — 경계 전수 입력에서 구/신 구현의 출력 버퍼가 바이트 동일한가
node $S                 # 마지막 줄: ALL BYTE-IDENTICAL: yes
node $S --quiet         # 케이스별 SHA 행 생략

# S2 (P2′-1) — 이동 구간이 <BASE> 43~78 과 문자 동일한가
node $S --diff-only     # 마지막 줄: REGION DIFF LINES: 0
```

**모듈 로딩** (계약 §1.2 (†)). `hueShiftPixels.ts` 를 그냥 `import()` 하면 실패한다 — TS 파일이고
`'./colorUtils'` 가 확장자 없는 상대 경로라 Node ESM 이 해석하지 못한다(Vite 만 해석한다).
이 스크립트는 자기 재기동 없이 처리한다.

1. `colorUtils.ts`(런타임 import 0건)를 `module.stripTypeScriptTypes` 로 지우고 `data:` 모듈로 평가.
2. `hueShiftPixels.ts` **전문**의 타입을 지우고 `'./colorUtils'` 지정자만 1번의 `data:` URL 로 바꿔 평가.
   → 구간 발췌가 아니라 **실제 모듈**을 판정한다.
3. `oldLoop` 은 `<BASE>` blob 의 `43~78` 을 같은 `colorUtils` 인스턴스를 받는 팩토리로 감싸 평가.
   그 구간에 **타입 표기가 0건**이라 변환 없이 그대로 평가된다 — 이것이 발췌 가능성의 핵심이다.

즉 **두 구현이 같은 `rgbToHsl`/`hslToRgb` 인스턴스**를 쓴다. `<BASE>` blob 은
`git cat-file blob` 으로 직접 받고 **bytes=2674 / md5=6b2f62c99667b35ce01472b8bc861af2 를
assert** 한 뒤 진행한다(`C-9` · 규약 라). 합성한 `oldLoop` 소스를 stdout 에 **그대로 출력**하므로
평가자가 합성 방식을 눈으로 검증할 수 있다.

**이동 구간의 기계적 식별 규칙**(계약 S2): `export function hueShiftPixels(` 의 **여는 `{` 다음
줄**부터 **파일 마지막 `}` 앞 줄**까지. 주석 마커는 쓰지 않는다 — 마커 자체가 P2′-1 비교 대상
밖 문자가 되어 혼동을 만든다.

**경계 전수 입력**: 픽셀 120개 = `a{0,9,10,11,255}`(투명 스킵 경계 `a < 10`) ×
`h{9,10,50,51}`(피부색 경계 `h >= 10 && h <= 50`) × `s{0,100}` × `l{0,50,100}`.
케이스 63 = `(targetHue, originalHue)` 7쌍(`hueDiff` = −60/+60/−340/+340/−270/+360/0) ×
`strategy` 3값 × `preserveSkinTones` 3값.

## `hue-cache-parity.mjs`

```bash
node .harness/runs/perf-refactor-parity/scripts/hue-cache-parity.mjs
# 마지막 줄: ALL CACHE CHECKS: yes
```

`hueShiftCache.ts` 는 **런타임 import 0건**이므로 타입만 지우면 `data:` 모듈로 그대로 평가된다.
스크립트가 그 조건을 먼저 확인하고, 깨져 있으면 exit 3 으로 중단한다(전제가 무너진 것을 `OK`
로 덮지 않는다).

**판정 순서에 의미가 있다.** 모듈 상태(맵)는 프로세스 전체에서 공유되므로 **N4(축출)를 캐시
최초 사용으로 돌린다** — 맵이 빈 상태에서 `LIMIT + 1` 개를 넣어야 "가장 오래된 항목 1개만
사라진다" 를 문면대로 판정할 수 있다. N2·N3 은 키 함수만 부르므로 맵을 건드리지 않는다.

## `probe-init.mjs` 스프린트 3 확장

기존 카운터 4종의 이름·의미와 `read()`/`short()`/`reset()`/`uninstall()` 의 **외부 계약은
불변**이다(계약 3 기준 O3). `short()` 는 여전히 `{set, rm}` 만 반환한다. `read()` 에는 새 카운터
2종이 더해진다.

```bash
node .harness/runs/perf-refactor-parity/scripts/probe-init.mjs --oneline
```

| 추가 항목 | 뜻 | 기준 |
|---|---|---|
| `hueCanvasEncodes` | `HTMLCanvasElement.prototype.toDataURL` 호출 수 | M1·M3 |
| `hueCanvasDecodes` | `CanvasRenderingContext2D.prototype.getImageData` 호출 수 | M1·M3 |
| `hueCanvasShapes()` / `hueCanvasShapeCounts()` | 호출별 `${w}x${h}:${dataUrlLen}` 배열 / 다중집합 | M2 |
| `watchStyle()` / `readStyle()` | 뷰어 `main` 의 인라인 `style` 변화 관측기 | V4 |

**귀속이 깨끗하다** — `packages/ui`·두 앱 전체에서 이 두 캔버스 API 를 쓰는 곳은
`useImageHueShift.ts` 한 곳뿐이다(어드민 `resizeImage.ts` 는 `toBlob` 을 쓴다 → 계수 대상 아님).

**주입 시점이 판정을 갈른다.** 색조 변환은 **마운트 시 1회**뿐이므로 로드 후 주입하면 캔버스
카운터가 전부 0 이 된다. M1~M3·V4 는 `page.addInitScript()` 로 **앱 번들 평가 전에** 주입한다
(계약 3 §0.2 D-e).

확장 시 밟은 함정 2건을 그대로 적어 둔다.

1. **`reset()` 이 배열을 `0` 으로 만든다.** 현행 `reset()` 은 `Object.keys(c).forEach(k => c[k] = 0)`
   이므로 `shapes` 배열을 카운터 객체 `c` 안에 두면 reset 후 다음 `push` 가 터진다.
   **배열은 `c` 밖에 둔다.**
2. **`watchStyle` 은 DOM 이전에 평가된다.** `addInitScript` 는 앱 번들보다 먼저 돌므로
   `#main-wrapper` 가 아직 없다. 설치 시 부착을 시도하고 실패하면 `DOMContentLoaded` 에서 다시
   시도한다. 부착 성공 시 `childList` 관측으로 **대상이 나타나는 순간의 초기값도 표본에
   담는다** — `MutationObserver` 는 부착 이후 변화만 보므로 그렇게 하지 않으면 첫 값(원본 경로)을
   놓친다.

**지문 수집과 섞지 말 것.** 계약 §4.0(다) 의 지문 수집 스니펫도 `getImageData` 를 호출한다.
지문 수집은 `uninstall()` 이후에, 또는 별도 세션에서 한다.

## Playwright 조달 (브라우저 축)

이 저장소는 `playwright` 를 의존성으로 갖지 않는다(`package.json` 무변경 = 기준 X3·DoD 23).
측정에는 **npx 캐시**를 쓴다.

```bash
/bin/ls -d ~/.npm/_npx/*/node_modules/playwright     # 실측 4벌 (1.61.0 / 1.62.0 / 1.63.0-alpha / 1.60.0-alpha)
# 그중 하나로 chromium.launch() → chromium 149.0.7827.55 기동 성공 (네트워크 불필요)
```

같은 저장소의 기성 헬퍼 `.harness/runs/apply-admin-ux-polish/scripts/lib/pw.mjs` 도
`PLAYWRIGHT_DIR` 환경변수로 외부 playwright 를 로드한다. 브라우저 판정 드라이버 자체는
**저장소 밖**(`/tmp`)에 둔다 — 이 디렉토리에 `.mjs` 를 더하면 기준 X2 의 허용 목록(8건)을 넘긴다.
