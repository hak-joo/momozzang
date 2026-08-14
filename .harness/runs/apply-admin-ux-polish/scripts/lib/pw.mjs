// Playwright 로더 — 이 저장소는 playwright를 의존성으로 갖지 않는다(측정 전용).
// 해석 순서:
//   1) 일반 import('playwright')  — 워크스페이스나 NODE_PATH에 있으면 성공
//   2) PLAYWRIGHT_DIR 환경변수가 가리키는 node_modules 에서 해석
// 사용 예: PLAYWRIGHT_DIR=/some/scratch/node_modules node viewer-baseline.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function loadChromium() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    /* fallthrough */
  }
  const dir = process.env.PLAYWRIGHT_DIR;
  if (!dir) {
    throw new Error(
      'playwright를 찾을 수 없습니다.\n' +
        '  임의 디렉토리에서 `npm i playwright && npx playwright install chromium` 후\n' +
        '  PLAYWRIGHT_DIR=<그 디렉토리>/node_modules 로 실행하세요.',
    );
  }
  const require = createRequire(pathToFileURL(path.join(dir, '__resolve__.js')));
  const entry = require.resolve('playwright');
  const mod = await import(pathToFileURL(entry).href);
  return (mod.chromium ?? mod.default?.chromium);
}

/** 인자 파싱: --out <파일> --viewer <url> --admin <url> */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : true;
    }
  }
  return args;
}

/** 측정 결과를 stdout(항상) + --out 파일(선택)로 내보낸다. */
export async function emit(out, args) {
  const json = JSON.stringify(out, null, 2);
  if (typeof args.out === 'string') {
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(path.dirname(args.out), { recursive: true });
    await writeFile(args.out, json + '\n', 'utf8');
    process.stderr.write(`wrote ${args.out}\n`);
  }
  process.stdout.write(json + '\n');
}

/** 브라우저 컨텍스트에 주입되는 공통 헬퍼(문자열로 평가됨). */
export const domHelpers = `
  const rect = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)];
  };
  const byClass = (frag, root = document) =>
    [...root.querySelectorAll('div')].find((d) => [...d.classList].some((c) => c.includes(frag)));
  const pick = (cs, keys) => Object.fromEntries(keys.map((k) => [k, cs[k]]));
`;
