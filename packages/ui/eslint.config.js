import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/**
 * `@momozzang/ui` 의 flat config.
 *
 * 이 패키지에는 그동안 lint 설정이 **없었다.** ESLint 9 flat config 는 설정 파일이 있는
 * 디렉토리를 base path 로 삼고 그 밖의 파일을 무시하므로, 두 앱의 `eslint.config.js` 로는
 * `packages/ui` 를 검사할 방법이 원리적으로 없었다(`--no-ignore` 로도 "outside of the base
 * path" 로 거부된다). 그래서 공유 패키지 152개 파일이 한 번도 lint 를 통과한 적이 없다.
 *
 * 규칙 강도는 두 앱과 **동일하게** 맞춘다 — 신규 strict 프리셋을 도입하지 않는다.
 * `react-hooks` 는 클래식 2종(`rules-of-hooks` error, `exhaustive-deps` warn)만 켠다.
 * 전역은 `globals` 패키지를 새로 들이지 않고 앱 설정과 같은 방식으로 수동 선언한다.
 */
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  React: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  FormData: 'readonly',
  Image: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  AbortController: 'readonly',
  crypto: 'readonly',
  Promise: 'readonly',
  structuredClone: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  IntersectionObserver: 'readonly',
  ResizeObserver: 'readonly',
  MutationObserver: 'readonly',
  matchMedia: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  location: 'readonly',
  history: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLCanvasElement: 'readonly',
  HTMLElement: 'readonly',
  HTMLDivElement: 'readonly',
  HTMLTextAreaElement: 'readonly',
  HTMLSelectElement: 'readonly',
  HTMLAudioElement: 'readonly',
  HTMLImageElement: 'readonly',
  HTMLButtonElement: 'readonly',
  HTMLSpanElement: 'readonly',
  HTMLParagraphElement: 'readonly',
  HTMLAnchorElement: 'readonly',
  HTMLFormElement: 'readonly',
  HTMLScriptElement: 'readonly',
  Element: 'readonly',
  Node: 'readonly',
  Event: 'readonly',
  CustomEvent: 'readonly',
  KeyboardEvent: 'readonly',
  MouseEvent: 'readonly',
  PointerEvent: 'readonly',
  TouchEvent: 'readonly',
  Audio: 'readonly',
  Response: 'readonly',
  Request: 'readonly',
  Headers: 'readonly',
  queueMicrotask: 'readonly',
  performance: 'readonly',
  getComputedStyle: 'readonly',
  DOMParser: 'readonly',
  Storage: 'readonly',
  ClipboardItem: 'readonly',
  ResizeObserverEntry: 'readonly',
  IntersectionObserverEntry: 'readonly',
};

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...prettier.rules,
      // react-hooks: 레거시(클래식) 2종만 적용 — 두 앱과 동일
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // 두 앱 설정과 동일
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // ── 아래 2종은 TypeScript 에서 구조적으로 오탐이므로 끈다 ──────────────
      // 규칙 강도를 낮추는 것이 아니라, 두 규칙이 검사하려는 것을 `tsc -b` 가
      // 이미 더 정확하게 검사한다. 두 앱 설정에 이 항목이 없는 이유는 앱 파일이
      // 우연히 해당 패턴을 쓰지 않아서일 뿐이다.
      //
      // no-undef: `RequestInfo`·`RequestInit`·`Window`·`TextEncoder` 같은 **타입만**
      //   참조하는 식별자를 정의되지 않은 변수로 본다. 전역 목록에 계속 이름을
      //   추가하는 방식으로는 끝나지 않으며(lib.dom 전체가 대상), 타입 오류는
      //   `tsc -b` 가 잡는다. typescript-eslint 공식 권고도 TS 파일에서 끄는 것이다.
      'no-undef': 'off',
      // no-redeclare: TS 의 타입/값 별도 네임스페이스를 이해하지 못한다. 이 저장소가
      //   실제로 쓰는 정상 패턴을 오탐한다 —
      //     `export const Menu = {...} as const;` + `export type Menu = ...` (menu.ts:1,9)
      //     `interface Props {}` + `export function WeddingInvitation()` (WeddingInvitation.tsx:30)
      //   중복 선언은 `tsc -b` 가 잡는다.
      'no-redeclare': 'off',
    },
  },
];
