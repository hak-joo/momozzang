# momozzang-cron Worker

Supabase **Free 플랜을 유지하기 위한 스케줄 전용 Worker**입니다. 공개 API 가 없고, Cron Trigger 로만 동작합니다.

6시간마다 한 번(`0 */6 * * *`) 깨어나 두 가지를 합니다.

| 작업 | 왜 | 빈도 |
|------|-----|------|
| **keep-alive** | Supabase Free 프로젝트는 일정 기간 요청이 없으면 자동 일시정지된다. 청첩장은 예식 직전까지 트래픽이 뜸하다가 당일에 몰리므로, 하객이 링크를 여는 순간 DB 가 멈춰 있을 수 있다 | 매 tick (6시간) |
| **DB 백업** | Free 플랜에는 자동 백업/PITR 이 없다. 청첩장·방명록은 재현 불가한 자산이다 | 하루 1회 |

## 동작 방식

- **keep-alive** — 공개 키로 `momozzang?select=slug&limit=1` 한 번. 결과가 0건이어도 목적(활동 기록)은 달성됩니다.
- **백업** — `momozzang` · `guestbooks` · `admin_users` 전체 행을 200행씩 페이지로 받아 하나의 JSON 으로 만들고, R2 비공개 버킷의 `db/momozzang-YYYY-MM-DD.json`(한국 날짜)에 저장합니다.
- **하루 1회 제한은 cron 이 아니라 "그날 객체가 이미 있는가"로 겁니다.** 그래서 (a) 한 tick 이 실패해도 다음 tick 이 자동 재시도하고, (b) cron 을 몇 개 걸어두든 하루 1개만 남습니다.
- **보관 정리** — 백업을 새로 만든 날에만, `db/` prefix 안에서 보관 기간(기본 30일)이 지난 객체를 지웁니다.
- **실패 격리** — keep-alive 와 백업은 서로 독립적으로 실패합니다. 백업이 깨져도 일시정지 방지는 계속 돕니다. 실패가 하나라도 있으면 마지막에 예외를 던져 Cloudflare 대시보드에 실패로 기록되게 합니다.

## ⚠️ 백업 버킷은 반드시 비공개

백업 JSON 에는 **`edit_password_hash`, 방명록 비밀번호(평문), 신청자 연락처**가 들어갑니다.

- 백업 버킷(`momozzang-backups`)에 **커스텀 도메인을 연결하지 마세요.**
- 이미지 버킷(`momozzang-images` = `img.momozzang.com`)에 **절대 같이 넣지 마세요.** 그 버킷은 공개 도메인이 붙어 있어, 키만 알면 누구나 백업을 내려받을 수 있습니다.
- 백업 열람은 `wrangler r2 object get` 같은 인증된 경로로만 합니다.

## 왜 업로드 Worker 와 분리했나

`workers/upload` 는 브라우저가 직접 때리는 **공개 POST 엔드포인트**를 가집니다. RLS 를 우회하는 `service_role` 키를 그 Worker 와 같은 isolate 에 두지 않기 위해 별도 Worker 로 분리했습니다.

## 환경변수

값은 전부 `wrangler secret put <이름>` 으로 주입합니다. `wrangler.toml` 에 평문으로 적지 않습니다(저장소 규칙: 비밀값 금지).

| 이름 | 필수 | 설명 |
|------|------|------|
| `SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | ✅ | keep-alive 용 공개 키(publishable/anon). RLS 가 걸린 select 1건만 수행 |
| `SUPABASE_SECRET_KEY` | ✅ | 백업 용 `service_role` 키. RLS 를 우회하므로 클라이언트/저장소에 절대 남기지 않음 |
| `BACKUP_RETENTION_DAYS` | — | 백업 보관 일수(기본 30) |
| `ALERT_WEBHOOK_URL` | — | 실패 시 알림받을 Slack/Discord webhook |

바인딩: `BACKUP_BUCKET` → R2 버킷 `momozzang-backups` (`wrangler.toml`).

## 로컬 개발

```bash
cd workers/cron
npm install
cp .dev.vars.example .dev.vars   # 값 채우기 (git 제외됨)

# 스케줄 수동 트리거가 가능한 dev 서버
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+*/6+*+*+*"

npm run typecheck
npm run dry-run    # 배포 없이 번들/설정 검증
```

`wrangler dev` 의 R2 는 로컬 시뮬레이션이라 실제 버킷을 건드리지 않습니다. 저장된 결과는 이렇게 확인합니다.

```bash
npx wrangler r2 object get momozzang-backups/db/momozzang-2026-08-20.json --local --file=out.json
```

## 배포 / 인계 체크리스트 (사용자 작업)

1. **백업용 R2 버킷 생성** — 이름 `momozzang-backups`. **커스텀 도메인·공개 접근을 붙이지 않습니다.**
   ```bash
   npx wrangler r2 bucket create momozzang-backups
   ```
2. **시크릿 주입** (3개 필수)
   ```bash
   cd workers/cron
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_ANON_KEY
   npx wrangler secret put SUPABASE_SECRET_KEY
   # (선택) npx wrangler secret put ALERT_WEBHOOK_URL
   ```
   `SUPABASE_SECRET_KEY` 는 Supabase 대시보드 → Project Settings → API Keys 의 `service_role`(secret) 키입니다. **`VITE_` 접두사가 붙은 곳에는 절대 넣지 마세요** — 클라이언트 번들에 인라인됩니다.
3. **배포**
   ```bash
   npx wrangler deploy
   ```
4. **동작 확인** — Cloudflare 대시보드 → Workers → `momozzang-cron` → Settings → Trigger Events 에 cron 이 등록됐는지 확인하고, 첫 tick 이후 로그를 봅니다.
   ```bash
   npx wrangler tail momozzang-cron
   ```
   `[cron] keep-alive ok` / `[cron] backup ok: db/...` 가 보이면 정상입니다.
5. **복구 리허설(권장)** — 백업 하나를 받아 JSON 이 열리는지, `counts` 가 실제 행 수와 맞는지 한 번은 확인해 두세요. 열어본 적 없는 백업은 백업이 아닙니다.

## 백업에서 복구하기

백업은 `{ version, exportedAt, source, counts, tables }` 구조의 단일 JSON 입니다. `tables.momozzang` / `tables.guestbooks` / `tables.admin_users` 는 각각 PostgREST 가 돌려준 행 배열 그대로라, `service_role` 키로 그대로 upsert 하면 복원됩니다.

```bash
npx wrangler r2 object get momozzang-backups/db/momozzang-2026-08-20.json --file=backup.json
# 필요한 테이블만 골라 Supabase 로 upsert (slug/id 충돌 정책은 상황에 맞게 결정)
```
