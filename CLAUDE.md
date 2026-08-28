# momozzang — Claude Code 가이드

저장소 전반의 구조·명령어·환경변수·코딩 컨벤션은 **[`AGENTS.md`](./AGENTS.md)** 가 정본입니다. 이 문서는 그 위에 얹는 **Claude Code 전용** 실행 가이드입니다.

@AGENTS.md

> 위 임포트가 동작하지 않는 환경이라면 [`AGENTS.md`](./AGENTS.md) 를 직접 읽고 시작하세요. 영역별 상세 스펙은 [`docs/overview.md`](./docs/overview.md) 가 진입점입니다.

## 작업 라우팅 (언제 무엇을 쓰는가)

| 도구 | 언제 사용 | 산출물 |
|------|-----------|--------|
| `dev` 에이전트 | 범위가 명확한 단발성 개발 작업(버그 수정, 소규모 기능, 리팩터링) | 코드 변경 + 커밋 |
| `frontend-developer` 에이전트 | 디자인 시스템·UI 컨벤션 준수가 중요한 프론트엔드 작업(새 위젯/화면) | 코드 변경 + 커밋 |
| `e2e-tester` 에이전트 | 이미 만들어진 화면을 사용자처럼 검증(클릭/입력/라우팅/방명록/갤러리 정렬) | 검증 보고서(코드 미수정) |
| `/harness` (planner/generator/evaluator) | 한두 문장 아이디어 → 완성 기능까지 도는 장기 스프린트 루프 | SPEC/계약/QA_FINDINGS + 구현 |
| `/commit` | 변경사항 분석 → 브랜치 생성 + 원자적 커밋 | 커밋 |
| `/pr` | 푸시 + PR 생성 | PR |

- 개발은 [`dev`](./.claude/agents/dev.md), UI 중심 작업은 [`frontend-developer`](./.claude/agents/frontend-developer.md), E2E 검증은 [`e2e-tester`](./.claude/agents/e2e-tester.md), 큰 기능 구현은 `/harness`를 사용하세요.
- `/harness`의 planner/generator/evaluator 3종 에이전트(`.claude/agents/harness-*.md`)와 `.claude/commands/harness.md`는 하네스 전용이며, 일상 개발 라우팅에서는 `dev`/`frontend-developer`/`e2e-tester`를 우선합니다.
- `e2e-tester`는 Playwright MCP에 의존합니다. MCP 서버가 연결되지 않으면 빌드+코드 검토로 대체하고 신뢰도 저하를 보고하며, 시각 검증이 필요한 작업은 Antigravity 레인으로 넘기는 것을 검토하세요.

## Antigravity 와의 협업에서 Claude Code 의 역할

협업 프로토콜 전반은 [`AGENTS.md`](./AGENTS.md) "도구 간 협업 프로토콜" 절을 참조하세요. Claude Code 는 다음 구간을 담당합니다.

| 단계 | 담당 | 산출물 |
|---|---|---|
| ① SPEC 작성 | Claude Code (`harness-planner`) | `.harness/runs/<슬러그>/SPEC.md` |
| ② 스프린트 계약 작성 — 검증 가능한 성공 기준 확정 | Claude Code | `SPRINT_CONTRACT_<N>.md` |
| ③ 구현 + 브라우저 자가 검증 | **Antigravity** (`/implement-contract`) | 코드 커밋 + 계약 §5 자가 점검 표 |
| ④ 독립 QA — §5를 믿지 않고 재검증 | Claude Code (`e2e-tester`) | `QA_FINDINGS_<N>.md` |
| ⑤ 결함 있으면 다음 계약 발행 → ③ 회귀 / 통과하면 PR | Claude Code (`/pr`) | 계약 또는 PR |

**인수인계 규칙**

- ②를 마치면 계약 파일을 **먼저 커밋**하고, `HANDOFF.md`(템플릿: `.harness/templates/HANDOFF.md`)를 갱신한 뒤 사람에게 "Antigravity 로 넘기세요"라고 알립니다.
- ④를 시작하기 전에 Antigravity 가 남긴 계약 §5 자가 점검 표와 커밋 로그를 먼저 읽습니다. 다만 §5 를 통과 근거로 채택하지 않고 **직접 재검증**합니다(구현 주체와 검증 주체 분리).
- 브랜치는 계약 단위로 하나(`feat/<슬러그>`)를 쓰고, 양쪽 도구가 같은 브랜치에 커밋합니다. **동시 편집은 금지**입니다 — 넘긴 뒤에는 Claude Code 쪽에서 쓰기 작업을 하지 않습니다.
- Light 레인(작은 수정)에서는 SPEC 없이 지시문 한 장 → Antigravity 구현 → Claude Code 검증/PR 로 축약합니다.
