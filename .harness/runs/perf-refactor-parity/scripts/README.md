# 파리티 검증 스크립트 (스프린트 1 / 묶음 1)

`SPRINT_CONTRACT_1.md` §4 의 성공 기준을 **브라우저 없이** 판정하기 위한 Node 스크립트다.
이 저장소에는 Playwright MCP 가 없으므로(FINDINGS §C-1) 판정 수단은 계약 §0 의 6종뿐이며,
그중 `Node비교` 채널을 이 디렉토리가 담당한다.

## 공통 규약

- **Node 내장 모듈만** 사용한다 (`node:fs`, `node:path`, `node:crypto`, `node:zlib`,
  `node:child_process`, `node:module`). `npm install` 이 필요 없고 `node_modules` 를 참조하지 않는다.
  → 계약 기준 4(의존성 무변경) / 기준 26 을 만족한다.
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
