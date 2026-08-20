#!/usr/bin/env node
// factory-singleton.mjs — F4 지연 싱글턴 의미론을 실제 소스 로직으로 검증한다.
//   * 팩토리 TS 소스를 Node 내장 module.stripTypeScriptTypes 로 타입 소거
//   * Repository import 를 카운팅 스텁 클래스로, import.meta.env 를 주입 스텁으로 치환
//   * 변환 후 sha256·치환 목록·인식한 분기 문장 2줄을 stdout 에 출력(자기증명)
// 변경 전 소스는 §0(라)/C-9 규약대로 execFileSync(...,{encoding:'buffer'}) 로만 추출하고
// 추출 직후 크기·sha256 을 출력하며, 크기가 0이면 즉시 중단한다.
// 판정 채널은 stdout. 파일을 쓰지 않는다. Node 내장 모듈만 사용한다.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';

const USAGE = `factory-singleton.mjs — 데이터 레이어 팩토리 3종의 지연 싱글턴 의미론 검증

usage:
  node factory-singleton.mjs [<rev>]     변경 전 비교 기준 rev (기본 1fe77bd)
  node factory-singleton.mjs --help      이 사용법을 stdout 에 출력하고 exit 0

검증 항목(팩토리별):
  - 변환 후 소스 sha256, 적용한 치환 목록 (자기증명)
  - 분기 문장 2줄이 <rev> 와 공백 정규화 기준으로 동일한지
  - env 값별로 어떤 구현체가 선택되는지, 3회 호출 중 생성 횟수
  - 호출 간 동일 인스턴스 반환 여부
  - authRepositoryFactory: 생성자가 던질 때 캐시가 오염되지 않는지(2회차도 throw)

예상하지 못한 구문(분기 문장 미발견 / 치환 0건 / 예상 밖 new 표현)을 만나면
OK 를 찍지 않고 즉시 exit 3 으로 중단한다.
`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const REV = argv.find((a) => !a.startsWith('--')) || '1fe77bd';

const FACTORIES = [
  {
    label: 'invitationRepositoryFactory',
    path: 'packages/ui/src/entities/WeddingInvitation/repositories/invitationRepositoryFactory.ts',
    fn: 'getInvitationRepository',
    supabase: 'SupabaseInvitationRepository',
    local: 'LocalInvitationRepository',
  },
  {
    label: 'guestBookRepositoryFactory',
    path: 'packages/ui/src/entities/GuestBook/api/guestBookRepositoryFactory.ts',
    fn: 'getGuestBookRepository',
    supabase: 'SupabaseGuestBookRepository',
    local: 'ApiGuestBookRepository',
  },
  {
    label: 'authRepositoryFactory',
    path: 'apps/momozzang-admin/src/features/auth/authRepositoryFactory.ts',
    fn: 'getAuthRepository',
    supabase: 'SupabaseAuthRepository',
    local: 'LocalAuthRepository',
    ctorThrowCheck: true,
  },
];

const BRANCH1_RE = /const\s+dataSource\s*=\s*import\.meta\.env\.VITE_DATA_SOURCE\s*;/;
const BRANCH2_RE = /if\s*\(\s*dataSource\s*===\s*'supabase'\s*\)/;

function die(msg, code = 3) {
  console.log(`FAIL: ${msg}`);
  process.exit(code);
}

function norm(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

// C-9: 셸 파이프를 경유하지 않고 buffer 로 직접 받는다.
function gitBlob(rev, path) {
  const buf = execFileSync('git', ['cat-file', 'blob', `${rev}:${path}`], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (!buf || buf.length === 0) die(`git blob ${rev}:${path} extracted 0 bytes`, 2);
  return buf;
}

function transform(src, f) {
  const subs = [];
  let out = src;

  // (1) Repository import 제거 → 스텁을 함수 파라미터로 주입한다.
  const importRe = /^import\s+\{[^}]*\}\s+from\s+'[^']*';[ \t]*\r?\n/gm;
  const importHits = out.match(importRe) || [];
  if (importHits.length === 0) die(`${f.label}: import 문을 찾지 못했다 (치환 0건)`);
  out = out.replace(importRe, '');
  subs.push(`import -> removed x${importHits.length} (스텁을 파라미터로 주입)`);

  // (2) import.meta.env → 주입 스텁 (new Function 본문에는 import.meta 를 둘 수 없다)
  const envHits = (out.match(/import\.meta\.env/g) || []).length;
  if (envHits === 0) die(`${f.label}: import.meta.env 치환 0건`);
  out = out.replace(/import\.meta\.env/g, '__env');
  subs.push(`import.meta.env -> injected x${envHits}`);

  // (3) 타입 소거 (Node 내장)
  out = stripTypeScriptTypes(out, { mode: 'strip' });

  // (4) export 제거
  const exportHits = (out.match(/^export\s+/gm) || []).length;
  out = out.replace(/^export\s+/gm, '');
  subs.push(`export -> removed x${exportHits}`);

  // (5) new 표현이 예상 위치(두 구현체)만인지 확인
  const news = [...out.matchAll(/new\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
  if (news.length === 0) die(`${f.label}: new 표현을 찾지 못했다`);
  for (const n of news) {
    if (n !== f.supabase && n !== f.local) {
      die(`${f.label}: 예상 밖 new 표현 'new ${n}()' — 기대: ${f.supabase} | ${f.local}`);
    }
  }
  subs.push(`new expr -> ${news.length}건 전부 {${f.supabase} | ${f.local}} (예상 위치)`);

  return { code: out, subs, newCount: news.length };
}

function makeStub(name, counter, shouldThrow) {
  const C = class {
    constructor() {
      counter.n += 1;
      if (shouldThrow) throw new Error(`${name}: forced ctor throw`);
      this.__stub = name;
    }
  };
  Object.defineProperty(C, 'name', { value: name });
  return C;
}

function build(code, f, envValue, opts = {}) {
  const counters = { supabase: { n: 0 }, local: { n: 0 } };
  const SupabaseStub = makeStub(f.supabase, counters.supabase, Boolean(opts.throwSupabase));
  const LocalStub = makeStub(f.local, counters.local, Boolean(opts.throwLocal));
  const body = `${code}\nreturn ${f.fn};`;
  let factoryFn;
  try {
    // eslint-disable-next-line no-new-func
    factoryFn = new Function('__env', f.supabase, f.local, body)(
      { VITE_DATA_SOURCE: envValue },
      SupabaseStub,
      LocalStub,
    );
  } catch (e) {
    die(`${f.label}: 변환된 소스 평가 실패 — ${e.message}`);
  }
  if (typeof factoryFn !== 'function') die(`${f.label}: ${f.fn} 이 함수가 아니다`);
  return { factoryFn, counters };
}

let allOk = true;
console.log(`factory-singleton.mjs — 지연 싱글턴 의미론 검증 (변경 전 비교 rev: ${REV})`);

for (const f of FACTORIES) {
  console.log('');
  console.log(`[${f.label}]`);

  let after;
  try {
    after = readFileSync(f.path, 'utf8');
  } catch {
    die(`READ FAIL: ${f.path}`, 2);
  }
  const beforeBuf = gitBlob(REV, f.path);
  const before = beforeBuf.toString('utf8');
  console.log(
    `  before blob: git cat-file blob ${REV}:${f.path} (${beforeBuf.length} bytes, sha256 ${sha256(before)})`,
  );
  console.log(`  after : working tree (${Buffer.byteLength(after)} bytes, sha256 ${sha256(after)})`);

  const b1a = BRANCH1_RE.exec(after);
  const b2a = BRANCH2_RE.exec(after);
  const b1b = BRANCH1_RE.exec(before);
  const b2b = BRANCH2_RE.exec(before);
  if (!b1a || !b2a) die(`${f.label}: 작업 트리에서 분기 문장 2개를 찾지 못했다`);
  if (!b1b || !b2b) die(`${f.label}: ${REV} 에서 분기 문장 2개를 찾지 못했다`);

  const { code, subs, newCount } = transform(after, f);
  console.log(`  transformed sha256: ${sha256(code)}`);
  console.log(`  substitutions: ${subs.join(', ')}`);
  console.log(`  branch stmt 1: ${norm(b1a[0])}`);
  console.log(`  branch stmt 2: ${norm(b2a[0])}`);
  const branchSame = norm(b1a[0]) === norm(b1b[0]) && norm(b2a[0]) === norm(b2b[0]);
  console.log(
    `  branch stmts unchanged vs ${REV} (whitespace-normalized): ${branchSame}`.padEnd(84) +
      (branchSame ? 'OK' : 'FAIL'),
  );
  if (!branchSame) allOk = false;
  console.log(`  new-expr count in factory: ${newCount}`);

  for (const [envLabel, envValue, expected, counterKey] of [
    ["env=undefined ", undefined, f.local, 'local'],
    ["env='supabase'", 'supabase', f.supabase, 'supabase'],
  ]) {
    const { factoryFn, counters } = build(code, f, envValue);
    const r1 = factoryFn();
    const r2 = factoryFn();
    const r3 = factoryFn();
    const made = counters[counterKey].n;
    const other = counterKey === 'local' ? counters.supabase.n : counters.local.n;
    const picked = r1?.constructor?.name;
    const same = r1 === r2 && r2 === r3;
    const ok = picked === expected && made === 1 && other === 0 && same;
    if (!ok) allOk = false;
    console.log(
      `  ${envLabel} -> ${String(picked).padEnd(30)} constructions=${made} over 3 calls`.padEnd(84) +
        (ok ? 'OK' : `FAIL (expected ${expected}, constructions=1, other=0, same=true; got same=${same}, other=${other})`),
    );
    console.log(`  ${envLabel.trim()} same instance across calls: ${same}`.padEnd(84) + (same ? 'OK' : 'FAIL'));
  }

  if (f.ctorThrowCheck) {
    // LocalAuthRepository 는 supabase 모드에서 throw 하는 트립와이어를 생성자에 갖는다.
    // 검증하려는 불변식: "생성자가 던지면 캐시가 오염되지 않아 2회차 호출도 다시 던진다".
    // env 를 supabase 로 두면 분기가 Local 을 고르지 않으므로, Local 스텁의 생성자를
    // 강제로 던지게 해 같은 불변식을 직접 확인한다.
    const { factoryFn, counters } = build(code, f, undefined, { throwLocal: true });
    let t1 = false;
    let t2 = false;
    try { factoryFn(); } catch { t1 = true; }
    try { factoryFn(); } catch { t2 = true; }
    const ok = t1 && t2 && counters.local.n === 2;
    if (!ok) allOk = false;
    console.log(
      `  ctor-throw (LocalAuthRepository 트립와이어 모사): throws on call#1: ${t1}, call#2: ${t2}`.padEnd(84) +
        (ok ? 'OK' : 'FAIL'),
    );
    console.log(
      `  (생성자 예외 시 캐시 오염 없음 = 변경 전과 동일하게 매 호출 throw. 생성 시도 ${counters.local.n}회)`,
    );
  }
}

console.log('');
console.log(`VERDICT: ${allOk ? 'LAZY SINGLETON SEMANTICS OK' : 'NOT SINGLETON (or branch changed)'}`);
process.exit(allOk ? 0 : 1);
