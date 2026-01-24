import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useBatchPreviewRenderer } from './useBatchPreviewRenderer'
import type { HeroViewConfig } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'

// ============================================================
// Mocks
// ============================================================

// Mock TextureRenderer instance (hoisted to avoid reference errors)
const { mockCreateSharedRenderer, mockRendererInstance, mockDestroy } = vi.hoisted(() => {
  const mockRender = vi.fn()
  const mockDestroy = vi.fn()
  const mockRendererInstance = {
    render: mockRender,
    destroy: mockDestroy,
    getViewport: vi.fn(() => ({ width: 256, height: 144 })),
  }
  const mockCreateSharedRenderer = vi.fn(() => Promise.resolve(mockRendererInstance))
  return { mockCreateSharedRenderer, mockRendererInstance, mockDestroy }
})

// Mock createSharedRenderer
vi.mock('../services/createSharedRenderer', () => ({
  createSharedRenderer: mockCreateSharedRenderer,
}))

// Mock renderHeroConfig
vi.mock('@practice/section-visual', async (importOriginal) => {
  const original = await importOriginal<typeof import('@practice/section-visual')>()
  return {
    ...original,
    renderHeroConfig: vi.fn(() => Promise.resolve()),
  }
})

// Mock OffscreenCanvas
class MockOffscreenCanvas {
  width: number
  height: number
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }
  convertToBlob = vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' })))
  getContext = vi.fn()
}
global.OffscreenCanvas = MockOffscreenCanvas as unknown as typeof OffscreenCanvas

// Mock URL.createObjectURL / revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:test-url')
const mockRevokeObjectURL = vi.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

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

function createMockHeroConfig(overrides: Partial<HeroViewConfig> = {}): HeroViewConfig {
  return {
    background: {
      type: 'texture',
      patternIndex: 0,
    },
    mask: null,
    filter: {
      enabled: false,
      type: 'none',
      params: {},
    },
    vignette: {
      enabled: false,
      shape: 'ellipse',
      intensity: 0.5,
      softness: 0.4,
      color: [0, 0, 0, 1],
      radius: 0.8,
      centerX: 0.5,
      centerY: 0.5,
      aspectRatio: 1,
    },
    ...overrides,
  } as HeroViewConfig
}

// ============================================================
// Tests
// ============================================================

describe('useBatchPreviewRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('initializes with empty previews array', () => {
      const configs = ref<(HeroViewConfig | null)[]>([])
      const palette = ref<PrimitivePalette | undefined>(undefined)

      const { previews, isRendering, error } = useBatchPreviewRenderer(configs, palette)

      expect(previews.value).toEqual([])
      expect(isRendering.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('does not render when palette is undefined', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([createMockHeroConfig()])
      const palette = ref<PrimitivePalette | undefined>(undefined)

      const { previews } = useBatchPreviewRenderer(configs, palette)
      await nextTick()

      expect(previews.value).toEqual([])
    })

    it('does not render when configs array is empty', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { previews } = useBatchPreviewRenderer(configs, palette)
      await nextTick()

      expect(previews.value).toEqual([])
    })
  })

  describe('rendering', () => {
    it('renders configs and produces preview URLs', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([createMockHeroConfig()])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { previews } = useBatchPreviewRenderer(configs, palette)

      // Wait for rendering
      await vi.waitFor(() => {
        expect(previews.value.length).toBe(1)
      })

      expect(previews.value[0]).toBe('blob:test-url')
    })

    it('handles null configs in the array', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([
        createMockHeroConfig(),
        null,
        createMockHeroConfig(),
      ])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { previews } = useBatchPreviewRenderer(configs, palette)

      await vi.waitFor(() => {
        expect(previews.value.length).toBe(3)
      })

      expect(previews.value[0]).toBe('blob:test-url')
      expect(previews.value[1]).toBeNull()
      expect(previews.value[2]).toBe('blob:test-url')
    })

    it('re-renders when configs change', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([createMockHeroConfig()])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { previews } = useBatchPreviewRenderer(configs, palette)

      await vi.waitFor(() => {
        expect(previews.value.length).toBe(1)
      })

      // Add another config
      configs.value = [createMockHeroConfig(), createMockHeroConfig()]

      await vi.waitFor(() => {
        expect(previews.value.length).toBe(2)
      })
    })

    it('re-renders when palette changes', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([createMockHeroConfig()])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { previews } = useBatchPreviewRenderer(configs, palette)

      await vi.waitFor(() => {
        expect(previews.value.length).toBe(1)
      })

      mockCreateObjectURL.mockReturnValueOnce('blob:new-url')

      // Change palette
      palette.value = { ...createMockPalette(), B: { L: 0.6, C: 0.2, H: 300 } }

      await vi.waitFor(() => {
        expect(mockRevokeObjectURL).toHaveBeenCalled()
      })
    })
  })

  describe('options', () => {
    it('uses default dimensions when not specified', () => {
      const configs = ref<(HeroViewConfig | null)[]>([])
      const palette = ref<PrimitivePalette | undefined>(undefined)

      // Just verify it doesn't throw with default options
      const result = useBatchPreviewRenderer(configs, palette)
      expect(result).toBeDefined()
    })

    it('accepts custom width and height', () => {
      const configs = ref<(HeroViewConfig | null)[]>([])
      const palette = ref<PrimitivePalette | undefined>(undefined)

      const result = useBatchPreviewRenderer(configs, palette, {
        width: 512,
        height: 288,
      })

      expect(result).toBeDefined()
    })

    it('accepts custom scale', () => {
      const configs = ref<(HeroViewConfig | null)[]>([])
      const palette = ref<PrimitivePalette | undefined>(undefined)

      const result = useBatchPreviewRenderer(configs, palette, {
        scale: 0.5,
      })

      expect(result).toBeDefined()
    })
  })

  describe('refresh', () => {
    it('provides refresh function to manually trigger re-render', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([createMockHeroConfig()])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { refresh, previews } = useBatchPreviewRenderer(configs, palette)

      await vi.waitFor(() => {
        expect(previews.value.length).toBe(1)
      })

      const initialCallCount = mockCreateObjectURL.mock.calls.length

      await refresh()

      expect(mockCreateObjectURL.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  describe('destroy', () => {
    it('provides destroy function to clean up resources', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([createMockHeroConfig()])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { destroy, previews } = useBatchPreviewRenderer(configs, palette)

      await vi.waitFor(() => {
        expect(previews.value.length).toBe(1)
      })

      destroy()

      expect(previews.value).toEqual([])
      expect(mockDestroy).toHaveBeenCalled()
    })

    it('revokes all URLs on destroy', async () => {
      const configs = ref<(HeroViewConfig | null)[]>([
        createMockHeroConfig(),
        createMockHeroConfig(),
      ])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { destroy, previews } = useBatchPreviewRenderer(configs, palette)

      await vi.waitFor(() => {
        expect(previews.value.length).toBe(2)
      })

      destroy()

      // Should revoke URLs for both previews
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('sets error when WebGPU initialization fails', async () => {
      mockCreateSharedRenderer.mockRejectedValueOnce(new Error('WebGPU not available'))

      const configs = ref<(HeroViewConfig | null)[]>([createMockHeroConfig()])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { error } = useBatchPreviewRenderer(configs, palette)

      await vi.waitFor(() => {
        expect(error.value).not.toBeNull()
      })

      expect(error.value?.message).toBe('WebGPU not available')
    })

    it('does not retry after WebGPU initialization fails', async () => {
      mockCreateSharedRenderer.mockRejectedValueOnce(new Error('WebGPU not available'))

      const configs = ref<(HeroViewConfig | null)[]>([createMockHeroConfig()])
      const palette = ref<PrimitivePalette | undefined>(createMockPalette())

      const { error, refresh } = useBatchPreviewRenderer(configs, palette)

      await vi.waitFor(() => {
        expect(error.value).not.toBeNull()
      })

      // Reset mock to succeed
      mockCreateSharedRenderer.mockResolvedValue(mockRendererInstance)

      // Try to refresh - should not retry due to initFailed flag
      await refresh()

      // Should only have been called once (the failed attempt)
      expect(mockCreateSharedRenderer).toHaveBeenCalledTimes(1)
    })
  })
})
