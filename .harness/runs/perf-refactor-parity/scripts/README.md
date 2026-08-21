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
