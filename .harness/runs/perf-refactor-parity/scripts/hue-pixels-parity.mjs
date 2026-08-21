#!/usr/bin/env node
// hue-pixels-parity.mjs — 색조 픽셀 루프 추출의 파리티 판정 (계약 3 기준 N1(G-a) · S2)
//
// 두 가지를 판정한다.
//
//   기본 모드 (기준 N1 / 게이트 G-a)
//     `<BASE>` 훅 본문(43~78)에서 루프만 발췌해 합성한 `oldLoop` 와 워킹트리의
//     `hueShiftPixels` 에 **같은 RGBA 배열**을 넣고 `Buffer.compare(a, b) === 0` 을 확인한다.
//     입력은 랜덤이 아니라 **경계 전수**다(아래 표).
//
//   --diff-only (기준 S2 / P2′-1)
//     `hueShiftPixels.ts` 안의 **이동 구간**과 `<BASE> useImageHueShift.ts:43~78` 을
//     공통 선행 들여쓰기 제거 후 줄 단위로 비교해 **다른 줄 0** 을 확인한다.
//     이동 구간의 기계적 식별 규칙(계약 S2 인용 블록):
//       `export function hueShiftPixels(` 의 **여는 `{` 다음 줄**부터 **파일 마지막 `}` 앞 줄**까지.
//     주석 마커는 쓰지 않는다 — 마커 자체가 P2′-1 비교 대상 밖 문자가 되어 혼동을 만든다.
//
// 모듈 로딩 규약 (계약 §1.2 (†) — 평가자 권고 5)
//   `hueShiftPixels.ts` 를 그냥 `import()` 하면 실패한다. (a) TS 파일이고 (b) `'./colorUtils'`
//   가 확장자 없는 상대 경로라 Node ESM 이 해석하지 못한다(Vite 만 해석한다).
//   이 스크립트는 **자기 재기동 없이** 다음으로 처리한다.
//     1. `colorUtils.ts` 를 `module.stripTypeScriptTypes` 로 지우고 `data:` 모듈로 평가한다
//        (그 파일은 런타임 import 0건이라 그대로 평가된다).
//     2. `hueShiftPixels.ts` 도 타입을 지우고, `'./colorUtils'` 지정자만 1번의 `data:` URL 로
//        바꿔 평가한다. **파일 전체를 평가한다** — 구간 발췌가 아니라 실제 모듈이다.
//     3. `oldLoop` 은 `<BASE>` blob 의 43~78 구간을 같은 `colorUtils` 인스턴스를 받는
//        팩토리로 감싸 평가한다. 구간에 타입 표기가 0건이므로 변환이 필요 없다.
//   즉 **두 구현이 같은 `rgbToHsl`/`hslToRgb` 인스턴스**를 쓴다.
//   `stripTypeScriptTypes` 의 `ExperimentalWarning` 은 stderr 로만 나가므로 stdout 판정
//   채널을 오염시키지 않는다.
//
// 규약
//  - Node 내장 모듈만 쓴다. 파일을 쓰지 않는다. `--help` 는 사용법을 stdout 에 내고 exit 0.
//  - `<BASE>` blob 은 `execFileSync('git', ['cat-file','blob', …])` 로 직접 받고
//    **바이트 수·md5 를 assert 한 뒤** 진행한다(계약 §0.1(라) · `C-9`). 어긋나면 exit 2.
//  - 합성한 `oldLoop` 소스를 stdout 에 **그대로 출력**한다(평가자가 합성 방식을 눈으로 검증).
//
// 사용
//   node <this>                 # 기준 N1 (G-a) — 경계 전수 바이트 동등성
//   node <this> --diff-only     # 기준 S2 — 이동 구간 문자 동일성
//   node <this> --quiet         # 케이스별 SHA 행을 생략하고 요약만
//   node <this> --rev=65b3a5f   # <BASE> rev 지정 (기본 65b3a5f)
//   node <this> --help
//
// 종료 코드: 0 통과 / 1 불통과 / 2 입력 문제(blob assert 실패 등) / 3 소스 구문 전제 붕괴

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const HELP = `hue-pixels-parity.mjs — 색조 픽셀 루프 추출의 파리티 판정

사용법
  node <this>                기준 N1 (게이트 G-a) — 경계 전수 입력에서 구/신 구현의
                             출력 버퍼가 Buffer.compare === 0 인지 판정한다.
  node <this> --diff-only    기준 S2 (P2′-1) — 이동 구간과 <BASE> 43~78 의 문자 동일성.
  node <this> --quiet        케이스별 SHA-256 행을 생략한다.
  node <this> --rev=<rev>    <BASE> rev (기본 65b3a5f).
  node <this> --help

판정 대상
  <BASE>  packages/ui/src/shared/hooks/useImageHueShift.ts  :43~78  (bytes=2674)
  HEAD    packages/ui/src/shared/lib/hueShiftPixels.ts       (워킹트리)

기대 출력
  기본 모드     마지막 줄이  ALL BYTE-IDENTICAL: yes
  --diff-only   마지막 줄이  REGION DIFF LINES: 0

종료 코드: 0 통과 / 1 불통과 / 2 입력 문제 / 3 소스 구문 전제 붕괴
`;

const BASE_HOOK = 'packages/ui/src/shared/hooks/useImageHueShift.ts';
const BASE_HOOK_BYTES = 2674;
const BASE_HOOK_MD5 = '6b2f62c99667b35ce01472b8bc861af2';
const REGION_FROM = 43; // 1-indexed, 포함
const REGION_TO = 78; // 1-indexed, 포함
const NEW_PIXELS = 'packages/ui/src/shared/lib/hueShiftPixels.ts';
const COLOR_UTILS = 'packages/ui/src/shared/lib/colorUtils.ts';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}
const diffOnly = argv.includes('--diff-only');
const quiet = argv.includes('--quiet');
let rev = '65b3a5f';
for (const a of argv) {
  if (a === '--diff-only' || a === '--quiet') continue;
  if (a.startsWith('--rev=')) {
    rev = a.slice('--rev='.length);
    continue;
  }
  process.stdout.write(`ERROR: 알 수 없는 옵션: ${a}\n`);
  process.exit(2);
}

const out = (s) => process.stdout.write(s + '\n');

/** `<BASE>` blob 을 셸을 경유하지 않고 직접 받고 크기·md5 를 assert 한다(`C-9` · 규약 라). */
function baseBlob() {
  let buf;
  try {
    buf = execFileSync('/usr/bin/git', ['cat-file', 'blob', `${rev}:${BASE_HOOK}`], {
      encoding: 'buffer',
    });
  } catch (e) {
    out(`ERROR: git cat-file 실패 — ${e.message}`);
    process.exit(2);
  }
  const md5 = createHash('md5').update(buf).digest('hex');
  out(`<BASE> ${rev}:${BASE_HOOK}`);
  out(`  blob bytes=${buf.length} md5=${md5}`);
  if (buf.length !== BASE_HOOK_BYTES || md5 !== BASE_HOOK_MD5) {
    out(`  ASSERT FAILED — 기대 bytes=${BASE_HOOK_BYTES} md5=${BASE_HOOK_MD5}`);
    process.exit(2);
  }
  out(`  assert 통과 (bytes=${BASE_HOOK_BYTES} md5=${BASE_HOOK_MD5})`);
  return buf.toString('utf8');
}

/** 공통 선행 들여쓰기(빈 줄 제외 최소 공백 수). */
function commonIndent(lines) {
  const widths = lines.filter((l) => l.trim() !== '').map((l) => l.match(/^ */)[0].length);
  return widths.length === 0 ? 0 : Math.min(...widths);
}

function dedent(lines, n) {
  return lines.map((l) => (l.length >= n && l.slice(0, n).trim() === '' ? l.slice(n) : l));
}

/** `<BASE>` 훅의 43~78 구간(36줄). */
function baseRegion(src) {
  const lines = src.split('\n');
  const region = lines.slice(REGION_FROM - 1, REGION_TO);
  if (region.length !== REGION_TO - REGION_FROM + 1) {
    out(`ERROR: <BASE> 구간 길이가 ${region.length} 이다 (기대 36)`);
    process.exit(3);
  }
  return region;
}

/**
 * 신규 파일의 이동 구간.
 * `export function hueShiftPixels(` 의 여는 `{` 다음 줄 ~ 파일 마지막 `}` 앞 줄.
 */
function newRegion(src) {
  const lines = src.split('\n');
  const decl = lines.findIndex((l) => l.includes('export function hueShiftPixels('));
  if (decl < 0) {
    out('ERROR: `export function hueShiftPixels(` 를 찾지 못했다');
    process.exit(3);
  }
  let brace = -1;
  for (let i = decl; i < lines.length; i += 1) {
    if (lines[i].trimEnd().endsWith('{')) {
      brace = i;
      break;
    }
  }
  if (brace < 0) {
    out('ERROR: 함수 여는 `{` 를 찾지 못했다');
    process.exit(3);
  }
  let close = -1;
  for (let i = lines.length - 1; i > brace; i -= 1) {
    if (lines[i] === '}') {
      close = i;
      break;
    }
  }
  if (close < 0) {
    out('ERROR: 파일 마지막 `}` 를 찾지 못했다');
    process.exit(3);
  }
  return {
    region: lines.slice(brace + 1, close),
    braceLine: brace + 1,
    closeLine: close + 1,
  };
}

// ─────────────────────────── --diff-only (기준 S2) ───────────────────────────

if (diffOnly) {
  out('=== 기준 S2 / P2′-1 — 이동 구간 문자 동일성 ===');
  const baseSrc = baseBlob();
  const bRegion = baseRegion(baseSrc);
  const newSrc = readFileSync(NEW_PIXELS, 'utf8');
  const { region: nRegion, braceLine, closeLine } = newRegion(newSrc);

  const bIndent = commonIndent(bRegion);
  const nIndent = commonIndent(nRegion);
  out('');
  out(`<BASE> region  lines=${bRegion.length} (${REGION_FROM}~${REGION_TO}) commonIndent=${bIndent}`);
  out(
    `HEAD   region  lines=${nRegion.length} (${braceLine + 1}~${closeLine - 1}) commonIndent=${nIndent}   file=${NEW_PIXELS}`,
  );
  out(`dedent 폭 차이 = ${bIndent - nIndent} 칸`);
  const bEmpty = bRegion.filter((l) => l.trim() === '');
  out(
    `<BASE> region 빈 줄 ${bEmpty.length}개, 후행 공백 있는 빈 줄 ${bEmpty.filter((l) => l !== '').length}개 → 들여쓰기 제거가 애매하지 않다`,
  );

  const bDed = dedent(bRegion, bIndent);
  const nDed = dedent(nRegion, nIndent);

  out('');
  out(`--- <BASE> ${BASE_HOOK}:${REGION_FROM}~${REGION_TO} (dedent ${bIndent}) ---`);
  bDed.forEach((l) => out(l));
  out(`--- HEAD ${NEW_PIXELS}:${braceLine + 1}~${closeLine - 1} (dedent ${nIndent}) ---`);
  nDed.forEach((l) => out(l));
  out('--- end ---');
  out('');

  let diffLines = 0;
  const maxLen = Math.max(bDed.length, nDed.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (bDed[i] !== nDed[i]) {
      diffLines += 1;
      out(`DIFF @${i + 1}`);
      out(`  <BASE> ${JSON.stringify(bDed[i] ?? null)}`);
      out(`  HEAD   ${JSON.stringify(nDed[i] ?? null)}`);
    }
  }
  const bHash = createHash('sha256').update(bDed.join('\n')).digest('hex').slice(0, 16);
  const nHash = createHash('sha256').update(nDed.join('\n')).digest('hex').slice(0, 16);
  out(`dedented sha256[0:16]  <BASE>=${bHash}  HEAD=${nHash}  equal=${bHash === nHash}`);
  out(`REGION LINE COUNT: <BASE>=${bDed.length} HEAD=${nDed.length}`);
  out(`REGION DIFF LINES: ${diffLines}`);
  process.exit(diffLines === 0 ? 0 : 1);
}

// ─────────────────────────── 기본 모드 (기준 N1 / G-a) ───────────────────────────

out('=== 기준 N1 / 게이트 G-a — 경계 전수 입력 바이트 동등성 ===');
const baseSrc = baseBlob();
const region = baseRegion(baseSrc);

function toDataUrl(code) {
  return 'data:text/javascript;base64,' + Buffer.from(code, 'utf8').toString('base64');
}

// 1. colorUtils — 런타임 import 0건이므로 타입만 지우면 그대로 평가된다.
const colorUtilsRaw = readFileSync(COLOR_UTILS, 'utf8');
if (/^\s*import\s/m.test(colorUtilsRaw)) {
  out('ERROR: colorUtils.ts 에 런타임 import 가 생겼다 — 로딩 전제가 깨졌다');
  process.exit(3);
}
const colorUrl = toDataUrl(stripTypeScriptTypes(colorUtilsRaw, { mode: 'strip' }));
const colorMod = await import(colorUrl);
if (typeof colorMod.rgbToHsl !== 'function' || typeof colorMod.hslToRgb !== 'function') {
  out('ERROR: colorUtils 에서 rgbToHsl/hslToRgb 를 얻지 못했다');
  process.exit(3);
}
out('');
out(`colorUtils 로딩: ${COLOR_UTILS} → 타입 제거 후 data: 모듈 (런타임 import 0건 확인)`);

// 2. 신규 hueShiftPixels — 파일 전체를 평가한다. `'./colorUtils'` 지정자만 위 data: URL 로 바꾼다.
const newRaw = readFileSync(NEW_PIXELS, 'utf8');
const specifierHits = newRaw.match(/'\.\/colorUtils'/g);
if (!specifierHits || specifierHits.length !== 1) {
  out(`ERROR: '${NEW_PIXELS}' 의 './colorUtils' 지정자가 1건이 아니다 (${specifierHits ? specifierHits.length : 0})`);
  process.exit(3);
}
const newUrl = toDataUrl(
  stripTypeScriptTypes(newRaw.replace("'./colorUtils'", JSON.stringify(colorUrl)), {
    mode: 'strip',
  }),
);
const newMod = await import(newUrl);
if (typeof newMod.hueShiftPixels !== 'function') {
  out('ERROR: hueShiftPixels export 를 얻지 못했다');
  process.exit(3);
}
out(`신규 구현 로딩: ${NEW_PIXELS} 전문 → 타입 제거 + './colorUtils' → 위 data: URL`);

// 3. 구 루프 — <BASE> 구간을 같은 colorUtils 인스턴스를 받는 팩토리로 감싼다.
const OLD_SOURCE =
  `import { rgbToHsl, hslToRgb } from ${JSON.stringify(colorUrl)};\n` +
  `// <BASE> ${rev}:${BASE_HOOK} 의 ${REGION_FROM}~${REGION_TO} 을 한 글자도 고치지 않고 감쌌다.\n` +
  `export function oldLoop(data, targetHue, originalHue, options) {\n` +
  region.join('\n') +
  `\n}\n`;
const oldMod = await import(toDataUrl(OLD_SOURCE));
const oldLoop = oldMod.oldLoop;
const hueShiftPixels = newMod.hueShiftPixels;

out('');
out(`--- 합성한 oldLoop 소스 (data: 모듈로 그대로 평가된다) ---`);
// colorUtils data: URL 은 base64 수천 자라 한 줄을 요약해 싣는다. 나머지는 원문이다.
OLD_SOURCE.split('\n').forEach((l) => {
  if (l.startsWith('import { rgbToHsl, hslToRgb } from "data:')) {
    out(
      `import { rgbToHsl, hslToRgb } from "<colorUtils data: URL, base64 ${colorUrl.length} 자>";`,
    );
  } else {
    out(l);
  }
});
out('--- end ---');

// ── 경계 전수 입력 ──────────────────────────────────────────────────────────
// 픽셀 120개 = a{0,9,10,11,255} × h{9,10,50,51} × s{0,100} × l{0,50,100}
//   a 는 투명 스킵 경계(`a < 10`), h 는 피부색 경계(`h >= 10 && h <= 50`),
//   s=0 은 무채색(rgbToHsl 이 h=0 을 낸다), l=0/100 은 검정·흰색 극단이다.
const A_VALUES = [0, 9, 10, 11, 255];
const H_VALUES = [9, 10, 50, 51];
const S_VALUES = [0, 100];
const L_VALUES = [0, 50, 100];

const pixels = [];
for (const a of A_VALUES) {
  for (const h of H_VALUES) {
    for (const s of S_VALUES) {
      for (const l of L_VALUES) {
        const [r, g, b] = colorMod.hslToRgb(h, s, l);
        pixels.push([r, g, b, a]);
      }
    }
  }
}
const baseBytes = new Uint8ClampedArray(pixels.length * 4);
pixels.forEach(([r, g, b, a], i) => {
  baseBytes[i * 4] = r;
  baseBytes[i * 4 + 1] = g;
  baseBytes[i * 4 + 2] = b;
  baseBytes[i * 4 + 3] = a;
});

// 케이스 63 = (targetHue, originalHue) 7쌍 × strategy 3값 × preserveSkinTones 3값
// hueDiff 가 음수 · 양수 · 360 넘김 · 0 을 모두 덮는다.
const HUE_PAIRS = [
  [270, 330], // -60
  [330, 270], // +60
  [10, 350], // -340
  [350, 10], // +340
  [30, 300], // -270
  [360, 0], // +360
  [270, 270], // 0
];
const STRATEGIES = [undefined, 'absolute', 'relative'];
const PRESERVE = [undefined, false, true];

out('');
out('--- 경계 전수 입력 ---');
out(`픽셀 ${pixels.length}개 = a{${A_VALUES}} × h{${H_VALUES}} × s{${S_VALUES}} × l{${L_VALUES}}`);
out(
  `케이스 ${HUE_PAIRS.length * STRATEGIES.length * PRESERVE.length} = (targetHue,originalHue) ${HUE_PAIRS.length}쌍(hueDiff ${HUE_PAIRS.map(([t, o]) => t - o).join('/')}) × strategy ${STRATEGIES.length}값 × preserveSkinTones ${PRESERVE.length}값`,
);
out('');

const sha = (u8) => createHash('sha256').update(Buffer.from(u8.buffer, 0, u8.length)).digest('hex');

let cases = 0;
let mismatches = 0;
for (const [targetHue, originalHue] of HUE_PAIRS) {
  for (const strategy of STRATEGIES) {
    for (const preserveSkinTones of PRESERVE) {
      const options = { strategy, preserveSkinTones };
      const oldData = new Uint8ClampedArray(baseBytes);
      const newData = new Uint8ClampedArray(baseBytes);
      oldLoop(oldData, targetHue, originalHue, options);
      hueShiftPixels(newData, targetHue, originalHue, options);
      const oldBuf = Buffer.from(oldData.buffer, 0, oldData.length);
      const newBuf = Buffer.from(newData.buffer, 0, newData.length);
      const same = Buffer.compare(oldBuf, newBuf) === 0;
      cases += 1;
      if (!same) mismatches += 1;
      if (!quiet || !same) {
        out(
          `case ${String(cases).padStart(2, '0')}  t=${targetHue} o=${originalHue} diff=${targetHue - originalHue} strategy=${String(strategy)} preserve=${String(preserveSkinTones)}  sha=${sha(oldData).slice(0, 16)}  compare=${same ? 0 : 'NONZERO'}`,
        );
      }
    }
  }
}

out('');
out(`cases=${cases} pixels=${pixels.length}`);
out(`mismatches=${mismatches}`);
out(`ALL BYTE-IDENTICAL: ${mismatches === 0 ? 'yes' : 'no'}`);
process.exit(mismatches === 0 ? 0 : 1);
