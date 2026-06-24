import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tax/**/*.test.ts', 'guardrails/**/*.test.ts', 'tools/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'client/**'],
    env: {
      TFA_DATA_DIR: '/tmp/tfa-test-data',
    },
  },
});
