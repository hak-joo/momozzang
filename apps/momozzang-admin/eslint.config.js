import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/**
 * 루트 .eslintrc.json(eslint:recommended + react + @typescript-eslint + prettier + react-hooks)을
 * ESLint 9 flat config 형식으로 이식한 것. admin 앱에는 그동안 flat config가 없어 lint가
 * 동작하지 않았으므로 이 파일로 복구한다. 규칙 강도는 루트 레거시 설정과 동일하게 맞춘다
 * (no-unused-vars off, react-hooks는 클래식 2종 규칙). 신규 strict 규칙은 도입하지 않는다.
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
  crypto: 'readonly',
  Promise: 'readonly',
  structuredClone: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  requestAnimationFrame: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLElement: 'readonly',
  HTMLDivElement: 'readonly',
  HTMLTextAreaElement: 'readonly',
  HTMLSelectElement: 'readonly',
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
      // react-hooks: 레거시(클래식) 2종만 적용 (v7 strict 프리셋 미도입)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // 루트 레거시 설정과 동일
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // 기존 admin 코드(AdminPage/GalleryManager)의 any 캐스트는 비차단 경고로 둔다.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
