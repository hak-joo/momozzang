#!/usr/bin/env node
// hue-cache-parity.mjs — 색조 캐시(F10)의 계약 판정 (기준 N2·N3·N4·N5·N6 / 게이트 G-e)
//
// 판정 5건
//   N2  DoD 17  키 순수성 — 5인자를 하나씩만 바꿀 때마다 키가 달라진다. 같은 인자면 같은 키.
//               `strategy` 3값(undefined/'absolute'/'relative') ×
//               `preserveSkinTones` 3값(undefined/false/true) 전수 9키가 서로 다르다.
//   N3  DoD 18  `Direction` 4호출(:52~:55)이 **고유 키 3개**이고 `:52`·`:55` 가 동일 키다.
//   N4  DoD 21  `HUE_SHIFT_CACHE_LIMIT` 가 export 되어 있고, `LIMIT + 1` 개를 넣으면 가장
//               오래된 항목이 사라지고 최신이 남는다. 축출된 키를 다시 요청하면 factory 가
//               재호출되고 반환값이 이전과 같다.
//   N5  F10     single-flight — 같은 키로 동시에 두 번 부르면 factory 가 1회만 호출되고 두
//               Promise 가 같은 문자열로 resolve 된다. 정착 후 세 번째 호출은 factory 를
//               호출하지 않는다(`peekHueShift` 가 값을 낸다).
//   N6  F11     실패 미캐시 — factory 가 reject 하면 그 키가 맵에 남지 않고 재요청 시
//               factory 가 다시 호출된다.
//
// 모듈 로딩
//   `hueShiftCache.ts` 는 **런타임 import 0건**이므로 `module.stripTypeScriptTypes` 로 타입만
//   지우면 `data:` 모듈로 그대로 평가된다. 스크립트가 그 조건을 먼저 확인하고, 깨져 있으면
//   exit 3 으로 중단한다(판정 전제가 무너진 것을 `OK` 로 덮지 않는다).
//   `ExperimentalWarning` 은 stderr 로만 나가므로 stdout 판정 채널을 오염시키지 않는다.
//
// 판정 순서 주의
//   모듈 상태(맵)는 프로세스 전체에서 공유된다. **N4(축출)를 캐시 최초 사용으로 돌린다** —
//   맵이 빈 상태에서 `LIMIT + 1` 개를 넣어야 "가장 오래된 항목 1개만 사라진다" 를 문면대로
//   판정할 수 있다. N2·N3 은 키 함수만 부르므로 맵을 건드리지 않는다.
//
// 규약
//  - Node 내장 모듈만 쓴다. 파일을 쓰지 않는다. `--help` 는 사용법을 stdout 에 내고 exit 0.
//
// 사용
//   node <this>            # 5건 전부
//   node <this> --help
//
// 종료 코드: 0 통과 / 1 불통과 / 3 소스 구문 전제 붕괴

import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const HELP = `hue-cache-parity.mjs — 색조 캐시(F10)의 계약 판정

사용법
  node <this>        기준 N2·N3·N4·N5·N6 (게이트 G-e) 를 순서대로 판정한다.
  node <this> --help

판정 대상
  packages/ui/src/shared/lib/hueShiftCache.ts  (워킹트리, 런타임 import 0건)

기대 출력
  마지막 줄이  ALL CACHE CHECKS: yes

종료 코드: 0 통과 / 1 불통과 / 3 소스 구문 전제 붕괴
`;

const CACHE_FILE = 'packages/ui/src/shared/lib/hueShiftCache.ts';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}
for (const a of argv) {
  process.stdout.write(`ERROR: 알 수 없는 옵션: ${a}\n`);
  process.exit(3);
}

const out = (s) => process.stdout.write(s + '\n');
let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  out(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail === undefined ? '' : `  — ${detail}`}`);
}

// ── 로딩 ────────────────────────────────────────────────────────────────────
const raw = readFileSync(CACHE_FILE, 'utf8');
const importLines = raw.split('\n').filter((l) => /^\s*import\s/.test(l));
out(`대상: ${CACHE_FILE}`);
out(`  런타임 import 줄 수 = ${importLines.length} (기대 0)`);
if (importLines.length !== 0) {
  out('ERROR: 런타임 import 가 생겼다 — `data:` 모듈 평가 전제가 깨졌다');
  importLines.forEach((l) => out(`  ${l}`));
  process.exit(3);
}
const url =
  'data:text/javascript;base64,' +
  Buffer.from(stripTypeScriptTypes(raw, { mode: 'strip' }), 'utf8').toString('base64');
const mod = await import(url);
for (const name of ['HUE_SHIFT_CACHE_LIMIT', 'hueShiftKey', 'peekHueShift', 'getOrCreateHueShift']) {
  if (mod[name] === undefined) {
    out(`ERROR: export '${name}' 가 없다`);
    process.exit(3);
  }
}
const { HUE_SHIFT_CACHE_LIMIT: LIMIT, hueShiftKey, peekHueShift, getOrCreateHueShift } = mod;
out(`  export 4종 확인 · HUE_SHIFT_CACHE_LIMIT = ${LIMIT}`);
out('');

// ── N2 — DoD 17 키 순수성 ────────────────────────────────────────────────────
out('=== N2 (DoD 17 · G-e) 키 순수성 ===');
const BASE_ARGS = ['/assets/bus.png', 330, 270, undefined, undefined];
const baseKey = hueShiftKey(...BASE_ARGS);
out(`  기준 키: ${baseKey}`);

check('멱등 — 같은 인자로 두 번 호출하면 같은 키', hueShiftKey(...BASE_ARGS) === baseKey);

const oneOff = [
  ['src', ['/assets/car.png', 330, 270, undefined, undefined]],
  ['targetHue', ['/assets/bus.png', 331, 270, undefined, undefined]],
  ['originalHue', ['/assets/bus.png', 330, 271, undefined, undefined]],
  ['strategy', ['/assets/bus.png', 330, 270, 'absolute', undefined]],
  ['preserveSkinTones', ['/assets/bus.png', 330, 270, undefined, false]],
];
for (const [name, args] of oneOff) {
  const k = hueShiftKey(...args);
  check(`${name} 하나만 바꾸면 키가 달라진다`, k !== baseKey, k);
}

const grid = [];
for (const strategy of [undefined, 'absolute', 'relative']) {
  for (const preserveSkinTones of [undefined, false, true]) {
    grid.push(hueShiftKey('/assets/bus.png', 330, 270, strategy, preserveSkinTones));
  }
}
check(
  'strategy 3값 × preserveSkinTones 3값 = 9키가 서로 다르다',
  new Set(grid).size === 9,
  `unique=${new Set(grid).size}/9`,
);
grid.forEach((k) => out(`    ${k}`));
out('');

// ── N3 — DoD 18 Direction 4호출 → 3키 ────────────────────────────────────────
out('=== N3 (DoD 18 · G-e) Direction 4호출 → 고유 키 3개 ===');
const busImg = '/assets/bus-DUMMY.png';
const carImg = '/assets/car-DUMMY.png';
const metroImg = '/assets/metro-DUMMY.png';
// Direction.tsx:52~:55 — 전부 (src, themeHue=330, PURPLE_HUE=270, {strategy:'relative'})
const k52 = hueShiftKey(busImg, 330, 270, 'relative', undefined);
const k53 = hueShiftKey(carImg, 330, 270, 'relative', undefined);
const k54 = hueShiftKey(metroImg, 330, 270, 'relative', undefined);
const k55 = hueShiftKey(busImg, 330, 270, 'relative', undefined);
out(`  :52 ${k52}`);
out(`  :53 ${k53}`);
out(`  :54 ${k54}`);
out(`  :55 ${k55}`);
check(':52 와 :55 가 동일 키다 (완전 중복)', k52 === k55);
check(
  '고유 키가 3개다',
  new Set([k52, k53, k54, k55]).size === 3,
  `unique=${new Set([k52, k53, k54, k55]).size}/3`,
);
check(':52 와 :53 이 다른 키다', k52 !== k53);
check(':53 과 :54 가 다른 키다', k53 !== k54);
out('');

// ── N4 — DoD 21 상한과 축출 (캐시 최초 사용) ─────────────────────────────────
out('=== N4 (DoD 21) 상한과 축출 — 캐시 최초 사용이다 ===');
check('HUE_SHIFT_CACHE_LIMIT 가 export 되어 있다', typeof LIMIT === 'number', `값=${LIMIT}`);

const evictCalls = Object.create(null);
const evictFactory = (i) => () => {
  evictCalls[i] = (evictCalls[i] ?? 0) + 1;
  return Promise.resolve(`value-${i}`);
};
const evictKeys = [];
for (let i = 0; i <= LIMIT; i += 1) {
  const k = hueShiftKey(`/evict/${i}.png`, 330, 270, undefined, undefined);
  evictKeys.push(k);
  // 순서를 확정하기 위해 하나씩 정착시킨다.
  const v = await getOrCreateHueShift(k, evictFactory(i));
  if (v !== `value-${i}`) {
    check(`evict-${i} 정착값`, false, v);
  }
}
out(`  ${LIMIT + 1} 개 키를 순서대로 넣었다 (LIMIT + 1)`);
check(
  '가장 오래된 항목(evict-0)이 사라졌다',
  peekHueShift(evictKeys[0]) === undefined,
  `peek=${String(peekHueShift(evictKeys[0]))}`,
);
check(
  `최신 항목(evict-${LIMIT})이 남아 있다`,
  peekHueShift(evictKeys[LIMIT]) === `value-${LIMIT}`,
  `peek=${String(peekHueShift(evictKeys[LIMIT]))}`,
);
check(
  '두 번째로 오래된 항목(evict-1)은 남아 있다 — 축출은 초과분만이다',
  peekHueShift(evictKeys[1]) === 'value-1',
  `peek=${String(peekHueShift(evictKeys[1]))}`,
);
const callsBefore = evictCalls[0];
const revalue = await getOrCreateHueShift(evictKeys[0], evictFactory(0));
check(
  '축출된 키를 다시 요청하면 factory 가 재호출된다',
  evictCalls[0] === callsBefore + 1,
  `calls ${callsBefore} → ${evictCalls[0]}`,
);
check('재계산 반환값이 이전과 같다', revalue === 'value-0', revalue);
out('');

// ── N5 — single-flight ──────────────────────────────────────────────────────
out('=== N5 (F10) single-flight — 진행 중 계산 공유 ===');
const sfKey = hueShiftKey('/single-flight.png', 330, 270, 'absolute', true);
let sfCalls = 0;
const sfFactory = () => {
  sfCalls += 1;
  return new Promise((resolve) => setTimeout(() => resolve('shared-result'), 20));
};
const p1 = getOrCreateHueShift(sfKey, sfFactory);
const p2 = getOrCreateHueShift(sfKey, sfFactory);
check('진행 중이면 같은 Promise 객체를 돌려준다', p1 === p2);
check('정착 전 peekHueShift 는 undefined 다', peekHueShift(sfKey) === undefined);
const [r1, r2] = await Promise.all([p1, p2]);
check('factory 가 1회만 호출됐다', sfCalls === 1, `calls=${sfCalls}`);
check('두 Promise 가 같은 문자열로 resolve 됐다', r1 === r2 && r1 === 'shared-result', `${r1}/${r2}`);
check('정착 후 peekHueShift 가 값을 낸다', peekHueShift(sfKey) === 'shared-result');
const r3 = await getOrCreateHueShift(sfKey, sfFactory);
check('정착 후 세 번째 호출은 factory 를 부르지 않는다', sfCalls === 1, `calls=${sfCalls}`);
check('세 번째 호출의 반환값이 같다', r3 === 'shared-result');
out('');

// ── N6 — 실패 미캐시 ────────────────────────────────────────────────────────
out('=== N6 (F11) 실패는 캐시하지 않는다 ===');
const failKey = hueShiftKey('/broken.png', 330, 270, undefined, undefined);
let failCalls = 0;
const rejecting = () => {
  failCalls += 1;
  return Promise.reject(new Error('boom'));
};
let rejected = false;
await getOrCreateHueShift(failKey, rejecting).catch(() => {
  rejected = true;
});
check('reject 가 소비자에게 전파된다 (훅이 이것을 잡아 원본 src 로 정착시킨다)', rejected);
check(
  '실패한 키는 맵에 남지 않는다',
  peekHueShift(failKey) === undefined,
  `peek=${String(peekHueShift(failKey))}`,
);
let retryCalls = 0;
const succeeding = () => {
  retryCalls += 1;
  return Promise.resolve('recovered');
};
const recovered = await getOrCreateHueShift(failKey, succeeding);
check('재요청 시 factory 가 다시 호출된다', failCalls === 1 && retryCalls === 1, `reject-factory=${failCalls} retry-factory=${retryCalls}`);
check('재계산 결과가 정착한다', recovered === 'recovered' && peekHueShift(failKey) === 'recovered');
out('');

out(`failures=${failures}`);
out(`ALL CACHE CHECKS: ${failures === 0 ? 'yes' : 'no'}`);
process.exit(failures === 0 ? 0 : 1);
