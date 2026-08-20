/**
 * Cloudflare Worker — Supabase 운영 유지 스케줄 작업 (keep-alive + DB 백업)
 *
 * 왜 필요한가:
 *  1) **keep-alive** — Supabase Free 프로젝트는 일정 기간 요청이 없으면 자동으로 일시정지된다.
 *     청첩장은 예식 직전까지 트래픽이 뜸하다가 당일에 몰리는 패턴이라, 하객이 링크를 여는
 *     바로 그 순간 DB 가 멈춰 있을 수 있다. 주기적으로 가벼운 select 한 번을 날려 활동을 유지한다.
 *  2) **백업** — Free 플랜에는 자동 백업/PITR 이 없다. 청첩장·방명록은 재현 불가한 자산이므로
 *     하루 한 번 전체 행을 JSON 으로 덤프해 R2 비공개 버킷에 보관한다.
 *
 * ⚠️ **백업 산출물은 민감하다.** `edit_password_hash`, 방명록 비밀번호(평문), 신청자 연락처가 들어간다.
 *    반드시 **커스텀 도메인이 붙지 않은 비공개 버킷**(momozzang-backups)에 저장한다.
 *    img.momozzang.com 이 가리키는 momozzang-images 버킷에 넣으면 키를 아는 사람 누구나 내려받을 수 있다.
 *
 * ── 비밀값 취급 ───────────────────────────────────────────────────────────────
 * - `SUPABASE_SECRET_KEY` (service_role): RLS 를 우회하는 서버 전용 키. **Worker 시크릿으로만** 주입한다
 *   (`wrangler secret put SUPABASE_SECRET_KEY`). 이 Worker 는 공개 라우트가 없어 외부로 새지 않는다.
 * - 업로드 Worker(`workers/upload`)와 분리해 둔 이유가 이것이다. 공개 POST 엔드포인트를 가진 Worker 와
 *   service_role 키를 같은 isolate 에 두지 않는다.
 */

export interface Env {
  /** 백업 전용 **비공개** R2 버킷 바인딩 (wrangler.toml 의 [[r2_buckets]]). 커스텀 도메인 연결 금지. */
  BACKUP_BUCKET: R2Bucket;
  /** Supabase 프로젝트 URL. 값 자체는 비밀이 아니지만 저장소 규칙상 커밋하지 않으므로 secret 으로 주입한다. */
  SUPABASE_URL: string;
  /** keep-alive 전용 공개 키(publishable/anon). RLS 가 걸린 select 1건만 수행한다. */
  SUPABASE_ANON_KEY: string;
  /** 백업 전용 service_role 키. `wrangler secret put SUPABASE_SECRET_KEY` 로만 주입한다. */
  SUPABASE_SECRET_KEY: string;
  /** (선택) 백업 보관 일수. 미설정 시 DEFAULT_RETENTION_DAYS. */
  BACKUP_RETENTION_DAYS?: string;
  /** (선택) 실패 알림 webhook URL. Slack/Discord 호환 `{ "text": ..., "content": ... }` 를 POST 한다. */
  ALERT_WEBHOOK_URL?: string;
}

/** 백업 대상 테이블과 페이지네이션 정렬 키(안정 정렬용 PK). */
const BACKUP_TABLES: ReadonlyArray<{ table: string; orderBy: string }> = [
  { table: 'momozzang', orderBy: 'id' },
  { table: 'guestbooks', orderBy: 'id' },
  { table: 'admin_users', orderBy: 'email' },
];

/** 백업 객체 키 prefix. 보관 정리(prune)도 이 prefix 범위에서만 한다. */
const BACKUP_PREFIX = 'db/';

/** PostgREST 페이지 크기. 행이 커도 메모리/시간이 튀지 않게 나눠 받는다. */
const PAGE_SIZE = 200;

/** 페이지네이션 안전장치 — 이 횟수를 넘으면 백업을 실패 처리한다(무한 루프 방지). */
const MAX_PAGES = 200;

/** 백업 기본 보관 일수. */
const DEFAULT_RETENTION_DAYS = 30;

/** KST 오프셋(밀리초). 백업 파일 라벨을 한국 날짜 기준으로 만든다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** epoch ms → 한국 날짜 `YYYY-MM-DD`. 백업 키 라벨에 쓴다. */
function kstDateLabel(epochMs: number): string {
  return new Date(epochMs + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 해당 날짜의 백업 객체 키. 하루 1개 — 존재 여부로 중복 실행을 막는다(멱등). */
function backupKeyFor(epochMs: number): string {
  return `${BACKUP_PREFIX}momozzang-${kstDateLabel(epochMs)}.json`;
}

function retentionDays(env: Env): number {
  const parsed = Number.parseInt(env.BACKUP_RETENTION_DAYS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

/** PostgREST 호출 공통. 실패는 예외로 올려 scheduled 핸들러가 한 곳에서 잡게 한다. */
async function restGet(env: Env, path: string, apiKey: string): Promise<Response> {
  const base = env.SUPABASE_URL.replace(/\/+$/, '');
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    // 본문에 키가 실릴 일은 없지만, 혹시 모를 노출을 줄이려 앞부분만 남긴다.
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`Supabase ${res.status} on ${path}: ${detail}`);
  }
  return res;
}

/**
 * keep-alive — 공개 키로 승인된 청첩장 1건의 slug 만 조회한다.
 *
 * 결과가 0건이어도 상관없다. 목적은 "프로젝트가 요청을 받았다"는 활동 기록이다.
 */
async function runKeepAlive(env: Env): Promise<void> {
  await restGet(env, 'momozzang?select=slug&limit=1', env.SUPABASE_ANON_KEY);
}

/** 한 테이블의 전체 행을 페이지 단위로 모은다. */
async function fetchAllRows(
  env: Env,
  table: string,
  orderBy: string,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const res = await restGet(
      env,
      `${table}?select=*&order=${orderBy}.asc&limit=${PAGE_SIZE}&offset=${offset}`,
      env.SUPABASE_SECRET_KEY,
    );
    const chunk = (await res.json()) as unknown[];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) return rows;
  }
  throw new Error(`Backup aborted: ${table} exceeded ${MAX_PAGES} pages`);
}

/**
 * 하루 1회 전체 덤프. 이미 오늘 백업이 있으면 아무것도 하지 않는다(멱등).
 *
 * 멱등성을 cron 표현식이 아니라 **객체 존재 여부**로 잡은 이유: 한 tick 이 실패해도 다음 tick 이
 * 자동으로 다시 시도하고, cron 을 몇 개 걸어두든 하루 1개만 남는다.
 *
 * @returns 실제로 백업을 만들었으면 키, 이미 있어서 건너뛰었으면 null
 */
async function runBackupIfNeeded(env: Env, nowMs: number): Promise<string | null> {
  const key = backupKeyFor(nowMs);
  if (await env.BACKUP_BUCKET.head(key)) return null;

  const tables: Record<string, unknown[]> = {};
  for (const { table, orderBy } of BACKUP_TABLES) {
    tables[table] = await fetchAllRows(env, table, orderBy);
  }

  const payload = {
    version: 1,
    exportedAt: new Date(nowMs).toISOString(),
    source: env.SUPABASE_URL,
    counts: Object.fromEntries(
      Object.entries(tables).map(([name, rows]) => [name, rows.length]),
    ),
    tables,
  };

  await env.BACKUP_BUCKET.put(key, JSON.stringify(payload), {
    httpMetadata: {
      contentType: 'application/json',
      // 백업은 캐시 대상이 아니다(비공개 버킷이라 CDN 을 타지도 않는다).
      cacheControl: 'no-store',
    },
  });
  return key;
}

/** 보관 기간이 지난 백업 객체를 지운다. prefix 밖 객체는 절대 건드리지 않는다. */
async function pruneOldBackups(env: Env, nowMs: number): Promise<number> {
  const cutoff = nowMs - retentionDays(env) * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let cursor: string | undefined;

  do {
    const listed = await env.BACKUP_BUCKET.list({ prefix: BACKUP_PREFIX, cursor });
    const stale = listed.objects
      .filter((obj) => obj.uploaded.getTime() < cutoff)
      .map((obj) => obj.key);
    if (stale.length > 0) {
      await env.BACKUP_BUCKET.delete(stale);
      deleted += stale.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return deleted;
}

/**
 * 실패 알림(선택). webhook 이 없으면 조용히 넘어간다 — 알림 실패가 작업 실패를 덮지 않게
 * 여기서 발생한 예외는 삼킨다(원래 실패는 이미 console.error 로 남는다).
 */
async function notifyFailure(env: Env, message: string): Promise<void> {
  if (!env.ALERT_WEBHOOK_URL) return;
  try {
    await fetch(env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Slack 은 text, Discord 는 content 를 읽는다. 둘 다 넣어 한 벌로 대응한다.
      body: JSON.stringify({ text: message, content: message }),
    });
  } catch (e) {
    console.error('[cron] alert webhook failed', e);
  }
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default {
  /**
   * 스케줄 실행. tick 마다 keep-alive 를 하고, 오늘 백업이 없으면 백업까지 이어서 한다.
   *
   * keep-alive 와 백업은 **독립적으로** 실패해야 한다. 백업이 깨져도 일시정지 방지는 계속 돌아야
   * 하므로 각각 try 로 감싸고, 마지막에 실패가 하나라도 있으면 예외를 올려 Cloudflare 대시보드에
   * 실패로 기록되게 한다.
   */
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const nowMs = controller.scheduledTime;
    const failures: string[] = [];

    try {
      await runKeepAlive(env);
      console.log('[cron] keep-alive ok');
    } catch (e) {
      const msg = `keep-alive 실패: ${errorText(e)}`;
      console.error(`[cron] ${msg}`);
      failures.push(msg);
    }

    try {
      const key = await runBackupIfNeeded(env, nowMs);
      if (key) {
        const deleted = await pruneOldBackups(env, nowMs);
        console.log(`[cron] backup ok: ${key} (pruned ${deleted})`);
      } else {
        console.log('[cron] backup skipped (already exists for today)');
      }
    } catch (e) {
      const msg = `백업 실패: ${errorText(e)}`;
      console.error(`[cron] ${msg}`);
      failures.push(msg);
    }

    if (failures.length > 0) {
      const summary = `[momozzang cron] ${failures.join(' / ')}`;
      await notifyFailure(env, summary);
      throw new Error(summary);
    }
  },

  /**
   * 이 Worker 는 공개 API 가 없다. workers.dev 로 들어오는 요청은 정보를 흘리지 않고 404 로 닫는다.
   * (백업 다운로드는 `wrangler r2 object get` 등 인증된 경로로만 한다.)
   */
  async fetch(): Promise<Response> {
    return new Response('Not found', { status: 404 });
  },
};
