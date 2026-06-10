---
description: 현재 브랜치를 push(미push 시 자동)하고 GitHub PR을 생성한다
argument-hint: [PR 제목 힌트 (선택)]
---

# /pr — 자동 push + PR 생성

사용자 힌트: $ARGUMENTS

## 1. 사전 점검

1. 현재 브랜치를 확인한다 (`git branch --show-current`).
   - **main(기본 브랜치)이면 중단**하고 안내한다: 먼저 `/commit`으로 작업 브랜치에 커밋하라고.
2. 커밋되지 않은 변경이 있으면 보고하고, PR에 포함해야 할 변경이면 `/commit` 절차(브랜치는 현재 것 사용)로 먼저 커밋한다. 무관한 로컬 변경이면 그대로 두고 진행한다.
3. base 브랜치는 `main`으로 한다 (사용자가 다른 base를 지정하면 그것을 따른다).

## 2. push (미push 시 자동)

1. upstream 존재 여부를 확인한다: `git rev-parse --abbrev-ref --symbolic-full-name @{u}` (실패하면 upstream 없음).
2. **upstream이 없으면**: `git push -u origin <현재브랜치>` 를 실행한다.
3. **upstream이 있고 미push 커밋이 있으면** (`git log @{u}..HEAD --oneline` 비어있지 않음): `git push` 를 실행한다.
4. push가 거부되면(원격 변경 등) force push 하지 말고 상황을 사용자에게 보고한다.

## 3. PR 생성

1. 이미 열린 PR이 있는지 확인한다: `gh pr view --json url` (있으면 push만으로 갱신된 것이므로 URL을 보고하고 종료).
2. PR 제목: $ARGUMENTS가 있으면 반영, 없으면 브랜치의 커밋들을 요약해 작성 (저장소 커밋 스타일과 동일하게 한글 혼용 가능).
3. PR 본문은 한글로, 다음 구조를 따른다:
   ```markdown
   ## 요약
   - <이 브랜치가 하는 일 1~3줄>

   ## 변경사항
   - <커밋/변경 단위별 항목>

   ## 테스트
   - <확인한 방법: pnpm build, 수동 확인 등. 안 했다면 "미실시"로 솔직하게>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```
4. 생성: `gh pr create --base main --title "..." --body "..."` (본문은 heredoc 사용).
5. base와 head가 같거나 커밋 차이가 없으면 생성하지 말고 사유를 보고한다.

## 4. 보고

- push 여부(자동 push 했는지), PR URL, PR에 포함된 커밋 목록을 보고한다.
