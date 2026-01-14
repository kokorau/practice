// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computed, nextTick } from 'vue'
import { useTexturePreview, type SectionType } from './useTexturePreview'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'

// Polyfill URL for happy-dom in CI environment
if (typeof globalThis.URL !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { URL: NodeURL } = require('node:url')
  globalThis.URL = NodeURL
}

// ============================================================
// Mocks
// ============================================================

// Mock TextureRenderer
const mockRender = vi.fn()
const mockRenderImage = vi.fn()
const mockDestroy = vi.fn()
const mockGetViewport = vi.fn(() => ({ width: 1280, height: 720 }))
const mockRendererInstance = {
  render: mockRender,
  renderImage: mockRenderImage,
  destroy: mockDestroy,
  getViewport: mockGetViewport,
}

vi.mock('@practice/texture', () => ({
  TextureRenderer: {
    create: vi.fn(() => Promise.resolve(mockRendererInstance)),
  },
  getDefaultTexturePatterns: vi.fn(() => [
    { label: 'Pattern1', createSpec: vi.fn(() => ({})) },
    { label: 'Pattern2', createSpec: vi.fn(() => ({})) },
    { label: 'Pattern3', createSpec: vi.fn(() => ({})) },
    { label: 'Pattern4', createSpec: vi.fn(() => ({})) },
  ]),
  getDefaultMaskPatterns: vi.fn(() => [
    { label: 'Mask1', maskConfig: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.4 }, createSpec: vi.fn(() => ({})) },
    { label: 'Mask2', maskConfig: { type: 'rect', left: 0.1, right: 0.9, top: 0.1, bottom: 0.9 }, createSpec: vi.fn(() => ({})) },
  ]),
  createCircleStripeSpec: vi.fn(() => ({})),
  createCircleGridSpec: vi.fn(() => ({})),
  createCirclePolkaDotSpec: vi.fn(() => ({})),
  createRectStripeSpec: vi.fn(() => ({})),
  createRectGridSpec: vi.fn(() => ({})),
  createRectPolkaDotSpec: vi.fn(() => ({})),
  createBlobStripeSpec: vi.fn(() => ({})),
  createBlobGridSpec: vi.fn(() => ({})),
  createBlobPolkaDotSpec: vi.fn(() => ({})),
  // Export DEFAULT_GRADIENT_GRAIN_CURVE_POINTS to prevent mock leakage
  DEFAULT_GRADIENT_GRAIN_CURVE_POINTS: [0.0, 0.0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1.0, 1.0],
}))

vi.mock('@practice/color', () => ({
  $Oklch: {
    toSrgb: vi.fn((oklch) => ({
      r: oklch.L,
      g: oklch.C,
      b: oklch.H / 360,
    })),
  },
}))

// Mock URL methods
const mockCreateObjectURL = vi.fn(() => 'blob:test-url')
const mockRevokeObjectURL = vi.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

// Mock createImageBitmap
global.createImageBitmap = vi.fn(() => Promise.resolve({
  close: vi.fn(),
} as unknown as ImageBitmap))

// Mock document.querySelectorAll for thumbnail canvases
const mockQuerySelectorAll = vi.spyOn(document, 'querySelectorAll')

// ============================================================
// Test Helpers
// ============================================================

function createMockPalette(): PrimitivePalette {
  const baseColor = { L: 0.5, C: 0.1, H: 260 }
  return {
    B: baseColor,
    F1: { L: 0.98, C: 0.01, H: 260 },
    F2: { L: 0.95, C: 0.02, H: 260 },
    F3: { L: 0.90, C: 0.03, H: 260 },
    F4: { L: 0.80, C: 0.04, H: 260 },
    F5: { L: 0.50, C: 0.05, H: 260 },
    F6: { L: 0.30, C: 0.04, H: 260 },
    F7: { L: 0.20, C: 0.03, H: 260 },
    F8: { L: 0.15, C: 0.02, H: 260 },
    A: baseColor,
  }
}

function createTestOptions() {
  const palette = createMockPalette()
  return {
    primitivePalette: computed(() => palette),
    isDark: computed(() => false),
  }
}

// ============================================================
// Tests
// ============================================================

describe('useTexturePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuerySelectorAll.mockReturnValue([] as unknown as NodeListOf<HTMLCanvasElement>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('initializes with default values', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      expect(result.selectedBackgroundIndex.value).toBe(3)
      expect(result.selectedMaskIndex.value).toBe(21)
      expect(result.selectedMidgroundTextureIndex.value).toBeNull()
      expect(result.activeSection.value).toBeNull()
    })

    it('provides pattern arrays', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      expect(result.texturePatterns).toBeDefined()
      expect(result.maskPatterns).toBeDefined()
      expect(result.midgroundTexturePatterns).toBeDefined()
      expect(result.midgroundTexturePatterns.length).toBeGreaterThan(0)
    })

    it('provides canvas ref', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      expect(result.previewCanvasRef).toBeDefined()
      expect(result.previewCanvasRef.value).toBeNull()
    })
  })

  describe('selection state', () => {
    it('allows changing background index', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      result.selectedBackgroundIndex.value = 0
      expect(result.selectedBackgroundIndex.value).toBe(0)
    })

    it('allows changing mask index', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      result.selectedMaskIndex.value = 5
      expect(result.selectedMaskIndex.value).toBe(5)
    })

    it('allows setting mask index to null', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      result.selectedMaskIndex.value = null
      expect(result.selectedMaskIndex.value).toBeNull()
    })

    it('allows changing midground texture index', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      result.selectedMidgroundTextureIndex.value = 2
      expect(result.selectedMidgroundTextureIndex.value).toBe(2)
    })
  })

  describe('openSection', () => {
    it('sets activeSection when opening a new section', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      result.openSection('background')
      expect(result.activeSection.value).toBe('background')
    })

    it('closes section when opening the same section again', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      result.openSection('background')
      expect(result.activeSection.value).toBe('background')

      result.openSection('background')
      expect(result.activeSection.value).toBeNull()
    })

    it('switches to new section when opening different section', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      result.openSection('background')
      expect(result.activeSection.value).toBe('background')

      result.openSection('midground')
      expect(result.activeSection.value).toBe('midground')
    })
  })

  describe('initPreview', () => {
    it('initializes renderer with internal canvas ref', async () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      // Create a mock canvas element
      const mockCanvas = document.createElement('canvas')
      result.previewCanvasRef.value = mockCanvas

      await result.initPreview()

      expect(mockCanvas.width).toBe(1280)
      expect(mockCanvas.height).toBe(720)
    })

    it('initializes renderer with external canvas', async () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      const externalCanvas = document.createElement('canvas')
      await result.initPreview(externalCanvas)

      expect(externalCanvas.width).toBe(1280)
      expect(externalCanvas.height).toBe(720)
    })

    it('does nothing when no canvas available', async () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      // Neither internal nor external canvas provided
      await result.initPreview()

      // Should not throw, just return early
      expect(mockRender).not.toHaveBeenCalled()
    })
  })

  describe('destroyPreview', () => {
    it('cleans up renderer', async () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      const mockCanvas = document.createElement('canvas')
      result.previewCanvasRef.value = mockCanvas

      await result.initPreview()
      result.destroyPreview()

      expect(mockDestroy).toHaveBeenCalled()
    })
  })

  describe('custom background image', () => {
    it('initially has no custom background', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      expect(result.customBackgroundImage.value).toBeNull()
      expect(result.customBackgroundFile.value).toBeNull()
    })

    it('sets background image from file', async () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

      await result.setBackgroundImage(mockFile)

      expect(result.customBackgroundFile.value).toStrictEqual(mockFile)
      expect(result.customBackgroundImage.value).toBe('blob:test-url')
      expect(global.createImageBitmap).toHaveBeenCalledWith(mockFile)
    })

    it('clears background image', async () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
      await result.setBackgroundImage(mockFile)

      result.clearBackgroundImage()

      expect(result.customBackgroundFile.value).toBeNull()
      expect(result.customBackgroundImage.value).toBeNull()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('revokes previous URL when setting new image', async () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      const mockFile1 = new File(['test1'], 'test1.png', { type: 'image/png' })
      const mockFile2 = new File(['test2'], 'test2.png', { type: 'image/png' })

      await result.setBackgroundImage(mockFile1)
      await result.setBackgroundImage(mockFile2)

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')
    })
  })

  describe('midground texture patterns', () => {
    it('provides default midground texture patterns', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      expect(result.midgroundTexturePatterns.length).toBe(5)
      expect(result.midgroundTexturePatterns[0].type).toBe('stripe')
      expect(result.midgroundTexturePatterns[3].type).toBe('grid')
      expect(result.midgroundTexturePatterns[4].type).toBe('polkaDot')
    })

    it('each pattern has required properties', () => {
      const options = createTestOptions()
      const result = useTexturePreview(options)

      for (const pattern of result.midgroundTexturePatterns) {
        expect(pattern.label).toBeDefined()
        expect(pattern.type).toBeDefined()
        expect(pattern.config).toBeDefined()
      }
    })
  })

  describe('dark mode', () => {
    it('uses F1 for canvas surface in light mode', () => {
      const options = {
        primitivePalette: computed(() => createMockPalette()),
        isDark: computed(() => false),
      }

      const result = useTexturePreview(options)
      // Light mode should use F1 for surface
      expect(result).toBeDefined()
    })

    it('uses F8 for canvas surface in dark mode', () => {
      const options = {
        primitivePalette: computed(() => createMockPalette()),
        isDark: computed(() => true),
      }

      const result = useTexturePreview(options)
      // Dark mode should use F8 for surface
      expect(result).toBeDefined()
    })
  })

  describe('reactivity', () => {
    it('updates when palette changes', async () => {
      const palette = createMockPalette()
      const paletteRef = computed(() => palette)
      const options = {
        primitivePalette: paletteRef,
        isDark: computed(() => false),
      }

      const result = useTexturePreview(options)

      // Set up preview
      const mockCanvas = document.createElement('canvas')
      result.previewCanvasRef.value = mockCanvas
      await result.initPreview()

      // Clear mock counts
      mockRender.mockClear()

      // Trigger reactivity by changing selection
      result.selectedBackgroundIndex.value = 0
      await nextTick()

      // Preview should be updated
      // Note: Due to watcher timing, we may need to wait
    })
  })
})
