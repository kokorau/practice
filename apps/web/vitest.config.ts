import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/modules/**/Infra/**/*.test.ts', 'happy-dom'],
      ['src/composables/**/*.test.ts', 'happy-dom'],
      ['src/components/**/*.test.ts', 'happy-dom'],
    ],
    isolate: false,
    pool: 'threads',
    // Browser tests (*.browser.test.ts) are excluded from default run
    exclude: ['**/node_modules/**', '**/*.browser.test.ts'],
  },
})
