/**
 * 비파괴 R2 마이그레이션 스크립트 (SPEC §2 F8 — "복제" 방식)
 *
 * 무엇을: 기존 청첩장 1건(source slug)을 읽어, 그 이미지들을 Cloudflare R2 로 복사하고,
 *        이미지 URL 을 R2 객체 키로 치환한 **새 청첩장을 새 slug(target)로 INSERT** 한다.
 *
 * 핵심 안전 원칙:
 *   - 비파괴: source row 는 절대 UPDATE/DELETE 하지 않는다. target slug 로 **새 row INSERT** 만 한다.
 *   - 멱등: 이미 키(상대경로)인 필드는 스킵(http(s):// 절대 URL 만 마이그레이션 대상).
 *           target 이 이미 존재하면 기본은 중단(에러), `--force` 일 때만 덮어쓴다.
 *   - 안전 우선: 기본은 **dry-run**. 실제 다운로드/업로드/INSERT 는 `--execute` 를 명시해야 수행된다.
 *   - R2 객체도 새 키(prefix-ts-random.ext)로만 PUT → 기존 객체 덮어쓰지 않음.
 *
 * ── 비밀값 취급 ───────────────────────────────────────────────────────────────
 * R2 S3 호환 자격증명은 루트 `.env` 에서만 읽고, 값을 로그/코드/커밋 어디에도 평문 출력하지 않는다.
 * (이 스크립트는 1회성 마이그레이션 전용이며, 어드민/Worker 런타임 번들과 무관하다.)
 *
 * 사용한 .env 키 (값은 .env 에만):
 *   - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY : Supabase 접속(읽기+INSERT)
 *   - CLOUDEFLARE_ACCESS_KEY_ID                  : R2 S3 Access Key ID (* 기존 .env 의 오타 철자 그대로 사용)
 *   - CLOUDEFLARE_SECRET_ACCESS_KEY              : R2 S3 Secret Access Key
 *   - CLOUDEFLARE_S3_CLIENT                      : R2 S3 호환 endpoint URL (예: https://<account>.r2.cloudflarestorage.com)
 *                                                 (이름은 .env 철자 그대로 읽되, 의미는 'S3 endpoint' 다)
 *   - R2_BUCKET (선택)                            : 버킷명. 미설정 시 기본 'momozzang-images'
 *
 * 실행:
 *   # dry-run (기본 — 외부 쓰기 없음)
 *   pnpm --filter momozzang-invitation migrate -- --source hakjoo-minjeong --target hakjoo-minjeong2
 *   # 실제 실행
 *   pnpm --filter momozzang-invitation migrate -- --source hakjoo-minjeong --target hakjoo-minjeong2 --execute
 *   # target 이 이미 있을 때 덮어쓰기(주의)
 *   pnpm --filter momozzang-invitation migrate -- --source <s> --target <t> --execute --force
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { AwsClient } from 'aws4fetch';
import sharp from 'sharp';

// 루트 .env 를 로드 (이 파일 기준 ../../../../../.env = 모노레포 루트)
loadEnv({ path: resolve(import.meta.dirname, '../../../../../.env') });

const DEFAULT_BUCKET = 'momozzang-images';

/** content-type → 확장자 매핑 (Worker 의 ALLOWED_CONTENT_TYPES 와 동일 컨벤션) */
const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** 이미 완성된 절대 URL(마이그레이션 대상) 판별 — http(s):// 만 대상. 그 외(키/상대경로)는 스킵 → 멱등. */
function isAbsoluteHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

/**
 * Worker 의 buildObjectKey 와 동일 컨벤션: `<prefix>-<timestamp>-<random>.<ext>`.
 * 문자셋은 영숫자·`-`·`.` 로 제한 → buildImageUrl 불변식 유지(슬래시·passthrough 접두사 없음).
 */
function buildObjectKey(prefix: string, ext: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now()}-${random}.${ext}`;
}

/** content-type 헤더에서 확장자 결정. 알 수 없으면 URL 확장자로 폴백, 그래도 없으면 jpg. */
function extFromContentType(contentType: string | null, sourceUrl: string): string {
  const normalized = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (CONTENT_TYPE_EXT[normalized]) return CONTENT_TYPE_EXT[normalized];
  const m = sourceUrl.split('?')[0].match(/\.([a-zA-Z0-9]{2,5})$/);
  const urlExt = m?.[1]?.toLowerCase();
  if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt)) {
    return urlExt === 'jpeg' ? 'jpg' : urlExt;
  }
  return 'jpg';
}

interface CliArgs {
  source: string;
  target: string;
  execute: boolean;
  force: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') args.execute = true;
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.execute = false;
    else if (a === '--source') args.source = argv[++i];
    else if (a === '--target') args.target = argv[++i];
    else if (a.startsWith('--source=')) args.source = a.slice('--source='.length);
    else if (a.startsWith('--target=')) args.target = a.slice('--target='.length);
  }
  // 하드코딩 금지 — 인자 미지정 시 기본 실행 예(사용자 청첩장)로만 폴백.
  const source = (args.source as string) || 'hakjoo-minjeong';
  const target = (args.target as string) || 'hakjoo-minjeong2';
  return {
    source,
    target,
    execute: args.execute === true,
    force: args.force === true,
  };
}

/** 환경변수 필수값 확인. 누락 시 키 이름만 출력(값은 절대 출력 금지). */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`환경변수 누락: ${name} (루트 .env 에 설정 필요 — 값은 .env 에만)`);
  }
  return v;
}

interface MigrationTask {
  /** 사람이 읽기 위한 JSON 경로 라벨 (예: customization.mainImageUrl, album[2].url) */
  label: string;
  /** 원본 절대 URL */
  sourceUrl: string;
  /** 키 prefix (admin | gallery) */
  prefix: string;
  /** 이 task 가 결정한 새 R2 키 (dry-run 에서도 예고용으로 미리 생성) */
  newKey: string;
  /** JSON 에 치환 적용하는 콜백 */
  apply: (newKey: string) => void;
  /** album 항목이면 id 도 함께 갱신 */
  applyId?: (newKey: string) => void;
}

/**
 * data JSON 을 순회하며 마이그레이션 대상(절대 http(s) URL)을 수집한다.
 * data 는 호출자가 깊은 복사한 객체이므로, apply 콜백이 직접 mutate 해도 source 원본엔 영향 없음.
 */
function collectTasks(data: Record<string, unknown>): MigrationTask[] {
  const tasks: MigrationTask[] = [];

  const pushSingle = (
    label: string,
    prefix: string,
    get: () => unknown,
    set: (v: string) => void,
  ) => {
    const v = get();
    if (isAbsoluteHttpUrl(v)) {
      tasks.push({
        label,
        sourceUrl: v,
        prefix,
        newKey: '', // download 시점에 content-type 으로 확정
        apply: set,
      });
    }
  };

  const customization = data.customization as Record<string, unknown> | undefined;
  if (customization) {
    pushSingle(
      'customization.mainImageUrl',
      'admin',
      () => customization.mainImageUrl,
      (v) => {
        customization.mainImageUrl = v;
      },
    );
  }

  const invitationInfo = data.invitationInfo as Record<string, unknown> | undefined;
  if (invitationInfo) {
    pushSingle(
      'invitationInfo.shareImageUrl',
      'admin',
      () => invitationInfo.shareImageUrl,
      (v) => {
        invitationInfo.shareImageUrl = v;
      },
    );
  }

  const aboutUs = data.aboutUs as Record<string, unknown> | undefined;
  if (aboutUs) {
    pushSingle(
      'aboutUs.groomImageUrl',
      'admin',
      () => aboutUs.groomImageUrl,
      (v) => {
        aboutUs.groomImageUrl = v;
      },
    );
    pushSingle(
      'aboutUs.brideImageUrl',
      'admin',
      () => aboutUs.brideImageUrl,
      (v) => {
        aboutUs.brideImageUrl = v;
      },
    );
  }

  const album = data.album as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(album)) {
    album.forEach((photo, idx) => {
      const url = photo.url;
      if (isAbsoluteHttpUrl(url)) {
        tasks.push({
          label: `album[${idx}].url`,
          sourceUrl: url,
          prefix: 'gallery',
          newKey: '',
          apply: (v) => {
            photo.url = v;
          },
          // id 가 기존 url 과 동일(절대 URL)했다면 키로 함께 갱신해 일관성 유지.
          applyId:
            photo.id === url
              ? (v) => {
                  photo.id = v;
                }
              : undefined,
        });
      }
    });
  }

  return tasks;
}

async function main() {
  const { source, target, execute, force } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';

  console.log('────────────────────────────────────────────────────────');
  console.log(`R2 비파괴 마이그레이션 (복제)  [${mode}]`);
  console.log(`  source slug : ${source}  (읽기 전용, 절대 수정 안 함)`);
  console.log(`  target slug : ${target}  (새 row INSERT)`);
  console.log(`  force       : ${force}`);
  console.log('────────────────────────────────────────────────────────');

  // ── Supabase 클라이언트 (스크립트 전용 — 어드민/뷰어 런타임과 무관) ──
  const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // ── source row 로드 ──
  const { data: sourceRow, error: srcErr } = await supabase
    .from('momozzang')
    .select('data')
    .eq('slug', source)
    .single();

  if (srcErr || !sourceRow?.data) {
    throw new Error(`source slug '${source}' 의 청첩장을 찾을 수 없습니다. (${srcErr?.message ?? 'no data'})`);
  }

  // ── target 존재 여부 확인 (비파괴 보호) ──
  const { data: targetRow } = await supabase
    .from('momozzang')
    .select('slug')
    .eq('slug', target)
    .maybeSingle();

  if (targetRow && !force) {
    throw new Error(
      `target slug '${target}' 가 이미 존재합니다. 덮어쓰려면 --force 를 명시하세요. (기본은 비파괴 보호로 중단)`,
    );
  }
  if (targetRow && force) {
    console.warn(`⚠️  target '${target}' 가 이미 존재 → --force 로 덮어쓰기(upsert) 진행.`);
  }

  // ── data 깊은 복사 (source 원본 불변 보장) ──
  const clonedData = JSON.parse(JSON.stringify(sourceRow.data)) as Record<string, unknown>;
  const tasks = collectTasks(clonedData);

  console.log(`\n마이그레이션 대상 이미지: ${tasks.length}개 (http(s):// 절대 URL 만; 이미 키인 필드는 스킵)\n`);

  if (tasks.length === 0) {
    console.log('  → 변환할 절대 URL 이 없습니다. (이미 키로 저장됨 — 멱등)');
  }

  if (!execute) {
    // ── DRY-RUN: 예정 키만 산출/출력 (다운로드/업로드/INSERT 없음) ──
    for (const t of tasks) {
      const predictedExt = extFromContentType(null, t.sourceUrl);
      const predictedKey = buildObjectKey(t.prefix, predictedExt);
      console.log(`  [${t.label}]`);
      console.log(`     from : ${t.sourceUrl}`);
      console.log(`     → key: ${predictedKey}  (예정; 실제 확장자는 응답 content-type 으로 확정)`);
    }
    console.log(`\n[DRY-RUN] 위 ${tasks.length}개 이미지를 R2 로 복사하고, target slug '${target}' 로 새 row 를 INSERT 할 예정입니다.`);
    console.log('[DRY-RUN] 실제 수행하려면 --execute 를 추가하세요. (외부 쓰기 없이 종료)');
    return;
  }

  // ── EXECUTE: R2 클라이언트 준비 (비밀값은 .env 에서만, 평문 출력 금지) ──
  const accessKeyId = requireEnv('CLOUDEFLARE_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('CLOUDEFLARE_SECRET_ACCESS_KEY');
  // CLOUDEFLARE_S3_CLIENT = R2 S3 호환 endpoint URL 로 사용(이름은 .env 철자 그대로).
  const endpoint = requireEnv('CLOUDEFLARE_S3_CLIENT').replace(/\/+$/, '');
  const bucket = process.env.R2_BUCKET || DEFAULT_BUCKET;

  const r2 = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  let copied = 0;
  const skipped: Array<{ label: string; url: string; reason: string }> = [];
  for (const t of tasks) {
    try {
      // (a) 원본 다운로드 (일시적 네트워크 오류 대비 재시도)
      const res = await withRetry(() => fetch(t.sourceUrl), `다운로드 [${t.label}]`);
      if (!res.ok) {
        throw new Error(`다운로드 HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      const rawBody = new Uint8Array(await res.arrayBuffer());

      // (b-1) sharp 다운스케일: 긴 변 최대 1920px, JPEG quality 80 변환.
      //       변환 실패 시 원본 바이트·content-type 으로 폴백(투명 PNG 등 예외 방어).
      let body: Uint8Array;
      let uploadContentType: string;
      let ext: string;
      try {
        const resized = await sharp(rawBody)
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        body = new Uint8Array(resized);
        uploadContentType = 'image/jpeg';
        ext = 'jpg';
        console.log(
          `  ↓ [${t.label}] sharp 변환: ${rawBody.length} → ${body.length} bytes (jpeg q80, ≤1920px)`,
        );
      } catch (sharpErr) {
        console.warn(
          `  ⚠ [${t.label}] sharp 변환 실패, 원본 바이트로 폴백: ${sharpErr instanceof Error ? sharpErr.message : String(sharpErr)}`,
        );
        body = rawBody;
        uploadContentType = contentType ?? 'application/octet-stream';
        ext = extFromContentType(contentType, t.sourceUrl);
      }

      // (b-2) 새 키 생성 + R2 PUT (새 키만 → 기존 객체 비파괴)
      const key = buildObjectKey(t.prefix, ext);
      const putUrl = `${endpoint}/${bucket}/${key}`;
      const putRes = await withRetry(
        () =>
          r2.fetch(putUrl, {
            method: 'PUT',
            body,
            headers: {
              'Content-Type': uploadContentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          }),
        `R2 PUT [${t.label}]`,
      );
      if (!putRes.ok) {
        const detail = await putRes.text().catch(() => '');
        throw new Error(`R2 업로드 HTTP ${putRes.status} ${detail.slice(0, 200)}`);
      }

      // (c) JSON 치환
      t.apply(key);
      t.applyId?.(key);
      copied += 1;
      console.log(`  ✓ [${t.label}] → ${key}`);
    } catch (e) {
      // 실패 이미지는 원본 URL 유지(치환 안 함)하고 계속. buildImageUrl passthrough 로 안 깨짐.
      // (예: shareImageUrl 이 Supabase 아닌 외부/mock 호스트 → ENOTFOUND)
      const reason = e instanceof Error ? e.message : String(e);
      skipped.push({ label: t.label, url: t.sourceUrl, reason });
      console.warn(`  ⊘ [${t.label}] 스킵(원본 URL 유지): ${reason}`);
    }
  }

  if (skipped.length) {
    console.warn(`\n⚠ ${skipped.length}개 이미지 스킵(원본 URL 유지 — 마이그레이션 대상 아님/실패):`);
    for (const s of skipped) console.warn(`   - [${s.label}] ${s.url} (${s.reason})`);
  }

  // ── target slug 로 새 row INSERT (source 불변; --force 시 upsert) ──
  if (targetRow && force) {
    const { error: upErr } = await supabase
      .from('momozzang')
      .update({ data: clonedData })
      .eq('slug', target);
    if (upErr) throw new Error(`target UPDATE(force) 실패: ${upErr.message}`);
  } else {
    const { error: insErr } = await supabase
      .from('momozzang')
      .insert({ slug: target, data: clonedData });
    if (insErr) throw new Error(`target INSERT 실패: ${insErr.message}`);
  }

  console.log(`\n[EXECUTE] 완료. 이미지 ${copied}/${tasks.length}개 R2 복사, target slug '${target}' 로 새 row ${targetRow && force ? 'UPDATE(force)' : 'INSERT'} 완료.`);
  console.log(`[EXECUTE] source slug '${source}' 는 변경되지 않았습니다(비파괴).`);
}

/** fetch 등 일시적 실패에 대비한 재시도 래퍼. 실패 시 err.cause(ECONNRESET 등)까지 노출. */
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const cause = (e as { cause?: { code?: string; message?: string } })?.cause;
      const causeStr = cause ? ` (cause: ${cause.code ?? cause.message ?? String(cause)})` : '';
      console.warn(
        `  ⚠ ${label} 시도 ${i}/${attempts} 실패: ${e instanceof Error ? e.message : String(e)}${causeStr}`,
      );
      if (i < attempts) await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
  throw lastErr;
}

main().catch((err) => {
  console.error('\n✗ 마이그레이션 실패:', err instanceof Error ? err.message : err);
  process.exit(1);
});
