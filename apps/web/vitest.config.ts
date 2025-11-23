import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['**/Infra/**/*.test.ts', 'happy-dom'],
      ['**/composables/**/*.test.ts', 'happy-dom'],
    ],
    isolate: false,
    pool: 'threads',
  },
})
