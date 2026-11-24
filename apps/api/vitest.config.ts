import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // API suites use the same SQLite database and create/delete fixtures.
    // Running files concurrently creates lock contention and intermittent
    // per-test timeouts, so keep file execution deterministic.
    fileParallelism: false,
  },
});
