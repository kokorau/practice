/**
 * Setup file for happy-dom environment tests.
 * This file runs before each test file that uses happy-dom.
 */

// Polyfill URL for happy-dom in CI environment
// happy-dom may not provide URL in some CI environments
if (typeof globalThis.URL !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { URL: NodeURL } = require('node:url')
  globalThis.URL = NodeURL
}
