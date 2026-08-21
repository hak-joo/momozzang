import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * React Compiler 를 적용할 파일을 판정하는 술어.
 *
 * 공유 패키지의 소스만 컴파일 대상이며 **어드민 앱 소스는 제외**한다. 어드민 소스를 넣으면
 * `EditPage`(렌더 중 setState)·`AdminPage`(effect 의존 배열에 toast 객체)가 컴파일 영향권에
 * 들어가는데, 그 재설계는 이번 범위 밖이다(계약 §2 G7-a).
 *
 * 이 술어를 **이름 있는 export** 로 노출하는 이유: 계약 기준 D3 이 이 함수를 직접 호출해
 * 판정한다. 따라서 아래 `babel` 옵션은 술어 본문을 복제하지 않고 이 export 를 호출한다.
 */
export const shouldUseCompiler = (id: string): boolean => id.includes('/packages/ui/src/');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: (id) => ({
        plugins: shouldUseCompiler(id) ? [['babel-plugin-react-compiler', {}]] : [],
      }),
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 3002,
  },
});
