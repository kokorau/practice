import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

// macOS (Apple Silicon) + headless: WebGPU unsupported
//   - Metal is the only backend, no Vulkan/SwiftShader fallback
//   - GPU/Metal device not initialized in headless mode
//   - Tested: headless=new, use-angle, channel:chrome - all failed
//
// Linux CI: May work with headless=new + Vulkan flags
// Local dev: Use HEADLESS=false for WebGPU tests
const headless = process.env.HEADLESS !== 'false'

export default defineConfig({
  test: {
    include: ['src/**/*.browser.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless,
    },
  },
})
