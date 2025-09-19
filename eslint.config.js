// eslint.config.js
// Flat Config for ESLint 9 — React 18 + TypeScript + Vite
// Goal: single source of truth, type-aware rules, import hygiene, Prettier-friendly.

import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  // 1) Ignore heavy or generated paths to speed up linting and avoid noise
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'public/**',
      'src/generated/**',
      'types/ethers-contracts/**', // generated types (ignore if applicable)
    ],
  },

  // 2) Base JS recommendations
  js.configs.recommended,

  // 3) Type-aware linting for .ts/.tsx files
  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],

    // Enable type-aware rules (requires a project file)
    extends: [...tseslint.configs.recommendedTypeChecked],

    languageOptions: {
      parserOptions: {
        // Use a dedicated project for ESLint to avoid scanning extra stuff
        project: ['./tsconfig.eslint.json'],
        // More robust across different environments
        tsconfigRootDir: process.cwd(),
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },

    plugins: {
      // Import hygiene and sorting
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,

      // React
      react,
      'react-hooks': reactHooks,
    },

    settings: {
      // Auto-detect React version
      react: { version: 'detect' },

      // Let eslint-plugin-import resolve TS paths/aliases (e.g., "@/...")
      // Requires: `eslint-import-resolver-typescript` and `eslint-import-resolver-node`
      'import/resolver': {
        typescript: { project: ['./tsconfig.json'] },
        node: true,
      },
    },

    rules: {
      /* React */
      'react/jsx-uses-react': 'off', // not needed since React 17+
      'react/react-in-jsx-scope': 'off', // Vite handles JSX transform
      'react/prop-types': 'off', // using TypeScript for props validation

      /* React Hooks */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      /* Imports */
      'import/order': 'off', // prefer simple-import-sort for deterministic ordering
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',

      /* Unused code — ESLint handles it (TS noUnused* are disabled) */
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',

      /* Console usage — keep warnings/errors only */
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      /* TypeScript niceties */
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  }),

  // 4) JS/JSX files (if any) get a lean version of the above
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': { node: true },
    },
    rules: {
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/order': 'off',
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // 5) Disable style rules that conflict with Prettier
  // (This config turns off all conflicting rules — keep it last)
  eslintConfigPrettier,
]
