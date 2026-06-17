/**
 * R2 고아 객체 정리 스크립트
 *
 * 무엇을: Cloudflare R2 버킷(`momozzang-images`)에 존재하지만,
 *        `momozzang` 테이블의 어떤 청첩장 row 도 참조하지 않는 고아 객체를 식별·삭제한다.
 *
 * ── 안전 원칙 ────────────────────────────────────────────────────────────────
 *   1. 참조되는 키는 절대 삭제하지 않는다.
 *   2. DB 조회 결과가 0건이면 삭제 중단
 *      (참조 집합이 비면 모든 R2 객체가 고아로 오판될 위험 → 명시적 방어).
 *   3. 고아 비율이 R2 전체의 90% 이상이면 경고 + `--force` 없이는 중단.
 *   4. 비밀값은 루트 `.env` 에서만. 값을 로그/코드/커밋 어디에도 평문 출력하지 않는다.
 *   5. 기본은 dry-run. `--execute` 를 명시해야 실제 DeleteObject 를 수행한다.
 *
 * 사용한 .env 키 (값은 .env 에만):
 *   - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY : Supabase 읽기(전체 row)
 *   - CLOUDEFLARE_ACCESS_KEY_ID                  : R2 S3 Access Key ID
 *   - CLOUDEFLARE_SECRET_ACCESS_KEY              : R2 S3 Secret Access Key
 *   - CLOUDEFLARE_S3_CLIENT                      : R2 S3 호환 endpoint URL
 *   - R2_BUCKET (선택)                            : 버킷명 (기본: momozzang-images)
 *
 * 실행:
 *   # dry-run (기본 — 외부 쓰기 없음)
 *   pnpm --filter momozzang-invitation cleanup-orphans
 *   # 실제 삭제
 *   pnpm --filter momozzang-invitation cleanup-orphans -- --execute
 *   # 고아 비율 90% 이상이어도 강제 실행
 *   pnpm --filter momozzang-invitation cleanup-orphans -- --execute --force
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { AwsClient } from 'aws4fetch';

// 루트 .env 로드 (이 파일 기준 ../../../../../.env = 모노레포 루트)
loadEnv({ path: resolve(import.meta.dirname, '../../../../../.env') });

const DEFAULT_BUCKET = 'momozzang-images';

/** 고아 비율 경고 임계값 */
const ORPHAN_RATIO_WARN_THRESHOLD = 0.9;

// ── CLI 인자 ─────────────────────────────────────────────────────────────────

interface CliArgs {
  execute: boolean;
  force: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  let execute = false;
  let force = false;
  for (const a of argv) {
    if (a === '--execute') execute = true;
    else if (a === '--force') force = true;
  }
  return { execute, force };
}

// ── 환경변수 헬퍼 ─────────────────────────────────────────────────────────────

/** 환경변수 필수값 확인. 누락 시 키 이름만 출력(값은 절대 출력 금지). */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`환경변수 누락: ${name} (루트 .env 에 설정 필요 — 값은 .env 에만)`);
  }
  return v;
}

// ── R2: 전체 객체 나열 ────────────────────────────────────────────────────────

interface R2Object {
  key: string;
  size: number;
}

/** ListObjectsV2 응답 XML 에서 <Contents> 블록을 파싱해 키·크기를 추출한다. */
function parseListObjectsXml(xml: string): { objects: R2Object[]; nextContinuationToken?: string } {
  const objects: R2Object[] = [];

  // <Contents> … </Contents> 블록 전체를 반복 추출
  const contentsRe = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match: RegExpExecArray | null;
  while ((match = contentsRe.exec(xml)) !== null) {
    const block = match[1];
    const keyMatch = /<Key>([\s\S]*?)<\/Key>/.exec(block);
    const sizeMatch = /<Size>(\d+)<\/Size>/.exec(block);
    if (keyMatch) {
      objects.push({
        key: keyMatch[1].trim(),
        size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
      });
    }
  }

  // continuation token (다음 페이지)
  const tokenMatch = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml);
  const nextContinuationToken = tokenMatch ? tokenMatch[1].trim() : undefined;

  return { objects, nextContinuationToken };
}

/**
 * R2 버킷의 모든 객체를 ListObjectsV2 로 나열한다.
 * 1000개 초과 시 NextContinuationToken 으로 페이지네이션.
 */
async function listAllR2Objects(r2: AwsClient, endpoint: string, bucket: string): Promise<R2Object[]> {
  const all: R2Object[] = [];
  let continuationToken: string | undefined;
  let page = 1;

  do {
    const params = new URLSearchParams({ 'list-type': '2', 'max-keys': '1000' });
    if (continuationToken) params.set('continuation-token', continuationToken);

    const url = `${endpoint}/${bucket}?${params.toString()}`;
    const res = await r2.fetch(url, { method: 'GET' });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`R2 ListObjectsV2 실패 (HTTP ${res.status}) — ${body.slice(0, 300)}`);
    }

    const xml = await res.text();
    const { objects, nextContinuationToken } = parseListObjectsXml(xml);
    all.push(...objects);

    console.log(`  R2 페이지 ${page}: ${objects.length}개 조회 (누적 ${all.length}개)`);

    continuationToken = nextContinuationToken;
    page++;
  } while (continuationToken);

  return all;
}

// ── DB: 참조 키 수집 ──────────────────────────────────────────────────────────

/** http(s):// 로 시작하지 않는 비어있지 않은 문자열 = R2 상대 키 */
function isR2Key(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && !/^https?:\/\//i.test(value);
}

/**
 * 단일 row 의 data JSON 에서 이미지 필드를 순회하며 R2 키를 수집한다.
 *
 * 수집 대상 필드:
 *   - customization.mainImageUrl
 *   - invitationInfo.shareImageUrl
 *   - aboutUs.groomImageUrl
 *   - aboutUs.brideImageUrl
 *   - album[].url
 *   - album[].id  (url 과 다른 경우도 수집)
 */
function collectR2KeysFromData(data: Record<string, unknown>, out: Set<string>): void {
  const customization = data.customization as Record<string, unknown> | undefined;
  if (customization) {
    if (isR2Key(customization.mainImageUrl)) out.add(customization.mainImageUrl);
  }

  const invitationInfo = data.invitationInfo as Record<string, unknown> | undefined;
  if (invitationInfo) {
    if (isR2Key(invitationInfo.shareImageUrl)) out.add(invitationInfo.shareImageUrl);
  }

  const aboutUs = data.aboutUs as Record<string, unknown> | undefined;
  if (aboutUs) {
    if (isR2Key(aboutUs.groomImageUrl)) out.add(aboutUs.groomImageUrl);
    if (isR2Key(aboutUs.brideImageUrl)) out.add(aboutUs.brideImageUrl);
  }

  const album = data.album as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(album)) {
    for (const photo of album) {
      if (isR2Key(photo.url)) out.add(photo.url as string);
      if (isR2Key(photo.id)) out.add(photo.id as string);
    }
  }
}

/**
 * `momozzang` 테이블 전체 row 의 data 를 페이지네이션으로 읽어
 * R2 참조 키 집합을 반환한다.
 */
async function collectAllReferencedKeys(
  supabase: ReturnType<typeof createClient>,
): Promise<{ referencedKeys: Set<string>; totalRows: number }> {
  const referencedKeys = new Set<string>();
  const PAGE_SIZE = 1000;
  let from = 0;
  let totalRows = 0;
  let page = 1;

  while (true) {
    const { data: rows, error } = await supabase
      .from('momozzang')
      .select('slug, data')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`DB 조회 실패 (page ${page}): ${error.message}`);
    }

    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      if (row.data && typeof row.data === 'object') {
        collectR2KeysFromData(row.data as Record<string, unknown>, referencedKeys);
      }
    }

    console.log(
      `  DB 페이지 ${page}: ${rows.length}개 row 조회 (누적 참조 키 ${referencedKeys.size}개)`,
    );

    totalRows += rows.length;
    from += PAGE_SIZE;
    page++;

    // 페이지 결과가 PAGE_SIZE 미만이면 마지막 페이지
    if (rows.length < PAGE_SIZE) break;
  }

  return { referencedKeys, totalRows };
}

// ── R2: 단건 삭제 ─────────────────────────────────────────────────────────────

async function deleteR2Object(r2: AwsClient, endpoint: string, bucket: string, key: string): Promise<void> {
  const url = `${endpoint}/${bucket}/${key}`;
  const res = await r2.fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`R2 DELETE 실패 (HTTP ${res.status}) key=${key} — ${body.slice(0, 200)}`);
  }
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

async function main() {
  const { execute, force } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';

  console.log('────────────────────────────────────────────────────────');
  console.log(`R2 고아 객체 정리  [${mode}]`);
  console.log(`  force : ${force}`);
  console.log('────────────────────────────────────────────────────────\n');

  // ── Supabase 클라이언트 ──
  const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // ── R2 클라이언트 ──
  const accessKeyId = requireEnv('CLOUDEFLARE_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('CLOUDEFLARE_SECRET_ACCESS_KEY');
  const endpoint = requireEnv('CLOUDEFLARE_S3_CLIENT').replace(/\/+$/, '');
  const bucket = process.env.R2_BUCKET || DEFAULT_BUCKET;

  const r2 = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  // ── Step 1: R2 전체 객체 나열 ──
  console.log('[Step 1] R2 버킷 전체 객체 나열...');
  const r2Objects = await listAllR2Objects(r2, endpoint, bucket);
  const r2KeySet = new Set(r2Objects.map((o) => o.key));
  console.log(`  → R2 총 객체 수: ${r2Objects.length}개\n`);

  if (r2Objects.length === 0) {
    console.log('R2 버킷이 비어 있습니다. 정리할 객체가 없습니다.');
    return;
  }

  // ── Step 2: DB 참조 키 수집 ──
  console.log('[Step 2] DB 전체 row 의 참조 키 수집...');
  const { referencedKeys, totalRows } = await collectAllReferencedKeys(supabase);
  console.log(`  → DB 총 row 수: ${totalRows}개, 참조 키 수: ${referencedKeys.size}개\n`);

  // 안전 장치: DB 조회 결과 0건 → 중단
  if (totalRows === 0) {
    throw new Error(
      'DB 조회 결과 row 가 0건입니다. 참조 집합이 비어 있으면 모든 R2 객체가 고아로 오판될 수 있어 삭제를 중단합니다.',
    );
  }

  // ── Step 3: 고아 계산 ──
  console.log('[Step 3] 고아 객체 계산...');

  // 참조 키가 실제로 R2 에 존재하는지 교차 확인 (정보 출력용)
  let missingFromR2 = 0;
  for (const refKey of referencedKeys) {
    if (!r2KeySet.has(refKey)) missingFromR2++;
  }
  if (missingFromR2 > 0) {
    console.warn(
      `  주의: DB 가 참조하지만 R2 에 없는 키 ${missingFromR2}개 (이미 삭제됐거나 이름 불일치 — 이번 정리와 무관).`,
    );
  }

  const orphanObjects = r2Objects.filter((o) => !referencedKeys.has(o.key));
  const orphanTotalBytes = orphanObjects.reduce((acc, o) => acc + o.size, 0);
  const orphanRatio = orphanObjects.length / r2Objects.length;

  console.log(`  R2 총 객체   : ${r2Objects.length}개`);
  console.log(`  참조된 키    : ${referencedKeys.size}개`);
  console.log(`  고아 객체    : ${orphanObjects.length}개  (${(orphanRatio * 100).toFixed(1)}%)`);
  console.log(`  고아 총 용량 : ${(orphanTotalBytes / 1024 / 1024).toFixed(2)} MB\n`);

  if (orphanObjects.length === 0) {
    console.log('고아 객체가 없습니다. 정리가 필요하지 않습니다.');
    return;
  }

  // ── dry-run: 고아 목록 출력 후 종료 ──
  if (!execute) {
    console.log('[DRY-RUN] 아래 객체가 고아로 식별됩니다 (삭제 예정):');
    for (const o of orphanObjects) {
      console.log(`  ${o.key}  (${(o.size / 1024).toFixed(1)} KB)`);
    }
    console.log(
      `\n[DRY-RUN] 총 ${orphanObjects.length}개, ${(orphanTotalBytes / 1024 / 1024).toFixed(2)} MB 를 삭제할 예정입니다.`,
    );
    console.log('[DRY-RUN] 실제 삭제하려면 --execute 를 추가하세요.');
    return;
  }

  // ── EXECUTE 전 안전 체크: 고아 비율 90% 이상 경고 ──
  if (orphanRatio >= ORPHAN_RATIO_WARN_THRESHOLD) {
    const msg =
      `고아 비율이 ${(orphanRatio * 100).toFixed(1)}% 로 임계값(${ORPHAN_RATIO_WARN_THRESHOLD * 100}%) 이상입니다. ` +
      `참조 집합 추출에 오류가 있을 수 있습니다. ` +
      `계속하려면 --force 를 추가하세요.`;
    if (!force) {
      throw new Error(msg);
    }
    console.warn(`  경고: ${msg} (--force 로 계속 진행합니다.)\n`);
  }

  // ── EXECUTE: 실제 삭제 ──
  console.log(`[EXECUTE] 고아 객체 ${orphanObjects.length}개 삭제 시작...`);
  let deleted = 0;
  const failed: Array<{ key: string; reason: string }> = [];

  for (const o of orphanObjects) {
    try {
      await deleteR2Object(r2, endpoint, bucket, o.key);
      console.log(`  삭제 완료: ${o.key}`);
      deleted++;
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      console.warn(`  삭제 실패: ${o.key} — ${reason}`);
      failed.push({ key: o.key, reason });
    }
  }

  console.log(`\n[EXECUTE] 완료. 삭제 성공: ${deleted}개 / 실패: ${failed.length}개`);
  if (failed.length > 0) {
    console.warn('  삭제 실패 목록:');
    for (const f of failed) {
      console.warn(`    ${f.key}  — ${f.reason}`);
    }
  }
}

main().catch((err) => {
  console.error('\n오류로 중단:', err instanceof Error ? err.message : err);
  process.exit(1);
});
