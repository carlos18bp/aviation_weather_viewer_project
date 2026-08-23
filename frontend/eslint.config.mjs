import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import playwright from 'eslint-plugin-playwright';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    ...playwright.configs['flat/recommended'],
    files: ['e2e/**/*.{ts,tsx,js,jsx}'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/expect-expect': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // public/sw.js is served verbatim, so it is plain worker-scoped script that
    // neither Turbopack nor tsc ever sees. Declare its globals or no-undef
    // floods the lint run.
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        AbortController: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        Promise: 'readonly',
        Error: 'readonly',
        JSON: 'readonly',
        Math: 'readonly',
      },
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'jest.config.cjs',
  ]),
]);

export default eslintConfig;
