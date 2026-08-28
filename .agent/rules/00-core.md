---
description: momozzang 저장소에서 절대 어기면 안 되는 핵심 가드레일
---

# 핵심 가드레일 (절대 규칙)

> 저장소 전반의 구조·명령어·환경변수는 루트 [`AGENTS.md`](../../AGENTS.md) 가 정본이다. **작업 시작 전 반드시 읽는다.**
> 이 파일은 그중 "어기면 되돌리기 어려운" 항목만 다시 강조한다.

## 1. 비밀값 금지

- 토큰/키/URL 의 **값**을 코드·문서·커밋·PR 본문에 절대 남기지 않는다. 키 **이름**만 언급한다.
- `.env`, `.env.*` 파일을 커밋하지 않는다(`.gitignore` 에 등록되어 있다).
- 서버 전용 키에 `VITE_` 접두어를 붙이지 않는다. 붙이면 클라이언트 번들에 인라인되어 공개된다.
  - 예: `SUPABASE_SECRET_KEY` 는 `VITE_SUPABASE_SECRET_KEY` 가 되어서는 안 된다.
- `VITE_SUPABASE_ANON_KEY` 에는 **공개 키**(publishable 또는 legacy anon)만 넣는다. secret/service_role 키를 넣으면 `scripts/check-public-env.mjs` 가 빌드를 중단시킨다.

## 2. 존재하지 않는 스크립트를 호출하지 않는다

- 이 저장소에는 **루트 테스트 스크립트(`pnpm test`)도, 루트 통합 lint 스크립트(`pnpm lint:all`)도 없다.**
- 검증은 다음 두 가지로 한다.
  ```bash
  pnpm build
  pnpm --filter momozzang-invitation lint
  pnpm --filter momozzang-admin lint
  ```
- 테스트 러너를 새로 도입하지 않는다(요청받은 경우 제외).

## 3. 패키지 매니저는 pnpm 고정

- `npm`/`yarn` 을 쓰지 않는다. `pnpm-lock.yaml` 만 갱신한다.
- 예외: `workers/upload`, `workers/cron` 은 pnpm 워크스페이스 **밖**이며 각자 npm + wrangler 를 쓴다.

## 4. 파괴적 git 조작 금지

- `git push --force`, `git reset --hard`, 브랜치 삭제를 사람 확인 없이 수행하지 않는다.
- `main` 에 직접 커밋하지 않는다. 항상 작업 브랜치에서 작업한다.

## 5. 동시 편집 금지

- 이 저장소는 Claude Code 와 Antigravity 가 **하나의 워킹 트리를 공유**한다.
- 작업을 시작하기 전 `git status` 로 다른 도구가 남긴 미커밋 변경이 없는지 확인한다. 있으면 덮어쓰지 말고 사람에게 알린다.
