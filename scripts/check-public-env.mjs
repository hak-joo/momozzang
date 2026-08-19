#!/usr/bin/env node
// 클라이언트 번들에 **권한 키가 실리는 것을 빌드 단계에서 차단**한다.
//
//   node scripts/check-public-env.mjs <앱 디렉토리>
//
// 왜 런타임 검사가 아니라 빌드 검사인가:
// Vite 는 `VITE_` 접두사 변수를 **코드가 그 값을 쓰든 말든** 번들 문자열에 인라인한다.
// 따라서 "권한 키면 클라이언트를 만들지 않는다" 같은 런타임 가드는 노출을 전혀 막지 못한다.
// 키가 빌드 입력에 존재하는 순간 이미 산출물에 박힌다. 막을 수 있는 유일한 지점은 빌드 이전이다.
//
// 차단 대상:
//   - 새 체계 시크릿 키: `sb_secret_...`
//   - 구 체계 JWT 중 `role` 이 `service_role`(또는 anon 이 아닌 권한 롤)인 것
// 통과 대상: `sb_publishable_...`, `role: anon` JWT.
import fs from 'node:fs';
import path from 'node:path';

const appDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/**
 * **번들에 실제로 실리는 것만** 실패 대상이다.
 * Vite 의 `envDir` 기본값은 프로젝트 루트(=각 앱 디렉토리)라, 저장소 루트 `.env` 는 읽지 않는다.
 * (실측: 루트 `.env` 는 `VITE_DATA_SOURCE=local` 인데 브라우저에는 앱 `.env` 의 `supabase` 가 나갔다.)
 * 루트 `.env` 를 실패로 처리하면 Vite 가 보지도 않는 파일 때문에 빌드가 막히는 오탐이 된다.
 */
const bundledEnvFiles = [
  path.join(appDir, '.env'),
  path.join(appDir, '.env.local'),
  path.join(appDir, '.env.production'),
  path.join(appDir, '.env.production.local'),
];

/** 번들에는 안 실리지만 사람이 알아야 하는 곳 — 경고만 낸다(마이그레이션 스크립트가 읽는 파일이다). */
const advisoryEnvFiles = [path.join(repoRoot, '.env')];

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** 값이 권한 키인지 판정한다. 판정 결과만 돌려주고 값 자체는 어디에도 남기지 않는다. */
function privilegedReason(value) {
  if (!value) return null;
  if (value.startsWith('sb_secret_')) return '새 체계 시크릿 키(sb_secret_)';

  const parts = value.split('.');
  if (parts.length === 3 && parts[0].startsWith('eyJ')) {
    try {
      const pad = '='.repeat((4 - (parts[1].length % 4)) % 4);
      const claims = JSON.parse(Buffer.from(parts[1] + pad, 'base64url').toString('utf8'));
      if (claims.role && claims.role !== 'anon') return `legacy JWT (role: ${claims.role})`;
    } catch {
      /* JWT 가 아니면 검사 대상이 아니다 */
    }
  }
  return null;
}

function scan(sources) {
  const found = [];
  for (const [origin, bag] of sources) {
    for (const [key, value] of Object.entries(bag)) {
      if (!key.startsWith('VITE_')) continue;
      const reason = privilegedReason(String(value));
      if (reason) found.push({ origin, key, reason });
    }
  }
  return found;
}

const violations = scan([
  ...bundledEnvFiles.map((f) => [path.relative(repoRoot, f), parseEnvFile(f)]),
  ['process.env', process.env],
]);

const advisories = scan(
  advisoryEnvFiles.map((f) => [path.relative(repoRoot, f), parseEnvFile(f)]),
);

if (violations.length > 0) {
  console.error('\n✖ 빌드 중단 — 클라이언트에 노출되면 안 되는 권한 키가 VITE_ 변수에 있습니다.\n');
  for (const v of violations) {
    console.error(`  ${v.key}  (${v.origin})  → ${v.reason}`);
  }
  console.error(`
  VITE_ 접두사 변수는 빌드 시 번들 문자열에 그대로 인라인되어, 배포된 사이트를 여는
  누구나 꺼내 볼 수 있습니다. 권한 키는 RLS 를 우회하므로 DB 전체가 열립니다.

  조치:
    1) 브라우저용에는 **publishable 키**(sb_publishable_...) 또는 role 이 anon 인 키를 쓰세요.
    2) 권한 키가 필요한 서버 스크립트(pnpm migrate 등)는 VITE_ 가 아닌 이름
       (예: SUPABASE_SECRET_KEY)으로 분리하세요. VITE_ 가 아니면 번들에 실리지 않습니다.
    3) 이미 배포된 적이 있다면 그 키는 유출된 것으로 보고 폐기·재발급하세요.
`);
  process.exit(1);
}

for (const a of advisories) {
  console.warn(
    `⚠ ${a.key} (${a.origin}) → ${a.reason}\n` +
      '  이 파일은 Vite 가 읽지 않아 번들에는 실리지 않지만, 권한 키를 VITE_ 이름으로 두면\n' +
      '  누군가 앱 .env 로 복사하는 순간 그대로 유출된다. SUPABASE_SECRET_KEY 로 옮기길 권한다.',
  );
}

console.log('✓ 번들에 실리는 VITE_ 환경변수에 권한 키 없음');
