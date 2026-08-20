#!/usr/bin/env node
// dist-measure.mjs — 빌드 산출물 디렉토리를 셸 globbing 에 의존하지 않고 계측한다.
//   D-1(zsh GLOB_SUBST off)·C-10(ls -l 바이트 열 소실, BSD wc 공백 패딩) 회피용.
//   파일 목록·개수·총 바이트·패턴별 존재 개수·지정 파일의 정수 바이트를 stdout 에 출력한다.
// 판정 채널은 stdout. 파일을 쓰지 않는다. Node 내장 모듈만 사용한다.
import { readdirSync, statSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';

const USAGE = `dist-measure.mjs — dist 산출물 파일 수·총 바이트·패턴 존재 개수 계측

usage:
  node dist-measure.mjs <dir> [--name=<glob>]... [--stat=<path>]...
  node dist-measure.mjs --help

옵션:
  --name=<glob>   해당 glob 에 매칭되는 파일 개수를 출력한다.
                  형식: [<하위경로>/]<패턴>  예) assets/bg-blue-*.png, vite.svg
                  매칭은 Node 가 수행하므로 셸 globbing(zsh GLOB_SUBST)에 의존하지 않는다.
  --dir=<glob>    같은 방식으로 디렉토리 개수를 출력한다. 예) assets/images
  --stat=<path>   <dir> 기준 상대경로 파일의 정수 바이트를 출력한다.

출력:
  files (정렬된 상대경로 목록) / file_count=N / total_bytes=N
  name <glob> -> N   |  dir <glob> -> N  |  stat <bytes> <path>

종료 코드: 0 정상 / 2 디렉토리 없음·인자 없음
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
const root = positional[0];
try {
  if (!statSync(root).isDirectory()) throw new Error('not a dir');
} catch {
  console.log(`DIR NOT FOUND: ${root}`);
  process.exit(2);
}

function globToRe(pattern) {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${esc}$`);
}

const files = [];
const dirs = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      dirs.push(relative(root, p));
      walk(p);
    } else if (e.isFile()) {
      files.push(relative(root, p));
    }
  }
})(root);

files.sort();
dirs.sort();

console.log(`root: ${root}`);
console.log('files:');
for (const f of files) console.log(`  ${f}`);
console.log(`file_count=${files.length}`);
let total = 0;
for (const f of files) total += statSync(join(root, f)).size;
console.log(`total_bytes=${total}`);

for (const a of argv) {
  if (a.startsWith('--name=')) {
    const pat = a.slice('--name='.length);
    const dirPart = dirname(pat) === '.' ? '' : dirname(pat);
    const re = globToRe(basename(pat));
    const n = files.filter((f) => (dirname(f) === '.' ? '' : dirname(f)) === dirPart && re.test(basename(f))).length;
    console.log(`name ${pat} -> ${n}`);
  } else if (a.startsWith('--dir=')) {
    const pat = a.slice('--dir='.length);
    const dirPart = dirname(pat) === '.' ? '' : dirname(pat);
    const re = globToRe(basename(pat));
    const n = dirs.filter((d) => (dirname(d) === '.' ? '' : dirname(d)) === dirPart && re.test(basename(d))).length;
    console.log(`dir ${pat} -> ${n}`);
  } else if (a.startsWith('--stat=')) {
    const rel = a.slice('--stat='.length);
    try {
      console.log(`stat ${statSync(join(root, rel)).size} ${rel}`);
    } catch {
      console.log(`stat MISSING ${rel}`);
    }
  }
}
