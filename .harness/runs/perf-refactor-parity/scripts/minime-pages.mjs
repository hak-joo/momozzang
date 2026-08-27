#!/usr/bin/env node
// minime-pages.mjs — G5 게이트: 미니미 페이지 dot 의 안정 키(page[0]) 가 존재·유일한지 확인한다.
// 판정 채널은 stdout 이며 파일을 쓰지 않는다. Node 내장 모듈만 사용한다.
import { readFileSync } from 'node:fs';

const USAGE = `minime-pages.mjs — 미니미 페이지 분할과 안정 키 유일성 검사 (G5 게이트)

usage:
  node minime-pages.mjs           저장소 소스에서 상수를 읽어 페이지 분할을 재현하고 판정
  node minime-pages.mjs --help    이 사용법을 stdout 에 출력하고 exit 0

읽는 곳:
  MINI_ME_COUNT  packages/ui/src/shared/lib/miniMe/index.ts
  PAGE_SIZE      packages/ui/src/widgets/invitation/MiniRoom/GuestBookForm/context.tsx
  chunk()        같은 context.tsx 의 구현을 그대로 재현

전제 검사: MINI_ME_IDS 가 Object.freeze 이고 miniMePages 가 useMemo(..., []) + chunk 인지.
           깨지면 SOURCE GUARD FAIL 로 exit 2 (조용히 통과시키지 않는다).

판정: 모든 페이지가 비어 있지 않고 page[0] 이 페이지 간 유일하면
      VERDICT: STABLE KEY AVAILABLE (exit 0). 아니면 NOT AVAILABLE (exit 1).
`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const MINIME_PATH = 'packages/ui/src/shared/lib/miniMe/index.ts';
const CONTEXT_PATH = 'packages/ui/src/widgets/invitation/MiniRoom/GuestBookForm/context.tsx';

function readOrDie(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    console.log(`READ FAIL: ${path}`);
    process.exit(2);
  }
}

const miniMeSrc = readOrDie(MINIME_PATH);
const contextSrc = readOrDie(CONTEXT_PATH);

const countMatch = /export const MINI_ME_COUNT\s*=\s*(\d+)\s*;/.exec(miniMeSrc);
const pageSizeMatch = /const PAGE_SIZE\s*=\s*(\d+)\s*;/.exec(contextSrc);
if (!countMatch) {
  console.log(`PARSE FAIL: MINI_ME_COUNT not found in ${MINIME_PATH}`);
  process.exit(2);
}
if (!pageSizeMatch) {
  console.log(`PARSE FAIL: PAGE_SIZE not found in ${CONTEXT_PATH}`);
  process.exit(2);
}

// MINI_ME_IDS 는 Object.freeze(Array.from({length: MINI_ME_COUNT}, (_, i) => i + 1)) 이다.
const idsFrozen = /export const MINI_ME_IDS\s*=\s*Object\.freeze\(/.test(miniMeSrc);
// miniMePages 는 useMemo(() => chunk(MINI_ME_IDS, PAGE_SIZE), []) 이다.
const pagesMemo = /const miniMePages\s*=\s*useMemo\(\(\)\s*=>\s*chunk\(MINI_ME_IDS,\s*PAGE_SIZE\),\s*\[\]\)/.test(
  contextSrc,
);

if (!idsFrozen || !pagesMemo) {
  // 구조 가정이 깨졌으면 조용히 통과시키지 않는다 (page[0] 안정성의 전제가 사라졌다).
  console.log(
    `SOURCE GUARD FAIL: MINI_ME_IDS Object.freeze=${idsFrozen} miniMePages useMemo([],chunk)=${pagesMemo}`,
  );
  process.exit(2);
}

const MINI_ME_COUNT = Number(countMatch[1]);
const PAGE_SIZE = Number(pageSizeMatch[1]);

const MINI_ME_IDS = Object.freeze(Array.from({ length: MINI_ME_COUNT }, (_, index) => index + 1));
const chunk = (items, size) => {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
};
const pages = chunk(MINI_ME_IDS, PAGE_SIZE);

const keys = pages.map((p) => p[0]);
const allDefined = keys.every((k) => k !== undefined);
const unique = new Set(keys).size === keys.length;

console.log(`MINI_ME_COUNT=${MINI_ME_COUNT}  PAGE_SIZE=${PAGE_SIZE}`);
console.log(`pages=${pages.length}  lengths=[${pages.map((p) => p.length).join(',')}]`);
console.log(`keys=[${keys.join(',')}]  unique=${unique}  allDefined=${allDefined}`);
console.log(
  `order preserved (page index -> key): ${keys.map((k, i) => `${i}->${k}`).join(', ')}`,
);
const ok = allDefined && unique;
console.log(`VERDICT: ${ok ? 'STABLE KEY AVAILABLE' : 'STABLE KEY NOT AVAILABLE'}`);
process.exit(ok ? 0 : 1);
