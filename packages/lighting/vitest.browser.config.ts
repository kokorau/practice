import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

// WebGPU requires non-headless mode on macOS
// headless=new + Vulkan flags don't work on macOS (GPU access restricted)
// Set HEADLESS=false for local development with WebGPU tests
// Reference: https://developer.chrome.com/blog/supercharge-web-ai-testing
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
