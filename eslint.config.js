import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import nativePluginBoundary from './scripts/eslint/native-plugin-boundary.mjs';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'dev-dist/',
      'android/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'review-screenshots/',
      'node_modules/',
      'research/',
      '.cache/',
      'legacy/',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    ignores: ['src/platform/android/**', 'src/infrastructure/db/android/**'],
    plugins: { native: { rules: { 'plugin-boundary': nativePluginBoundary } } },
    rules: { 'native/plugin-boundary': 'error' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
  prettier,
);
