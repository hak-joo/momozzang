#!/usr/bin/env node
// intro-webp-encode.mjs — intro APNG 을 무손실 애니메이션 WebP 로 재생성한다(1회성 자산 생성).
//
// 이 스크립트만 예외적으로 **저장소 밖 의존성(sharp)** 을 쓴다. 자산 생성은 1회성이므로
// sharp 를 저장소 devDependency 로 추가하지 않는다 — 스크래치패드에 따로 설치해서 쓴다.
//
//   mkdir -p /tmp/introwebp && cd /tmp/introwebp
//   echo '{"name":"introwebp","private":true}' > package.json && pnpm add sharp@0.35.1
//   cd <repo> && NODE_PATH=/tmp/introwebp/node_modules \
//     node .harness/runs/perf-refactor-parity/scripts/intro-webp-encode.mjs \
//       <입력.png> <출력.webp>
//
// 하는 일:
//   1) APNG 을 전 프레임 합성한다 (intro-webp-parity.mjs 의 decodeApng 재사용, Node 내장만).
//   2) 연속 동일 프레임을 병합하고 지속시간을 앞 프레임에 더한다 (51 -> 32, 총 5100ms 불변).
//   3) 세로로 이어 붙인 raw RGB 스트립을 sharp 의 raw.pageHeight 로 먹여 무손실 WebP 를 굽는다.
//   4) **구운 결과를 다시 디코딩해 원본 픽셀과 바이트 단위로 대조한다.**
//      maxdelta 가 0 이 아니면 파일을 쓰지 않고 중단한다(exit 1).
//
// 판정 채널은 stdout. 출력 파일은 4)를 통과했을 때만 쓴다.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { decodeApng } from './intro-webp-parity.mjs';

const USAGE = `intro-webp-encode.mjs — APNG -> 무손실 애니메이션 WebP (sharp 필요)

usage:
  NODE_PATH=<sharp가_설치된>/node_modules node intro-webp-encode.mjs <입력.png> <출력.webp>
  node intro-webp-encode.mjs --help
`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || argv.length < 2) {
  process.stdout.write(USAGE);
  process.exit(argv.length < 2 ? 2 : 0);
}
const [SRC, OUT] = argv;

let sharp;
try {
  sharp = createRequire(import.meta.url)('sharp');
} catch {
  process.stdout.write('FATAL sharp 를 찾을 수 없다. NODE_PATH 로 설치 위치를 넘겨라 (--help 참조)\n');
  process.exit(2);
}

const srcBuf = readFileSync(SRC);
const { W, H, numPlays, timeline } = decodeApng(srcBuf);

// decodeApng 은 합성 프레임의 sha256 타임라인만 돌려준다 — 그것으로 "어느 프레임이
// 병합 대상인가"를 정하고, 인코딩에 넣을 픽셀은 아래에서 같은 규칙으로 다시 합성한다.
const { inflateSync } = await import('node:zlib');
const BPP = 3;
const chunks = [];
{
  let o = 8;
  while (o + 8 <= srcBuf.length) {
    const len = srcBuf.readUInt32BE(o);
    chunks.push({ type: srcBuf.toString('latin1', o + 4, o + 8), data: srcBuf.subarray(o + 8, o + 8 + len) });
    o += 12 + len;
  }
}
const rawFrames = [];
for (const { type, data } of chunks) {
  if (type === 'fcTL') {
    rawFrames.push({
      w: data.readUInt32BE(4), h: data.readUInt32BE(8),
      x: data.readUInt32BE(12), y: data.readUInt32BE(16),
      dop: data[24], parts: [],
    });
  } else if (type === 'IDAT') rawFrames[0].parts.push(data);
  else if (type === 'fdAT') rawFrames[rawFrames.length - 1].parts.push(data.subarray(4));
}
// PNG unfilter — parity 스크립트와 동일한 규칙
function unfilter(raw, w, h) {
  const stride = w * BPP;
  const out = Buffer.alloc(stride * h);
  let pos = 0;
  for (let r = 0; r < h; r++) {
    const f = raw[pos++];
    const line = out.subarray(r * stride, (r + 1) * stride);
    raw.copy(line, 0, pos, pos + stride);
    pos += stride;
    const prev = r === 0 ? null : out.subarray((r - 1) * stride, r * stride);
    if (f === 0) continue;
    for (let c = 0; c < stride; c++) {
      const a = c >= BPP ? line[c - BPP] : 0;
      const b = prev ? prev[c] : 0;
      const cc = prev && c >= BPP ? prev[c - BPP] : 0;
      if (f === 1) line[c] = (line[c] + a) & 255;
      else if (f === 2) line[c] = (line[c] + b) & 255;
      else if (f === 3) line[c] = (line[c] + ((a + b) >> 1)) & 255;
      else {
        const p = a + b - cc;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - cc);
        line[c] = (line[c] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : cc)) & 255;
      }
    }
  }
  return out;
}
const canvas = Buffer.alloc(W * H * BPP);
const composited = [];
for (const f of rawFrames) {
  let saved = null;
  if (f.dop === 2) {
    saved = Buffer.alloc(f.w * f.h * BPP);
    for (let r = 0; r < f.h; r++) canvas.copy(saved, r * f.w * BPP, ((f.y + r) * W + f.x) * BPP, ((f.y + r) * W + f.x + f.w) * BPP);
  }
  const px = unfilter(inflateSync(Buffer.concat(f.parts)), f.w, f.h);
  for (let r = 0; r < f.h; r++) px.copy(canvas, ((f.y + r) * W + f.x) * BPP, r * f.w * BPP, (r + 1) * f.w * BPP);
  composited.push(Buffer.from(canvas));
  if (f.dop === 1) for (let r = 0; r < f.h; r++) canvas.fill(0, ((f.y + r) * W + f.x) * BPP, ((f.y + r) * W + f.x + f.w) * BPP);
  else if (f.dop === 2) for (let r = 0; r < f.h; r++) saved.copy(canvas, ((f.y + r) * W + f.x) * BPP, r * f.w * BPP, (r + 1) * f.w * BPP);
}

// 연속 동일 프레임 병합 (해시 타임라인 기준)
const frames = [], delays = [];
timeline.forEach((t, i) => {
  if (frames.length && timeline[i - 1].hash === t.hash) delays[delays.length - 1] += t.delay;
  else { frames.push(composited[i]); delays.push(t.delay); }
});
process.stdout.write(`frames ${timeline.length} -> ${frames.length}, total ${delays.reduce((a, b) => a + b, 0)}ms, loop=${numPlays}\n`);

const strip = Buffer.concat(frames);
const input = { raw: { width: W, height: H * frames.length, channels: BPP, pageHeight: H } };
const webp = await sharp(strip, input).webp({ lossless: true, effort: 6, loop: numPlays, delay: delays }).toBuffer();

// 왕복 검증 — 구운 WebP 를 다시 디코딩해 픽셀을 대조한다
const back = await sharp(webp, { animated: true }).raw().toBuffer();
const outCh = back.length / (W * H * frames.length);
let maxDelta = 0;
for (let p = 0; p < W * H * frames.length; p++) {
  for (let c = 0; c < 3; c++) {
    const d = Math.abs(back[p * outCh + c] - strip[p * 3 + c]);
    if (d > maxDelta) maxDelta = d;
  }
}
const meta = await sharp(webp, { animated: true }).metadata();
process.stdout.write(`encoded bytes=${webp.length} pages=${meta.pages} loop=${meta.loop} delaySum=${(meta.delay ?? []).reduce((a, b) => a + b, 0)}\n`);
process.stdout.write(`roundtrip maxdelta=${maxDelta}\n`);
if (maxDelta !== 0) {
  process.stdout.write('FAIL 무손실이 아니다 — 파일을 쓰지 않는다\n');
  process.exit(1);
}
writeFileSync(OUT, webp);
process.stdout.write(`wrote ${OUT} (${srcBuf.length} -> ${webp.length} bytes)\nLOSSLESS: yes\n`);
