#!/usr/bin/env node
// ts-erasure.mjs — 어떤 TS 파일의 변경이 "타입 수준뿐" 임을 증명한다.
//   변경 전(git blob) 과 작업 트리 버전을 각각 Node 내장 module.stripTypeScriptTypes 로
//   타입 소거한 뒤, 주석 제거 + 공백 정규화한 런타임 토큰 스트림을 비교한다.
// 변경 전 추출은 §0(라)/C-9 규약대로 execFileSync(...,{encoding:'buffer'}) 만 쓰고,
// 추출 직후 바이트 수와 sha256 을 stdout 에 출력하며 0바이트면 즉시 중단한다.
// 판정 채널은 stdout. 파일을 쓰지 않는다. Node 내장 모듈만 사용한다.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';

const USAGE = `ts-erasure.mjs — TS 변경이 런타임에 영향이 없음을 토큰 스트림 동일성으로 증명

usage:
  node ts-erasure.mjs <path> [<rev>]     기본 rev = 1fe77bd
  node ts-erasure.mjs --help             이 사용법을 stdout 에 출력하고 exit 0

방식:
  before = git cat-file blob <rev>:<path>   (셸 파이프 미경유, buffer 직수신 + 크기/sha256 출력)
  after  = 작업 트리 파일
  둘을 stripTypeScriptTypes(mode:'strip') 후 JS 토큰 배열로 쪼개(공백·주석 제외,
  문자열/템플릿/정규식 리터럴은 원문 보존) 토큰 열을 비교한다.
  Node 는 타입을 "공백으로" 치환하므로 공백을 세지 않는 토큰 비교가 곧
  "실행되는 코드가 동일한가" 의 판정이다.

종료 코드: 동일 0 / 다름 1 / 추출·파싱 실패 2
`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const positional = argv.filter((a) => !a.startsWith('--'));
if (positional.length === 0) {
  process.stdout.write(USAGE);
  process.exit(2);
}
const target = positional[0];
const rev = positional[1] || '1fe77bd';

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// JS 토큰 배열로 쪼갠다. 공백·주석은 버리고 문자열/템플릿/정규식 리터럴은 원문 그대로 보존한다.
// Node 의 stripTypeScriptTypes 는 타입을 "공백으로" 치환하므로, 공백을 세지 않는 토큰 비교가
// 곧 "실행되는 코드가 동일한가" 의 판정이다. (문자열 안 공백은 토큰 내부라 보존된다.)
// 한계: 템플릿 리터럴의 ${} 내부는 원문 보존이므로 그 안의 타입 소거는 차이로 보고된다.
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const WORD = /[A-Za-z0-9_$]/;
  const last = () => (tokens.length ? tokens[tokens.length - 1] : '');
  const regexAllowed = () => {
    const t = last();
    if (t === '') return true;
    if (/^[A-Za-z0-9_$]/.test(t)) {
      return /^(return|typeof|case|in|of|new|delete|void|do|else|yield|await|instanceof)$/.test(t);
    }
    return !(t === ')' || t === ']' || t === '}');
  };
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const n = src[i + 1];
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      let tok = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { tok += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
        tok += src[i];
        if (src[i] === q) { i++; break; }
        i++;
      }
      tokens.push(tok);
      continue;
    }
    if (c === '/' && regexAllowed()) {
      let tok = c;
      i++;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === '\\') { tok += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
        if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        tok += src[i];
        if (src[i] === '/' && !inClass) { i++; break; }
        i++;
      }
      while (i < src.length && /[a-z]/.test(src[i])) { tok += src[i]; i++; }
      tokens.push(tok);
      continue;
    }
    if (WORD.test(c)) {
      let tok = '';
      while (i < src.length && WORD.test(src[i])) { tok += src[i]; i++; }
      tokens.push(tok);
      continue;
    }
    tokens.push(c);
    i++;
  }
  return tokens;
}

function runtimeTokens(src) {
  return tokenize(stripTypeScriptTypes(src, { mode: 'strip' }));
}

let beforeBuf;
try {
  beforeBuf = execFileSync('git', ['cat-file', 'blob', `${rev}:${target}`], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (e) {
  console.log(`EXTRACT FAIL: git cat-file blob ${rev}:${target} — ${e.message}`);
  process.exit(2);
}
if (!beforeBuf || beforeBuf.length === 0) {
  console.log(`EXTRACT FAIL: git cat-file blob ${rev}:${target} extracted 0 bytes`);
  process.exit(2);
}
let afterBuf;
try {
  afterBuf = readFileSync(target);
} catch {
  console.log(`READ FAIL: ${target}`);
  process.exit(2);
}

console.log(`before: git cat-file blob ${rev}:${target}  (${beforeBuf.length} bytes, sha256 ${sha256(beforeBuf)})`);
console.log(`after : working tree${' '.repeat(Math.max(1, `git cat-file blob ${rev}:${target}`.length - 12))}  (${afterBuf.length} bytes, sha256 ${sha256(afterBuf)})`);

let tb;
let ta;
try {
  tb = runtimeTokens(beforeBuf.toString('utf8'));
  ta = runtimeTokens(afterBuf.toString('utf8'));
} catch (e) {
  console.log(`STRIP FAIL: ${e.message}`);
  process.exit(2);
}
const joinTokens = (t) => t.join('\u0000');

console.log(`token counts: before=${tb.length} after=${ta.length}`);
console.log(`runtime token stream sha256 before: ${createHash('sha256').update(joinTokens(tb)).digest('hex')}`);
console.log(`runtime token stream sha256 after : ${createHash('sha256').update(joinTokens(ta)).digest('hex')}`);
const identical = joinTokens(tb) === joinTokens(ta);
console.log(`runtime token stream identical: ${identical}`);
if (!identical) {
  // 첫 불일치 토큰 위치를 보여 준다(진단용).
  let k = 0;
  while (k < tb.length && k < ta.length && tb[k] === ta[k]) k++;
  console.log(`first divergence at token index ${k}:`);
  console.log(`  before: ...${tb.slice(Math.max(0, k - 12), k + 12).join(' ')}`);
  console.log(`  after : ...${ta.slice(Math.max(0, k - 12), k + 12).join(' ')}`);
}
console.log(`VERDICT: ${identical ? 'TYPE-LEVEL ONLY (no runtime change)' : 'RUNTIME CODE CHANGED'}`);
process.exit(identical ? 0 : 1);
