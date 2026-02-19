import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    files: ['packages/*/src/**/*.ts'],
    ignores: ['**/*.d.ts', '**/dist/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Warn on unused vars, except those prefixed with _
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Error on no-console in mcp-server (use console.error instead)
    files: ['packages/mcp-server/src/**/*.ts'],
    ignores: ['**/*.d.ts', '**/dist/**', '**/__tests__/**'],
    rules: {
      'no-console': ['error', { allow: ['error'] }],
    },
  },
  // Apply prettier config last to disable conflicting rules
  {
    ...prettierConfig,
    files: ['packages/*/src/**/*.ts'],
  },
];
