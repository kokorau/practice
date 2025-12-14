import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

// WebGPU requires non-headless mode (GPU access)
// Set HEADLESS=true to run without GPU (tests will be skipped)
const headless = process.env.HEADLESS === 'true'

export default defineConfig({
  test: {
    include: ['src/**/*.browser.test.ts'],
    browser: {
      enabled: true,
      provider: playwright({
        launch: {
          args: [
            '--enable-unsafe-webgpu',
            '--enable-features=Vulkan',
          ],
        },
      }),
      instances: [{ browser: 'chromium' }],
      headless,
    },
  },
})
