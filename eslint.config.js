import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const tauri = {
  group: ['@tauri-apps/*'],
  message: 'Only src/platform/tauri may import Tauri (Constitution III).',
};
const uiLibs = {
  group: ['@xyflow/*', '@dnd-kit/*'],
  message: 'Canvas/DnD libraries are confined to src/ui (Constitution III).',
};

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'src-tauri/',
      'playwright-report/',
      'test-results/',
      '*.config.*',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-restricted-imports': ['error', { patterns: [tauri, uiLibs] }],
    },
  },
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            tauri,
            uiLibs,
            {
              group: ['react', 'react-dom', 'zustand', 'immer'],
              message: 'src/domain must stay pure (Constitution III).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/platform/tauri/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [uiLibs] }] },
  },
  { files: ['src/ui/**'], rules: { 'no-restricted-imports': ['error', { patterns: [tauri] }] } },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
