import { defineConfig, globalIgnores } from 'eslint/config';
import { fixupConfigRules } from '@eslint/compat';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.yalc/**',
    '.venv/**',
    // The React Native apps have their own toolchains (mobile*/eslint.config.js).
    'mobile/**',
    'mobile-click-to-call/**',
  ]),
  ...fixupConfigRules([...nextVitals, ...nextTypescript]),
]);
