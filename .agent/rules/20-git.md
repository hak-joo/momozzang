---
description: momozzang 커밋·브랜치 규칙
---

# 커밋 / 브랜치 규칙

## 커밋 메시지

- 한글 혼용 Conventional Commits 접두어를 쓴다: `feat:` / `fix:` / `refactor:` / `chore:` / `perf:` / `docs:`
- 스코프는 선택. 예시:
  - `feat(admin): 갤러리 드래그 정렬 추가`
  - `fix: AboutUs 간격 수정`
  - `perf(ui): intro APNG 을 애니메이션 WebP 로 교체한다`
- 본문은 **왜** 바꿨는지를 적는다. 무엇을 바꿨는지는 diff 가 말한다.
- 커밋 메시지에 키/토큰 값을 넣지 않는다.

## 커밋 단위

- 원자적으로 나눈다. 서로 무관한 변경을 한 커밋에 섞지 않는다.
- 빌드가 깨진 상태로 커밋하지 않는다. 커밋 전 `pnpm build` 를 통과시킨다.

## 브랜치

- `main` 에 직접 커밋하지 않는다.
- 스프린트 계약 단위로 `feat/<슬러그>` 브랜치 하나를 쓰고, Claude Code 와 Antigravity 가 **같은 브랜치**에 커밋한다.
- 계약을 넘겨받았다면 브랜치를 새로 만들지 말고 **이미 체크아웃된 브랜치에 그대로 커밋**한다.
- push 와 PR 생성은 Claude Code 의 `/pr` 이 담당한다. 요청받지 않았다면 push 하지 않는다.
