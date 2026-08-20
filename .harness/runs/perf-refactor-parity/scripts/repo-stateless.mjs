#!/usr/bin/env node
// repo-stateless.mjs — G3 게이트: Repository 구현체 6종이 인스턴스 가변 상태를 갖지 않는지 정적으로 확인한다.
// 판정 채널은 stdout 이며 파일을 쓰지 않는다. Node 내장 모듈만 사용한다.
import { readFileSync } from 'node:fs';

const USAGE = `repo-stateless.mjs — Repository 구현체 무상태성 정적 검사 (G3 게이트)

usage:
  node repo-stateless.mjs            6종 구현체를 검사하고 판정을 stdout 에 출력
  node repo-stateless.mjs --help     이 사용법을 stdout 에 출력하고 exit 0

검사 항목(구현체별):
  - 클래스 본문의 \`this.\` 사용 횟수
  - 인스턴스 필드 선언 수(클래스 본문 최상위 프로퍼티 선언)
  - constructor 유무와 본문 요약(필드 대입 유무)

판정: 모든 구현체가 \`this.\` 0 + 인스턴스 필드 0 이면 마지막 줄에 ALL STATELESS: yes.
      하나라도 아니면 no + exit 1. 파일을 읽지 못하면 exit 2.
`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const TARGETS = [
  ['LocalInvitationRepository', 'packages/ui/src/entities/WeddingInvitation/repositories/LocalInvitationRepository.ts'],
  ['SupabaseInvitationRepository', 'packages/ui/src/entities/WeddingInvitation/repositories/SupabaseInvitationRepository.ts'],
  ['ApiGuestBookRepository', 'packages/ui/src/entities/GuestBook/api/ApiGuestBookRepository.ts'],
  ['SupabaseGuestBookRepository', 'packages/ui/src/entities/GuestBook/api/SupabaseGuestBookRepository.ts'],
  ['LocalAuthRepository', 'apps/momozzang-admin/src/features/auth/LocalAuthRepository.ts'],
  ['SupabaseAuthRepository', 'apps/momozzang-admin/src/features/auth/SupabaseAuthRepository.ts'],
];

// 문자열/주석을 공백으로 치환해 구문 스캔 오탐을 막는다.
function blankStringsAndComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && n === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += ' ';
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { out += '  '; i += 2; continue; }
        if (src[i] === quote) { out += ' '; i++; break; }
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function extractClassBody(src, className) {
  const marker = new RegExp(`class\\s+${className}\\b`);
  const m = marker.exec(src);
  if (!m) return null;
  let i = src.indexOf('{', m.index);
  if (i < 0) return null;
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start + 1, i);
    }
  }
  return null;
}

// 클래스 본문 최상위(깊이 0) 멤버를 잘라낸다.
function topLevelMembers(body) {
  const members = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    if (ch === '}' || ch === ')' || ch === ']') depth--;
    cur += ch;
    if (depth === 0 && (ch === ';' || ch === '}')) {
      members.push(cur.trim());
      cur = '';
    }
  }
  if (cur.trim()) members.push(cur.trim());
  return members.filter(Boolean);
}

const FIELD_RE = /^(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+|declare\s+|#)*[A-Za-z_$#][\w$]*\s*(?:[?!]\s*)?(?::|=)/;

let allStateless = true;
console.log('repo-stateless.mjs — G3 게이트 (Repository 구현체 무상태성)');
console.log('');
console.log('구현체                          this.   필드   constructor');

const details = [];
for (const [name, path] of TARGETS) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.log(`READ FAIL: ${path}`);
    process.exit(2);
  }
  const scrubbed = blankStringsAndComments(raw);
  const body = extractClassBody(scrubbed, name);
  if (body === null) {
    console.log(`CLASS NOT FOUND: ${name} in ${path}`);
    process.exit(2);
  }
  const rawBody = extractClassBody(raw, name);
  const thisCount = (body.match(/this\./g) || []).length;
  const members = topLevelMembers(body);
  const ctor = members.find((m) => /^constructor\s*\(/.test(m));
  const fields = members.filter((m) => !/^constructor\s*\(/.test(m) && FIELD_RE.test(m) && !/\)\s*[:{]/.test(m.split('\n')[0]));

  let ctorNote = 'none';
  if (ctor) {
    const rawCtor = /constructor\s*\([^)]*\)\s*\{/.exec(rawBody || '');
    const assigns = (blankStringsAndComments(ctor).match(/this\.[\w$]+\s*=/g) || []).length;
    const readsEnv = /import\.meta\.env/.test(ctor);
    const throws = /\bthrow\b/.test(ctor);
    const line = rawCtor ? (rawBody.slice(0, rawCtor.index).split('\n').length) : null;
    const flags = [];
    if (readsEnv) flags.push('env-read');
    if (throws) flags.push('throw');
    const assignNote = assigns === 0 ? 'only (no field assignment)' : `${assigns} field assignment(s)`;
    const summary = flags.length > 0 ? `${flags.join(' + ')} ${assignNote}` : assignNote;
    ctorNote = `present${line ? ` (class body line ${line})` : ''} — ${summary}`;
    if (assigns > 0) allStateless = false;
  }
  if (thisCount > 0 || fields.length > 0) allStateless = false;

  console.log(
    `${name.padEnd(30)} ${String(thisCount).padStart(4)}  ${String(fields.length).padStart(5)}   ${ctor ? 'yes' : 'no'}`,
  );
  details.push(`  ${name}: constructor: ${ctorNote}`);
}

console.log('');
console.log('constructor 상세:');
for (const d of details) console.log(d);
console.log('');
console.log(`ALL STATELESS: ${allStateless ? 'yes' : 'no'}`);
process.exit(allStateless ? 0 : 1);
