#!/usr/bin/env node
// react-compiler-status.mjs — React Compiler 의 파일별 컴파일/베일아웃 상태와 사유를 출력한다.
//
// 스프린트 2(묶음 2) 계약의 게이트 G7·G8·G9 와 성공 기준 B4·C3·D1·D5 의 판정 수단이다.
//
// 규약
//  - 판정 채널은 stdout 이다. 파일을 쓰지 않는다. `--help` 는 사용법을 stdout 에 내고 exit 0.
//  - 변경 전 파일 추출은 계약 §0(라) 를 따른다 — 셸을 경유한 `git show` 를 쓰지 않고
//    `execFileSync('git', ['cat-file','blob', …], { encoding: 'buffer' })` 로 직접 받은 뒤
//    **바이트 수와 md5 를 출력하고**, `--expect-size`/`--expect-md5` 가 주어지면 assert 한다.
//    어긋나면 즉시 중단(exit 2).
//  - 셸 globbing 에 의존하지 않는다. 디렉토리 순회는 이 스크립트가 직접 한다.
//  - 새 의존성을 쓰지 않는다. `@babel/core`(7.28.0)·`babel-plugin-react-compiler`(1.0.0)는
//    저장소에 이미 있는 devDependency 이며, `@vitejs/plugin-react` 의 해석 경로로 찾는다
//    (하객·어드민 앱이 오늘 같은 방식으로 빌드된다).
//
// 종료 코드
//   0 판정 통과(또는 --help) / 1 판정 불통과 / 2 입력 문제·추출 assert 실패 / 3 예상 못한 전제 붕괴

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const HELP = `react-compiler-status.mjs — React Compiler 컴파일/베일아웃 상태 판정

사용법 (저장소 루트에서 실행)
  node <this> <target...>                      파일별 상세 모드
  node <this> --scan=<dir> [--rev=<rev>]       디렉토리 전량 스캔 모드
  node <this> --gate=<compile|bailout> --revs=<revA,revB> <path>
                                               컴파일 상태 불변 게이트 모드 (G8·G9)
  node <this> --help

target 형태
  <path>                    작업 트리의 파일
  git:<rev>:<path>          지정 rev 의 blob (git cat-file blob 로 추출, 크기·md5 출력)

옵션
  --scan=<dir>              <dir> 아래의 .ts/.tsx 전량을 스캔해 집계를 출력한다
  --rev=<rev>               스캔 대상을 작업 트리가 아니라 그 rev 의 blob 으로 잡는다
                            (rev 목록은 git ls-tree 로 구한다)
  --revs=<a,b>              게이트 모드에서 비교할 두 rev. 'WORKTREE' 는 작업 트리를 뜻한다
  --gate=<compile|bailout>  게이트 모드. 두 rev 의 판정이 서로 같고 기대 상태와 같아야 통과
  --expect-size=<N>         단일 git 타깃의 추출 바이트 수 assert
  --expect-md5=<hex>        단일 git 타깃의 추출 md5 assert
  --quiet-slots             상세 모드에서 memoSlots 열을 생략한다

집계 수치의 정의 (계약 §2 (2) · §7.5)
  compiled      = CompileSuccess >= 1 인 파일 수
  bailed        = CompileSuccess = 0 이고 CompileError >= 1 인 파일 수 (= 전량 베일아웃 파일)
  no-component  = 이벤트가 하나도 없는 파일 수 (컴파일 대상 컴포넌트/훅이 없다)
  bail-outs (N) = 베일아웃한 **함수**(CompileError 이벤트) 행 수. 고유 파일 수는 별도로 적는다

예
  # G7 (1) — 알려진 위반 후보 3건의 처분
  node <this> packages/ui/src/widgets/invitation/Gallery/SwipeStack/SwipeStack.tsx \\
              apps/momozzang-admin/src/pages/EditPage/EditPage.tsx \\
              apps/momozzang-admin/src/pages/AdminPage.tsx

  # G7 (2) — packages/ui 전량 스캔
  node <this> --scan=packages/ui/src

  # G8 — F7 이 WeddingInvitation.tsx 를 베일아웃 -> 컴파일로 뒤집지 않았는가
  node <this> --gate=bailout --revs=6ba4c83,WORKTREE \\
              packages/ui/src/pages/WeddingInvitation/WeddingInvitation.tsx

  # G9 — F8 이 MiniRoomScene.tsx 를 컴파일 -> 베일아웃으로 뒤집지 않았는가
  node <this> --gate=compile --revs=6ba4c83,WORKTREE \\
              packages/ui/src/widgets/invitation/MiniRoom/MiniRoomScene.tsx
`;

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

/* ---------------------------------------------------------------- 인자 파싱 */

const opts = { targets: [], scan: null, rev: null, revs: null, gate: null, expectSize: null, expectMd5: null, quietSlots: false };
for (const a of argv) {
  if (a.startsWith('--scan=')) opts.scan = a.slice('--scan='.length);
  else if (a.startsWith('--rev=')) opts.rev = a.slice('--rev='.length);
  else if (a.startsWith('--revs=')) opts.revs = a.slice('--revs='.length).split(',').map((s) => s.trim()).filter(Boolean);
  else if (a.startsWith('--gate=')) opts.gate = a.slice('--gate='.length);
  else if (a.startsWith('--expect-size=')) opts.expectSize = Number(a.slice('--expect-size='.length));
  else if (a.startsWith('--expect-md5=')) opts.expectMd5 = a.slice('--expect-md5='.length).toLowerCase();
  else if (a === '--quiet-slots') opts.quietSlots = true;
  else if (a.startsWith('--')) fail(2, `알 수 없는 옵션: ${a}`);
  else opts.targets.push(a);
}
if (opts.gate && !['compile', 'bailout'].includes(opts.gate)) fail(2, `--gate 는 compile 또는 bailout 이어야 한다: ${opts.gate}`);
if (opts.gate && (!opts.revs || opts.revs.length !== 2)) fail(2, '게이트 모드는 --revs=<a,b> 두 개를 요구한다');
if (opts.gate && opts.targets.length !== 1) fail(2, '게이트 모드는 경로 1개만 받는다');

function fail(code, msg) {
  process.stdout.write(`ERROR: ${msg}\n`);
  process.exit(code);
}

/* ------------------------------------------------------- 컴파일러 로딩 */

let babel;
let compilerId;
try {
  const req = createRequire(new URL(import.meta.url));
  const pluginReactPath = req.resolve('@vitejs/plugin-react', { paths: [process.cwd(), path.join(process.cwd(), 'apps/momozzang-admin')] });
  const reqFromPlugin = createRequire(pluginReactPath);
  babel = reqFromPlugin('@babel/core');
  compilerId = req.resolve('babel-plugin-react-compiler', { paths: [process.cwd(), path.join(process.cwd(), 'apps/momozzang-admin')] });
} catch (e) {
  fail(2, `컴파일러 툴체인 해석 실패 (저장소 루트에서 실행했는가?): ${e.message}`);
}

/* --------------------------------------------------------- 소스 획득 */

function md5(buf) {
  return createHash('md5').update(buf).digest('hex');
}

function readWorktree(p, { allowEmpty = false } = {}) {
  if (!fs.existsSync(p)) fail(2, `파일 없음: ${p}`);
  const buf = fs.readFileSync(p);
  // 0 바이트 금지는 "지정한 한 파일을 판정하려는데 추출이 비었다" 는 사고를 잡기 위한 것이다.
  // 스캔 모드에서는 저장소에 실제로 존재하는 빈 파일(예: 미사용 placeholder)을 만나므로
  // 중단하지 않고 `no-component` 으로 집계한다.
  if (buf.length === 0 && !allowEmpty) fail(2, `0 바이트 파일: ${p}`);
  return { code: buf.toString('utf8'), size: buf.length, md5: md5(buf), origin: `worktree:${p}` };
}

function readBlob(rev, p, { assert = false, allowEmpty = false } = {}) {
  let buf;
  try {
    buf = execFileSync('git', ['cat-file', 'blob', `${rev}:${p}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    fail(2, `git cat-file blob ${rev}:${p} 실패: ${String(e.message).split('\n')[0]}`);
  }
  if ((!buf || buf.length === 0) && !allowEmpty) fail(2, `추출 0 바이트: ${rev}:${p}`);
  const got = { code: buf.toString('utf8'), size: buf.length, md5: md5(buf), origin: `git:${rev}:${p}` };
  if (assert) {
    if (opts.expectSize != null && opts.expectSize !== got.size) fail(2, `크기 assert 실패: expected=${opts.expectSize} got=${got.size} (${got.origin})`);
    if (opts.expectMd5 != null && opts.expectMd5 !== got.md5) fail(2, `md5 assert 실패: expected=${opts.expectMd5} got=${got.md5} (${got.origin})`);
  }
  return got;
}

function resolveTarget(spec) {
  if (spec.startsWith('git:')) {
    const rest = spec.slice(4);
    const i = rest.indexOf(':');
    if (i < 0) fail(2, `git 타깃 형태는 git:<rev>:<path> 이다: ${spec}`);
    const rev = rest.slice(0, i);
    const p = rest.slice(i + 1);
    return { label: p, ...readBlob(rev, p, { assert: true }) };
  }
  return { label: spec, ...readWorktree(spec) };
}

/* -------------------------------------------------------- 컴파일 실행 */

function compile(label, code) {
  const events = [];
  let output = null;
  let thrown = null;
  try {
    const res = babel.transformSync(code, {
      filename: path.resolve(label),
      babelrc: false,
      configFile: false,
      browserslistConfigFile: false,
      sourceType: 'module',
      parserOpts: { plugins: ['typescript', 'jsx'] },
      plugins: [[compilerId, { logger: { logEvent: (_f, ev) => events.push(ev) } }]],
    });
    output = res && res.code;
  } catch (e) {
    thrown = e;
  }
  if (thrown) return { label, thrown, events, success: 0, error: 0, memoSlots: 0, compiledOutput: false, bailouts: [] };

  const success = events.filter((e) => e.kind === 'CompileSuccess').length;
  const error = events.filter((e) => e.kind === 'CompileError').length;
  const memoSlots = events.reduce((a, e) => a + (typeof e.memoSlots === 'number' ? e.memoSlots : 0), 0);
  const bailouts = events
    .filter((e) => e.kind === 'CompileError')
    .map((e) => {
      const o = (e.detail && e.detail.options) || {};
      const loc = o.loc || e.fnLoc || null;
      return { line: loc && loc.start ? loc.start.line : (e.fnLoc ? e.fnLoc.start.line : 0), reason: o.reason || String(o.category || 'unknown') };
    });
  return { label, events, success, error, memoSlots, compiledOutput: /memo_cache_sentinel/.test(output || ''), bailouts, thrown: null };
}

function verdictOf(r) {
  if (r.success >= 1 && r.error >= 1) return 'partial-bailout';
  if (r.success >= 1) return 'compile';
  if (r.error >= 1) return 'bailout';
  return 'no-component';
}

/* ------------------------------------------------------------ 게이트 모드 */

if (opts.gate) {
  const p = opts.targets[0];
  process.stdout.write(`=== GATE compile-state invariance\npath=${p}\nexpect=${opts.gate}\n`);
  const rows = [];
  for (const rev of opts.revs) {
    const src = rev === 'WORKTREE' ? readWorktree(p) : readBlob(rev, p);
    const r = compile(p, src.code);
    if (r.thrown) fail(3, `컴파일 호출 자체가 던졌다 (${rev}): ${r.thrown.message}`);
    const v = verdictOf(r);
    const reasons = r.bailouts.map((b) => `@${b.line} ${b.reason}`);
    rows.push({ rev, verdict: v, reasons, r, src });
    process.stdout.write(
      `  ${rev.padEnd(9)} bytes=${String(src.size).padEnd(6)} md5=${src.md5} verdict=${v.padEnd(15)}` +
        ` CompileSuccess=${r.success} CompileError=${r.error} memoSlots=${r.memoSlots}\n`,
    );
    for (const s of reasons) process.stdout.write(`      reason ${s}\n`);
  }
  const [a, b] = rows;
  const sameVerdict = a.verdict === b.verdict;
  const sameReasons = JSON.stringify(a.reasons) === JSON.stringify(b.reasons);
  const expectOk =
    opts.gate === 'compile'
      ? a.verdict === 'compile' && b.verdict === 'compile'
      : a.verdict === 'bailout' && b.verdict === 'bailout';
  const hold = sameVerdict && sameReasons && expectOk;
  process.stdout.write(
    `VERDICT: GATE ${hold ? 'HOLD' : 'BREAK'} (sameVerdict=${sameVerdict} sameReasons=${sameReasons} matchesExpect=${expectOk})\n`,
  );
  process.exit(hold ? 0 : 1);
}

/* ------------------------------------------------------------- 스캔 모드 */

if (opts.scan) {
  const base = opts.scan.replace(/\/+$/, '');
  let files;
  if (opts.rev) {
    let out;
    try {
      out = execFileSync('git', ['ls-tree', '-r', '--name-only', opts.rev, '--', base], { encoding: 'utf8' });
    } catch (e) {
      fail(2, `git ls-tree 실패: ${String(e.message).split('\n')[0]}`);
    }
    files = out.split('\n').filter((f) => /\.tsx?$/.test(f));
  } else {
    if (!fs.existsSync(base)) fail(2, `디렉토리 없음: ${base}`);
    files = [];
    const walk = (d) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.isFile() && /\.tsx?$/.test(ent.name)) files.push(p);
      }
    };
    walk(base);
  }
  files.sort();
  if (files.length === 0) fail(2, `스캔 대상 0건: ${base}`);

  const results = [];
  for (const f of files) {
    const src = opts.rev ? readBlob(opts.rev, f, { allowEmpty: true }) : readWorktree(f, { allowEmpty: true });
    const r = compile(f, src.code);
    if (r.thrown) fail(3, `컴파일 호출이 던졌다 (${f}): ${r.thrown.message}`);
    results.push(r);
  }

  const compiled = results.filter((r) => r.success >= 1).length;
  const bailed = results.filter((r) => r.success === 0 && r.error >= 1).length;
  const noComponent = results.filter((r) => r.success === 0 && r.error === 0).length;
  const fnSuccess = results.reduce((a, r) => a + r.success, 0);
  const fnError = results.reduce((a, r) => a + r.error, 0);
  const totalSlots = results.reduce((a, r) => a + r.memoSlots, 0);
  const bailRows = [];
  for (const r of results) for (const b of r.bailouts) bailRows.push({ file: r.label, ...b });
  const uniqueBailFiles = new Set(bailRows.map((b) => b.file)).size;
  const partial = results.filter((r) => r.success >= 1 && r.error >= 1);

  process.stdout.write(
    `# 수치 정의 (계약 §2 (2) · §7.5)\n` +
      `#   compiled     = CompileSuccess >= 1 인 파일 수\n` +
      `#   bailed       = CompileSuccess = 0 이고 CompileError >= 1 인 파일 수 (전량 베일아웃)\n` +
      `#   no-component = 이벤트 0건 파일 수\n` +
      `#   bail-outs(N) = 베일아웃 **함수**(CompileError 이벤트) 행 수. 고유 파일 수는 따로 적는다\n`,
  );
  process.stdout.write(`base=${base}${opts.rev ? ` rev=${opts.rev}` : ' rev=WORKTREE'}\n`);
  process.stdout.write(`files scanned=${files.length}  compiled=${compiled}  bailed=${bailed}  no-component=${noComponent}\n`);
  process.stdout.write(`fn CompileSuccess=${fnSuccess}  fn CompileError=${fnError}  total memoSlots=${totalSlots}\n`);
  process.stdout.write(`--- bail-outs (${bailRows.length}) --- unique files=${uniqueBailFiles}, 전량 베일아웃=${bailed}, 부분 베일아웃=${partial.length}\n`);
  for (const b of bailRows) process.stdout.write(`  ${b.file} @${b.line} :: ${b.reason}\n`);
  if (partial.length) {
    process.stdout.write(`--- partial bail-outs (${partial.length}) : CompileSuccess>=1 이면서 CompileError>=1 ---\n`);
    for (const r of partial) process.stdout.write(`  ${r.label} CompileSuccess=${r.success} CompileError=${r.error} memoSlots=${r.memoSlots}\n`);
  }
  process.exit(0);
}

/* ------------------------------------------------------------- 상세 모드 */

let anyThrown = false;
for (const spec of opts.targets) {
  const src = resolveTarget(spec);
  const r = compile(src.label, src.code);
  process.stdout.write(`\n=== ${src.label}\n`);
  process.stdout.write(`  origin=${src.origin} bytes=${src.size} md5=${src.md5}\n`);
  if (r.thrown) {
    anyThrown = true;
    process.stdout.write(`  THREW :: ${r.thrown.message.split('\n')[0]}\n`);
    continue;
  }
  process.stdout.write(`  compiledOutput=${r.compiledOutput}\n`);
  const counts = {};
  for (const e of r.events) counts[e.kind] = (counts[e.kind] || 0) + 1;
  process.stdout.write(`  events=${JSON.stringify(counts)}\n`);
  if (!opts.quietSlots) process.stdout.write(`  verdict=${verdictOf(r)} memoSlots=${r.memoSlots}\n`);
  // `SKIP` = 컴파일러가 그 함수를 건너뛴다는 고정 라벨. `?` = 함수명 자리
  // (logEvent 의 CompileError 이벤트는 fnName 을 싣지 않는다).
  for (const b of r.bailouts) process.stdout.write(`   SKIP ? @line${b.line} :: ${b.reason}\n`);
}
process.exit(anyThrown ? 3 : 0);
