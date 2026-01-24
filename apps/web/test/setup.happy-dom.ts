/**
 * Setup file for happy-dom environment tests.
 * This file runs before each test file that uses happy-dom.
 */

// Polyfill URL for happy-dom in CI environment
// happy-dom may not provide a functional URL constructor in some CI environments
// Always polyfill from Node.js to ensure consistent behavior
import { URL as NodeURL } from 'node:url'
globalThis.URL = NodeURL as unknown as typeof URL
