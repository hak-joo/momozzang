// pilot-no-compiler.vite.config.mjs — **진단 전용** 어드민 vite config.
//
// 목적: 기준 C6(F8 단독 귀속 측정). F9 가 어드민에 React Compiler 를 켜므로, 실제 구성에서는
// F8(`entriesWithPosition` 의 `useMemo`)과 F9(컴파일러)가 겹쳐 말풍선 타이밍 개선의 귀속이
// 불가능하다. 이 config 는 **컴파일러를 걸지 않은** 어드민 dev 서버를 띄워 F8 단독 기여를 잰다.
//
// 이 파일은 앱 빌드 경로에 들어가지 않는다 — `apps/momozzang-admin/vite.config.ts` 는 그대로 두고
// `--config` 로만 이 파일을 지정한다. 앱 소스·의존성·`package.json` 에 아무 영향이 없다.
//
// 사용 (계약 §4.0(가) 형태)
//   cd apps/momozzang-admin
//   npx vite --config ../../.harness/runs/perf-refactor-parity/scripts/pilot-no-compiler.vite.config.mjs \
//            --port 3095 --strictPort
//
// 의존성 해석: 이 파일은 `node_modules` 가 없는 디렉토리에 있으므로 bare import 로는
// `vite-tsconfig-paths` 를 찾지 못한다(저장소 루트 `node_modules` 에 hoist 되지 않는다).
// 그래서 **어드민 앱의 `package.json` 기준 `createRequire`** 로 해석한다.

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// scripts -> perf-refactor-parity -> runs -> .harness -> <repo root>
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const adminRoot = path.join(repoRoot, 'apps', 'momozzang-admin');
const requireFromAdmin = createRequire(path.join(adminRoot, 'package.json'));

const importFromAdmin = async (id) =>
  await import(pathToFileURL(requireFromAdmin.resolve(id)).href);

const { defineConfig } = await importFromAdmin('vite');
const reactMod = await importFromAdmin('@vitejs/plugin-react');
const tsconfigPathsMod = await importFromAdmin('vite-tsconfig-paths');

const react = reactMod.default ?? reactMod;
const tsconfigPaths = tsconfigPathsMod.default ?? tsconfigPathsMod;

export default defineConfig({
  root: adminRoot,
  // `react()` 를 **babel 옵션 없이** 쓴다 = `6ba4c83` 의 어드민 구성과 동일.
  // 즉 `packages/ui` 도 컴파일되지 않는다.
  // `tsconfigPaths()` 에 `root` 를 넘기지 않는다 — 기본값이 pnpm 워크스페이스 루트를 찾아
  // `packages/ui/tsconfig.json` 의 `@widgets/*` 등 별칭까지 수집한다. `root: adminRoot` 로
  // 좁히면 그 별칭을 못 찾아 뷰어 트리가 500 으로 죽는다(실측).
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3095,
  },
});
