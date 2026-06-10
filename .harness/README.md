# 장기 실행 에이전트 하네스

Anthropic 엔지니어링 글 [Harness design for long-running agent applications](https://www.anthropic.com/engineering/harness-design-long-running-apps)의 설계를 이 저장소에 맞게 옮긴 것입니다.

## 사용법

```
/harness 방명록에 검색 기능을 추가해줘
```

한두 문장의 아이디어만 주면 기획 → 계약 → 구현 → QA 루프가 자동으로 돕니다.

## 구조

```
.claude/
  agents/
    harness-planner.md     # 기획자: 아이디어 → 제품 명세(SPEC.md)
    harness-generator.md   # 생성자: 계약 제안 + 구현 + git 커밋 + 자가 점검
    harness-evaluator.md   # 평가자: Playwright로 능동 테스트, QA 결함 문서화
  commands/
    harness.md             # /harness — 오케스트레이션 루프
.harness/
  templates/               # 에이전트 간 통신 파일의 템플릿
    SPEC.md                # 제품 명세
    SPRINT_CONTRACT.md     # 스프린트 계약 (구현 항목 + 검증 가능한 성공 기준)
    QA_FINDINGS.md         # QA 결함 보고
    HANDOFF.md             # 컨텍스트 리셋용 인수인계 문서
  runs/<슬러그>/           # 실행별 작업 산출물 (git 무시됨)
```

## 핵심 설계 원칙 (원문 아티클 기반)

1. **역할 분리**: 에이전트는 자기 작업을 과대평가한다. 생성과 평가를 한 에이전트가 하지 않고, 평가자를 별도로 두어 회의적으로 보정한다.
2. **파일 기반 통신**: 에이전트 간 합의와 결과 전달은 전부 파일(SPEC, 계약, QA 결과)로 한다. 한 에이전트가 파일을 쓰면 다음 에이전트가 읽고 응답한다.
3. **스프린트 계약**: 구현 전에 생성자가 "무엇을 만들고 어떻게 검증할지"를 제안하고 평가자와 합의한다. 성공 기준은 반드시 브라우저에서 직접 검증 가능한 문장이어야 한다.
4. **능동적 테스트**: 평가자는 코드 검토나 스크린샷이 아니라, 실행 중인 앱을 사용자처럼 직접 조작(클릭, 입력, 탐색)해서 판정한다. "표시만 되는 스텁 기능"이 대표적 실패 모드다.
5. **하드 임계값**: 기능성 / 제품 깊이 / 시각 디자인 / 코드 품질 4개 기준 중 하나라도 실패하면 스프린트 실패.
6. **컨텍스트 리셋 + 핸드오프**: 컨텍스트가 길어지면 압축보다 깨끗한 리셋이 낫다. 매 단계 전환마다 HANDOFF.md를 갱신해, 새 컨텍스트가 그 문서만 읽고 이어갈 수 있게 한다.
7. **하네스 단순화**: 하네스의 모든 구성요소는 "모델이 스스로 못 한다"는 가정을 인코딩한 것이다. 모델이 좋아지면 구성요소를 하나씩 제거해보며 여전히 필요한지 재검증한다. 작은 작업은 기획 단계를 건너뛰어도 된다.

## 사전 요구사항

평가자의 능동적 테스트에는 **Playwright MCP**가 필요합니다. 미설치 시:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

Playwright MCP가 없으면 평가자는 빌드 + 코드 검토로 대체하되, 신뢰도가 낮음을 보고서에 명시합니다.

## 중단된 작업 재개

같은 슬러그로 `/harness`를 다시 실행하면 `.harness/runs/<슬러그>/HANDOFF.md`를 읽고 중단 지점부터 이어갑니다.
