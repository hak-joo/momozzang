#!/usr/bin/env node
// ico-inspect.mjs — ICO 컨테이너를 Node 내장 모듈만으로 파싱해 프레임 표/AND마스크-알파 대조를 출력한다.
// 사용법:
//   node ico-inspect.mjs <파일경로|git:<rev>:<path>> [--dump-mismatch] [--expect-size=N] [--expect-md5=HEX]
//   node ico-inspect.mjs --help
// 판정 채널은 stdout 이며 파일을 쓰지 않는다.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';

const USAGE = `ico-inspect.mjs — ICO 프레임 표 + AND마스크/알파 대조 (Node 내장 모듈만 사용)

usage:
  node ico-inspect.mjs <path>                 작업 트리 파일을 검사
  node ico-inspect.mjs git:<rev>:<path>       git blob 을 buffer 로 안전 추출해 검사 (C-9 회피)
  node ico-inspect.mjs <src> --dump-mismatch  AND마스크/알파 불일치 픽셀 전량(좌표·BGRA) 출력
  node ico-inspect.mjs <src> --expect-size=N --expect-md5=HEX
                                              추출 직후 크기·md5 assert (불일치 시 exit 2)
  node ico-inspect.mjs --help                 이 사용법을 stdout 에 출력하고 exit 0
`;

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const src = argv.find((a) => !a.startsWith('--'));
const dumpMismatch = argv.includes('--dump-mismatch');
const expectSize = (argv.find((a) => a.startsWith('--expect-size=')) || '').split('=')[1];
const expectMd5 = (argv.find((a) => a.startsWith('--expect-md5=')) || '').split('=')[1];

function loadBuffer(spec) {
  if (spec.startsWith('git:')) {
    const rest = spec.slice(4);
    const i = rest.indexOf(':');
    const rev = rest.slice(0, i);
    const path = rest.slice(i + 1);
    // C-9: 셸 파이프를 경유하지 않고 execFileSync buffer 로 직접 받는다.
    return execFileSync('git', ['cat-file', 'blob', `${rev}:${path}`], {
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
    });
  }
  return readFileSync(spec);
}

const buf = loadBuffer(src);
const md5 = createHash('md5').update(buf).digest('hex');
console.log(`source: ${src}`);
console.log(`bytes: ${buf.length}`);
console.log(`md5: ${md5}`);
if (expectSize !== undefined && String(buf.length) !== String(expectSize)) {
  console.log(`ASSERT FAIL: size ${buf.length} != ${expectSize}`);
  process.exit(2);
}
if (expectMd5 !== undefined && md5 !== expectMd5) {
  console.log(`ASSERT FAIL: md5 ${md5} != ${expectMd5}`);
  process.exit(2);
}
if (expectSize !== undefined || expectMd5 !== undefined) console.log('ASSERT OK: size/md5 match');

// ---- ICONDIR ----
const reserved = buf.readUInt16LE(0);
const type = buf.readUInt16LE(2);
const count = buf.readUInt16LE(4);
console.log(`ICONDIR: reserved=${reserved} type=${type} count=${count}`);

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(data) {
  if (!data.subarray(0, 8).equals(PNG_SIG)) throw new Error('not png');
  let off = 8;
  let w = 0, h = 0, bd = 0, ct = 0, interlace = 0;
  const idats = [];
  while (off + 8 <= data.length) {
    const len = data.readUInt32BE(off);
    const tag = data.toString('ascii', off + 4, off + 8);
    const body = data.subarray(off + 8, off + 8 + len);
    if (tag === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4);
      bd = body[8]; ct = body[9]; interlace = body[12];
    } else if (tag === 'IDAT') idats.push(body);
    else if (tag === 'IEND') break;
    off += 12 + len;
  }
  if (bd !== 8 || ct !== 6 || interlace !== 0) {
    return { w, h, bd, ct, interlace, idatCount: idats.length, idatSizes: idats.map((b) => b.length), rgba: null };
  }
  const raw = inflateSync(Buffer.concat(idats));
  const bpp = 4;
  const stride = w * bpp;
  const rgba = Buffer.alloc(stride * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const row = raw.subarray(p, p + stride); p += stride;
    const out = rgba.subarray(y * stride, (y + 1) * stride);
    const prev = y === 0 ? null : rgba.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      const v = row[x];
      out[x] = ft === 0 ? v : ft === 1 ? (v + a) & 255 : ft === 2 ? (v + b) & 255
        : ft === 3 ? (v + ((a + b) >> 1)) & 255 : (v + paeth(a, b, c)) & 255;
    }
  }
  return { w, h, bd, ct, interlace, idatCount: idats.length, idatSizes: idats.map((b) => b.length), rgba };
}

const rows = [];
const allMismatch = [];

for (let i = 0; i < count; i++) {
  const e = 6 + i * 16;
  const wRaw = buf[e], hRaw = buf[e + 1];
  const w = wRaw === 0 ? 256 : wRaw;
  const h = hRaw === 0 ? 256 : hRaw;
  const bitCount = buf.readUInt16LE(e + 6);
  const bytesInRes = buf.readUInt32LE(e + 8);
  const imageOffset = buf.readUInt32LE(e + 12);
  const data = buf.subarray(imageOffset, imageOffset + bytesInRes);

  const isPng = data.subarray(0, 8).equals(PNG_SIG);
  let format, detail, rgba = null, mismatch = null, maskPresent = false;

  if (isPng) {
    const d = decodePng(data);
    format = 'PNG';
    detail = `bd=${d.bd} ct=${d.ct} interlace=${d.interlace} IDAT=${d.idatCount}[${d.idatSizes.join('+')}]`;
    rgba = d.rgba;
  } else {
    const biSize = data.readUInt32LE(0);
    const biWidth = data.readInt32LE(4);
    const biHeight = data.readInt32LE(8);
    const biBitCount = data.readUInt16LE(14);
    const biCompression = data.readUInt32LE(16);
    format = 'BMP';
    detail = `hdr=${biSize} bi=${biWidth}x${biHeight} bpp=${biBitCount} comp=${biCompression}`;
    if (biBitCount !== 32) throw new Error(`frame ${i}: unsupported bpp ${biBitCount}`);
    const xorOff = biSize;
    const xorStride = w * 4;
    const maskStride = Math.ceil(w / 32) * 4;
    const maskOff = xorOff + xorStride * h;
    maskPresent = maskOff + maskStride * h <= data.length;
    // ICO BMP 은 bottom-up. RGBA 를 top-down 으로 정규화한다.
    rgba = Buffer.alloc(w * h * 4);
    let mm = 0;
    for (let y = 0; y < h; y++) {
      const srcRow = xorOff + (h - 1 - y) * xorStride;
      for (let x = 0; x < w; x++) {
        const s = srcRow + x * 4;
        const B = data[s], G = data[s + 1], R = data[s + 2], A = data[s + 3];
        const d2 = (y * w + x) * 4;
        rgba[d2] = R; rgba[d2 + 1] = G; rgba[d2 + 2] = B; rgba[d2 + 3] = A;
        if (maskPresent) {
          const mRow = maskOff + (h - 1 - y) * maskStride;
          const bit = (data[mRow + (x >> 3)] >> (7 - (x & 7))) & 1;
          const expectBit = A === 0 ? 1 : 0;
          if (bit !== expectBit) {
            mm++;
            allMismatch.push({ frame: i, w, x, y, bit, B, G, R, A });
          }
        }
      }
    }
    mismatch = maskPresent ? mm : null;
  }

  rows.push({
    i, w, h, bpp: bitCount, bytes: bytesInRes, offset: imageOffset, format, detail,
    sha256: rgba ? createHash('sha256').update(rgba).digest('hex') : '(undecoded)',
    maskPresent, mismatch,
  });
}

console.log('');
console.log(' #    w    h  bpp     bytes    offset  format  RGBA-sha256(앞16)  ANDmask  mismatch  detail');
for (const r of rows) {
  console.log(
    `${String(r.i).padStart(2)} ${String(r.w).padStart(4)} ${String(r.h).padStart(4)} ` +
    `${String(r.bpp).padStart(4)} ${String(r.bytes).padStart(9)} ${String(r.offset).padStart(9)}  ` +
    `${r.format.padEnd(6)}  ${r.sha256.slice(0, 16)}  ${r.maskPresent ? 'yes' : 'no '}      ` +
    `${r.mismatch === null ? '-' : String(r.mismatch).padStart(3)}       ${r.detail}`,
  );
}
const bmpBytes = rows.filter((r) => r.format === 'BMP').reduce((s, r) => s + r.bytes, 0);
const pngBytes = rows.filter((r) => r.format === 'PNG').reduce((s, r) => s + r.bytes, 0);
console.log('');
console.log(`BMP frames: ${rows.filter((r) => r.format === 'BMP').length}, bytes=${bmpBytes}`);
console.log(`PNG frames: ${rows.filter((r) => r.format === 'PNG').length}, bytes=${pngBytes}`);
console.log(`ICONDIR+entries: ${6 + count * 16}`);
console.log(`mask/alpha mismatch counts (BMP frames): [${rows.filter((r) => r.maskPresent).map((r) => r.mismatch).join(',')}]`);

// 불일치 유형 분류
const typeA = allMismatch.filter((m) => m.bit === 0 && m.A === 0);   // 마스크=불투명, 알파=완전투명
const typeB = allMismatch.filter((m) => m.bit === 1 && m.A > 0);     // 마스크=투명, 알파=불투명
console.log(`mismatch type 'bit=0 & alpha=0': ${typeA.length}`);
console.log(`mismatch type 'bit=1 & alpha>0': ${typeB.length}`);

// bit=0 & alpha=0 픽셀의 BGR 분포 (R-3 판단 근거)
if (typeA.length > 0) {
  const hist = new Map();
  for (const m of typeA) {
    const k = `${m.B},${m.G},${m.R}`;
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  console.log(`distinct BGR values among 'bit=0 & alpha=0' pixels: ${hist.size}`);
  for (const [k, v] of [...hist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  BGR=(${k})  count=${v}`);
  }
}

if (dumpMismatch) {
  console.log('');
  console.log('--- mismatch pixels (frame,x,y,maskbit,B,G,R,A) ---');
  for (const m of allMismatch) {
    console.log(`${m.frame},${m.x},${m.y},${m.bit},${m.B},${m.G},${m.R},${m.A}`);
  }
  console.log(`--- total ${allMismatch.length} ---`);
}
