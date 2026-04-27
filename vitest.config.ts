import { defineConfig } from 'vitest/config';

// Root vitest config covers packages/core pure-function tests.
// CF-pool integration tests live in apps/web/vitest.config.ts.
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    environment: 'node',
  },
});
