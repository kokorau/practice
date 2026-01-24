/**
 * Setup file for happy-dom environment tests.
 * This file runs before each test file that uses happy-dom.
 */

// Polyfill URL for happy-dom in CI environment
// happy-dom may not provide a functional URL constructor in some CI environments
// Use Node.js URL as polyfill
import { URL as NodeURL } from 'node:url'

// Override globalThis.URL with Node.js implementation
// This ensures URL constructor works in all environments
Object.defineProperty(globalThis, 'URL', {
  value: NodeURL,
  writable: true,
  configurable: true,
})
