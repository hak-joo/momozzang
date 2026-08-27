#!/usr/bin/env node
// intro-webp-parity.mjs — intro 애니메이션을 APNG → 애니메이션 WebP 로 교체한 변경의
//   "타임라인·캔버스·무손실" 파리티를 브라우저 없이 판정한다.
//
// 변경 전(APNG)은 git blob 에서 직접 받아 zlib 로 전 프레임을 합성하고,
// 변경 후(WebP)는 RIFF 컨테이너를 파싱한다. 둘의 다음 4가지가 같아야 통과다.
//   1) 캔버스 크기          374x812
//   2) 유효 프레임 타임라인  (연속 동일 프레임 병합 후의 프레임 수 + 프레임별 지속시간 ms)
//   3) 반복 횟수            0(무한)
//   4) 무손실               WebP 프레임이 전부 VP8L(무손실) 이어야 한다
//
// 픽셀 동일성은 이 스크립트가 판정하지 않는다 — VP8L 디코더가 Node 내장에 없다.
// 픽셀 동일성은 생성 시점에 `intro-webp-encode.mjs` 가 sharp 로 왕복 디코딩해
// maxdelta=0 을 확인하는 방식으로 보증한다(README 참조).
//
// 판정 채널은 stdout. 파일을 쓰지 않는다. Node 내장 모듈만 사용한다.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const USAGE = `intro-webp-parity.mjs — APNG(변경 전) ↔ 애니메이션 WebP(변경 후) 타임라인 파리티

usage:
  node intro-webp-parity.mjs [<webp경로>] [<변경전rev>] [<APNG경로>]
  node intro-webp-parity.mjs --help

기본값:
  webp경로   packages/ui/src/shared/assets/images/intro.webp
  변경전rev  207e259   (묶음 3 마지막 커밋 = intro.png 가 아직 살아 있는 리비전)
  APNG경로   packages/ui/src/shared/assets/images/intro.png  (해당 rev 의 blob)

출력: APNG 프레임 표 / 병합 타임라인 / WebP 프레임 표 / 4항목 판정
종료 코드: 0 전 항목 일치 / 1 불일치 / 2 인자·입력 오류
`;

const IS_MAIN = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
const argv = IS_MAIN ? process.argv.slice(2) : [];
if (IS_MAIN && argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const WEBP_PATH = argv[0] ?? 'packages/ui/src/shared/assets/images/intro.webp';
const BEFORE_REV = argv[1] ?? '207e259';
const APNG_PATH = argv[2] ?? 'packages/ui/src/shared/assets/images/intro.png';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ── 변경 전 blob 추출 (C-9: 셸 경유 git 출력은 간헐적으로 오염된다) ────────────
function gitBlob(rev, path) {
  const buf = execFileSync('git', ['cat-file', 'blob', `${rev}:${path}`], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  const size = Number(
    execFileSync('git', ['cat-file', '-s', `${rev}:${path}`], { encoding: 'utf8' }).trim(),
  );
  if (buf.length !== size) {
    process.stdout.write(`FATAL blob 크기 불일치: read=${buf.length} expected=${size}\n`);
    process.exit(2);
  }
  process.stdout.write(`blob ${rev}:${path} bytes=${buf.length} sha256=${sha256(buf)}\n`);
  return buf;
}

// ── APNG 파싱·합성 ────────────────────────────────────────────────────────────
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readChunks(buf) {
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) {
    process.stdout.write('FATAL PNG 시그니처 아님\n');
    process.exit(2);
  }
  const chunks = [];
  let o = 8;
  while (o + 8 <= buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString('latin1', o + 4, o + 8);
    chunks.push({ type, data: buf.subarray(o + 8, o + 8 + len) });
    o += 12 + len;
  }
  return chunks;
}

function unfilter(raw, w, h, bpp) {
  const stride = w * bpp;
  const out = Buffer.alloc(stride * h);
  let pos = 0;
  for (let r = 0; r < h; r++) {
    const f = raw[pos++];
    const line = out.subarray(r * stride, (r + 1) * stride);
    raw.copy(line, 0, pos, pos + stride);
    pos += stride;
    const prev = r === 0 ? null : out.subarray((r - 1) * stride, r * stride);
    for (let c = 0; c < stride; c++) {
      const a = c >= bpp ? line[c - bpp] : 0;
      const b = prev ? prev[c] : 0;
      const cc = prev && c >= bpp ? prev[c - bpp] : 0;
      if (f === 0) break;
      else if (f === 1) line[c] = (line[c] + a) & 255;
      else if (f === 2) line[c] = (line[c] + b) & 255;
      else if (f === 3) line[c] = (line[c] + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - cc;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - cc);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : cc;
        line[c] = (line[c] + pr) & 255;
      } else {
        process.stdout.write(`FATAL 알 수 없는 PNG 필터 ${f}\n`);
        process.exit(2);
      }
    }
  }
  return out;
}

export function decodeApng(buf) {
  const chunks = readChunks(buf);
  const ihdr = chunks.find((c) => c.type === 'IHDR').data;
  const W = ihdr.readUInt32BE(0);
  const H = ihdr.readUInt32BE(4);
  const depth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (depth !== 8 || colorType !== 2 || interlace !== 0) {
    process.stdout.write(`FATAL 지원하지 않는 PNG 형식 depth=${depth} ct=${colorType} il=${interlace}\n`);
    process.exit(2);
  }
  const BPP = 3;
  const actl = chunks.find((c) => c.type === 'acTL');
  if (!actl) {
    process.stdout.write('FATAL acTL 없음 — APNG 가 아니다\n');
    process.exit(2);
  }
  const numFrames = actl.data.readUInt32BE(0);
  const numPlays = actl.data.readUInt32BE(4);

  const frames = [];
  for (const { type, data } of chunks) {
    if (type === 'fcTL') {
      frames.push({
        w: data.readUInt32BE(4),
        h: data.readUInt32BE(8),
        x: data.readUInt32BE(12),
        y: data.readUInt32BE(16),
        num: data.readUInt16BE(20),
        den: data.readUInt16BE(22) || 100,
        dop: data[24],
        bop: data[25],
        parts: [],
      });
    } else if (type === 'IDAT') {
      frames[0].parts.push(data); // 첫 fcTL 이 IDAT 앞이므로 IDAT 이 프레임 0 이다
    } else if (type === 'fdAT') {
      frames[frames.length - 1].parts.push(data.subarray(4));
    }
  }
  if (frames.length !== numFrames) {
    process.stdout.write(`FATAL fcTL 수(${frames.length}) != acTL num_frames(${numFrames})\n`);
    process.exit(1);
  }

  const canvas = Buffer.alloc(W * H * BPP);
  const timeline = [];
  for (const f of frames) {
    if (f.bop !== 0) {
      process.stdout.write('FATAL blend OVER 는 RGB(알파 없음) 스트림에서 지원하지 않는다\n');
      process.exit(2);
    }
    let saved = null;
    if (f.dop === 2) {
      saved = Buffer.alloc(f.w * f.h * BPP);
      for (let r = 0; r < f.h; r++) {
        canvas.copy(saved, r * f.w * BPP, ((f.y + r) * W + f.x) * BPP, ((f.y + r) * W + f.x + f.w) * BPP);
      }
    }
    const px = unfilter(inflateSync(Buffer.concat(f.parts)), f.w, f.h, BPP);
    for (let r = 0; r < f.h; r++) {
      px.copy(canvas, ((f.y + r) * W + f.x) * BPP, r * f.w * BPP, (r + 1) * f.w * BPP);
    }
    timeline.push({
      rect: `${f.w}x${f.h}+${f.x}+${f.y}`,
      dop: f.dop,
      delay: Math.round((f.num * 1000) / f.den),
      hash: sha256(canvas),
    });
    if (f.dop === 1) {
      for (let r = 0; r < f.h; r++) canvas.fill(0, ((f.y + r) * W + f.x) * BPP, ((f.y + r) * W + f.x + f.w) * BPP);
    } else if (f.dop === 2) {
      for (let r = 0; r < f.h; r++) {
        saved.copy(canvas, ((f.y + r) * W + f.x) * BPP, r * f.w * BPP, (r + 1) * f.w * BPP);
      }
    }
  }
  return { W, H, numPlays, timeline };
}

// ── WebP(RIFF) 파싱 ───────────────────────────────────────────────────────────
export function decodeWebp(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') {
    process.stdout.write('FATAL RIFF/WEBP 컨테이너 아님\n');
    process.exit(2);
  }
  const riffSize = buf.readUInt32LE(4);
  if (riffSize + 8 !== buf.length) {
    process.stdout.write(`FATAL RIFF 크기 불일치 declared=${riffSize + 8} actual=${buf.length}\n`);
    process.exit(2);
  }
  const u24 = (p, o) => p[o] | (p[o + 1] << 8) | (p[o + 2] << 16);
  let W = 0, H = 0, loop = null;
  const frames = [];
  let o = 12;
  while (o + 8 <= buf.length) {
    const type = buf.toString('latin1', o, o + 4);
    const len = buf.readUInt32LE(o + 4);
    const p = buf.subarray(o + 8, o + 8 + len);
    if (type === 'VP8X') {
      W = 1 + u24(p, 4);
      H = 1 + u24(p, 7);
    } else if (type === 'ANIM') {
      loop = p.readUInt16LE(4);
    } else if (type === 'ANMF') {
      frames.push({
        rect: `${1 + u24(p, 6)}x${1 + u24(p, 9)}+${u24(p, 0) * 2}+${u24(p, 3) * 2}`,
        delay: u24(p, 12),
        sub: p.toString('latin1', 16, 20),
      });
    }
    o += 8 + len + (len & 1);
  }
  return { W, H, loop, frames };
}

// ── 실행 ──────────────────────────────────────────────────────────────────────
// 모듈로 import 하면 decodeApng/decodeWebp 만 노출하고 판정은 돌지 않는다
// (intro-webp-encode.mjs 가 합성 로직을 재사용한다).
if (!IS_MAIN) { /* module use */ } else await main();

async function main() {
const apngBuf = gitBlob(BEFORE_REV, APNG_PATH);
const webpBuf = readFileSync(WEBP_PATH);
process.stdout.write(`file ${WEBP_PATH} bytes=${webpBuf.length} sha256=${sha256(webpBuf)}\n\n`);

const apng = decodeApng(apngBuf);
const webp = decodeWebp(webpBuf);

process.stdout.write(`APNG  canvas=${apng.W}x${apng.H} frames=${apng.timeline.length} loop=${apng.numPlays}\n`);
for (const [i, f] of apng.timeline.entries()) {
  process.stdout.write(`  #${String(i).padStart(2)} ${f.rect.padEnd(16)} dop=${f.dop} ${String(f.delay).padStart(4)}ms ${f.hash.slice(0, 12)}\n`);
}

// 연속 동일 합성 프레임 병합 = 사람이 실제로 보는 타임라인
const merged = [];
for (const f of apng.timeline) {
  if (merged.length && merged[merged.length - 1].hash === f.hash) merged[merged.length - 1].delay += f.delay;
  else merged.push({ hash: f.hash, delay: f.delay });
}
process.stdout.write(`\nMERGED frames=${merged.length} totalMs=${merged.reduce((a, b) => a + b.delay, 0)}\n`);
process.stdout.write(`  delays=[${merged.map((f) => f.delay).join(',')}]\n`);

process.stdout.write(`\nWEBP  canvas=${webp.W}x${webp.H} frames=${webp.frames.length} loop=${webp.loop}\n`);
for (const [i, f] of webp.frames.entries()) {
  process.stdout.write(`  #${String(i).padStart(2)} ${f.rect.padEnd(16)} ${f.sub} ${String(f.delay).padStart(4)}ms\n`);
}
process.stdout.write(`  delays=[${webp.frames.map((f) => f.delay).join(',')}]\n`);

const lossy = webp.frames.filter((f) => f.sub !== 'VP8L').map((_, i) => i);
const checks = [
  ['canvas', `${apng.W}x${apng.H}`, `${webp.W}x${webp.H}`],
  ['frame_count', String(merged.length), String(webp.frames.length)],
  ['delays', merged.map((f) => f.delay).join(','), webp.frames.map((f) => f.delay).join(',')],
  ['loop', String(apng.numPlays), String(webp.loop)],
  ['lossless', 'all VP8L', lossy.length === 0 ? 'all VP8L' : `VP8(lossy) frames ${lossy.join(',')}`],
];

process.stdout.write('\n판정\n');
let ok = true;
for (const [name, before, after] of checks) {
  const pass = before === after;
  if (!pass) ok = false;
  process.stdout.write(`  ${pass ? 'OK  ' : 'FAIL'} ${name.padEnd(12)} before=${before} after=${after}\n`);
}
process.stdout.write(`\nbytes ${apngBuf.length} -> ${webpBuf.length} (${(((webpBuf.length - apngBuf.length) / apngBuf.length) * 100).toFixed(1)}%)\n`);
process.stdout.write(`PARITY: ${ok ? 'yes' : 'no'}\n`);
process.exit(ok ? 0 : 1);
}
