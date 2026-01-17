/**
 * Setup file for happy-dom environment tests.
 * This file runs before each test file that uses happy-dom.
 */

// Polyfill URL for happy-dom in CI environment
// happy-dom may not provide a functional URL constructor in some CI environments
// Always polyfill from Node.js to ensure consistent behavior
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { URL: NodeURL } = require('node:url')
globalThis.URL = NodeURL as typeof URL
