/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { usePaletteStyles } from './usePaletteStyles'
import type { SemanticColorPalette } from '../modules/SemanticColorPalette/Domain'

// Polyfill URL for happy-dom in CI environment
// Note: happy-dom should provide URL, but we check just in case
if (typeof globalThis.URL === 'undefined') {
  // Dynamic import for ESM compatibility
  import('node:url').then(({ URL: NodeURL }) => {
    globalThis.URL = NodeURL
  })
}

// ============================================================
// Test Helpers
// ============================================================

const createMockInkRoles = () => ({
  title: '#111',
  body: '#222',
  meta: '#333',
  linkText: '#06f',
  highlight: '#ff0',
  border: '#444',
  divider: '#555',
})

const createMockContextTokens = () => ({
  surface: '#fff',
  ink: createMockInkRoles(),
})

const createMockStatefulInkRoles = () => ({
  title: { default: '#111', hover: '#000', active: '#333', disabled: '#999' },
  body: { default: '#222', hover: '#111', active: '#333', disabled: '#aaa' },
  meta: { default: '#333', hover: '#222', active: '#444', disabled: '#bbb' },
  linkText: { default: '#06f', hover: '#04c', active: '#039', disabled: '#99c' },
  highlight: { default: '#ff0', hover: '#ee0', active: '#dd0', disabled: '#aa0' },
  border: { default: '#444', hover: '#333', active: '#555', disabled: '#ccc' },
  divider: { default: '#555', hover: '#444', active: '#666', disabled: '#ddd' },
})

const createMockStatefulComponentTokens = () => ({
  surface: { default: '#06f', hover: '#04c', active: '#039', disabled: '#99c' },
  ink: createMockStatefulInkRoles(),
})

const createMockSemanticPalette = (): SemanticColorPalette => ({
  context: {
    canvas: createMockContextTokens(),
    sectionNeutral: createMockContextTokens(),
    sectionTint: createMockContextTokens(),
    sectionContrast: createMockContextTokens(),
  },
  component: {
    card: createMockContextTokens(),
    cardFlat: createMockContextTokens(),
    action: createMockStatefulComponentTokens(),
    actionQuiet: createMockStatefulComponentTokens(),
  },
})

// Mock lifecycle hooks since we're not in a component context
let mountedCallbacks: (() => void)[] = []
let unmountedCallbacks: (() => void)[] = []

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onMounted: (cb: () => void) => {
      mountedCallbacks.push(cb)
    },
    onUnmounted: (cb: () => void) => {
      unmountedCallbacks.push(cb)
    },
  }
})

// ============================================================
// Tests
// ============================================================

describe('usePaletteStyles', () => {
  beforeEach(() => {
    mountedCallbacks = []
    unmountedCallbacks = []
  })

  afterEach(() => {
    // Clean up any remaining style elements
    document.querySelectorAll('style[data-hero-palette]').forEach(el => el.remove())
    document.querySelectorAll('style[data-test-palette]').forEach(el => el.remove())
  })

  describe('lifecycle', () => {
    it('should create a style element when onMounted is triggered', async () => {
      const palette = ref(createMockSemanticPalette())

      usePaletteStyles(palette)

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())
      await nextTick()

      const styleEl = document.querySelector('style[data-hero-palette]')
      expect(styleEl).not.toBeNull()
      expect(styleEl?.textContent).toContain('.hero-palette-preview')
    })

    it('should remove the style element when onUnmounted is triggered', async () => {
      const palette = ref(createMockSemanticPalette())

      usePaletteStyles(palette)

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())
      await nextTick()

      expect(document.querySelector('style[data-hero-palette]')).not.toBeNull()

      // Simulate unmount
      unmountedCallbacks.forEach(cb => cb())
      await nextTick()

      expect(document.querySelector('style[data-hero-palette]')).toBeNull()
    })
  })

  describe('style content', () => {
    it('should inject CSS variables for the semantic palette', async () => {
      const palette = ref(createMockSemanticPalette())

      usePaletteStyles(palette)

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())
      await nextTick()

      const styleEl = document.querySelector('style[data-hero-palette]')
      const content = styleEl?.textContent ?? ''

      // Check for CSS custom properties
      expect(content).toContain('--context-canvas-surface')
      expect(content).toContain('--context-canvas-title')
      expect(content).toContain('.hero-palette-preview')
    })

    it('should update styles when palette changes', async () => {
      const palette = ref(createMockSemanticPalette())

      const { updateStyles } = usePaletteStyles(palette)

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())
      await nextTick()

      const styleEl = document.querySelector('style[data-hero-palette]')
      const initialContent = styleEl?.textContent ?? ''

      // Update the palette with a new canvas surface color
      palette.value = {
        ...createMockSemanticPalette(),
        context: {
          ...createMockSemanticPalette().context,
          canvas: {
            ...createMockContextTokens(),
            surface: '#f00',
          },
        },
      }

      // Manually trigger update (watch doesn't automatically run in tests)
      updateStyles()
      await nextTick()

      const updatedContent = styleEl?.textContent ?? ''
      expect(updatedContent).toContain('#f00')
      expect(updatedContent).not.toBe(initialContent)
    })
  })

  describe('options', () => {
    it('should use custom CSS selector when provided', async () => {
      const palette = ref(createMockSemanticPalette())

      usePaletteStyles(palette, { cssSelector: '.custom-scope' })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())
      await nextTick()

      const styleEl = document.querySelector('style[data-hero-palette]')
      const content = styleEl?.textContent ?? ''

      expect(content).toContain('.custom-scope')
      expect(content).not.toContain('.hero-palette-preview')
    })

    it('should use custom data attribute when provided', async () => {
      const palette = ref(createMockSemanticPalette())

      usePaletteStyles(palette, { dataAttribute: 'data-test-palette' })

      // Simulate mount
      mountedCallbacks.forEach(cb => cb())
      await nextTick()

      expect(document.querySelector('style[data-test-palette]')).not.toBeNull()
      expect(document.querySelector('style[data-hero-palette]')).toBeNull()
    })
  })

  describe('return value', () => {
    it('should return updateStyles function', () => {
      const palette = ref(createMockSemanticPalette())

      const result = usePaletteStyles(palette)

      expect(result).toBeDefined()
      expect(typeof result.updateStyles).toBe('function')
    })
  })
})
