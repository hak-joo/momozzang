import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/**
 * invitation 앱의 flat config. 이전 설정은 `node_modules`에 실재하지 않는 패키지
 * (`typescript-eslint`, `eslint-plugin-react-refresh`)와 `package.json`에 선언되지 않은
 * `globals`를 import 해 `ERR_MODULE_NOT_FOUND`(exit 2)로 lint 실행 자체가 불가능했다.
 * admin 앱의 설정(`apps/momozzang-admin/eslint.config.js`)을 참조 구현으로 삼아
 * **실재하는 패키지만** 사용하도록 재작성한다. 신규 npm 의존성은 추가하지 않으며,
 * 전역은 `globals` 패키지 대신 아래에서 수동 선언한다. 규칙 강도는 admin과 동일하게
 * 맞추고 신규 strict 프리셋은 도입하지 않는다.
 */
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  console: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
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
};

/** Node 스크립트(마이그레이션 CLI, postcss 설정)에서만 쓰는 전역. */
const nodeGlobals = {
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  console: 'readonly',
};

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
  },
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
      // react-hooks: 레거시(클래식) 2종만 적용 (v7 strict 프리셋 미도입)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // 루트 레거시 설정과 동일
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // 기존 코드의 any 캐스트는 비차단 경고로 둔다.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // 마이그레이션 스크립트는 브라우저가 아니라 Node(tsx)에서 실행된다.
    files: ['src/features/migration/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...browserGlobals, ...nodeGlobals },
    },
  },
];
