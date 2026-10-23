import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Same `@/*` path alias as tsconfig.json, so tests can import app modules.
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s for container startup/teardown
    hookTimeout: 60000,
    // The React Native app is a separate install with no tests here.
    exclude: ['**/node_modules/**', 'mobile/**'],
  },
});
