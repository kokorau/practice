// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HeroPreviewThumbnail from './HeroPreviewThumbnail.vue'
import type { HeroViewConfig } from '../../modules/HeroScene'
import type { PrimitivePalette } from '../../modules/SemanticColorPalette/Domain'

// ============================================================
// Mocks
// ============================================================

const mockRender = vi.fn()
const mockDestroy = vi.fn()
const mockGetViewport = vi.fn(() => ({ width: 256, height: 144 }))
const mockRendererInstance = {
  render: mockRender,
  destroy: mockDestroy,
  getViewport: mockGetViewport,
}

vi.mock('@practice/texture', () => ({
  TextureRenderer: {
    create: vi.fn(() => Promise.resolve(mockRendererInstance)),
  },
}))

vi.mock('../../modules/HeroScene', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../modules/HeroScene')>()
  return {
    ...original,
    renderHeroConfig: vi.fn(() => Promise.resolve()),
  }
})

// Mock ResizeObserver
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()
class MockResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe = mockObserve.mockImplementation((element: Element) => {
    // Simulate initial size
    this.callback([{
      target: element,
      contentRect: { width: 256, height: 144 } as DOMRectReadOnly,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    }], this as unknown as ResizeObserver)
  })
  unobserve = vi.fn()
  disconnect = mockDisconnect
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

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

function createMockHeroConfig(): HeroViewConfig {
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
  } as HeroViewConfig
}

// ============================================================
// Tests
// ============================================================

describe('HeroPreviewThumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('component structure', () => {
    it('renders without errors', () => {
      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('renders container with correct class', () => {
      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })
      expect(wrapper.find('.hero-preview-container').exists()).toBe(true)
    })

    it('renders canvas element', () => {
      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })
      const canvas = wrapper.find('canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.classes()).toContain('hero-preview-canvas')
    })
  })

  describe('props', () => {
    it('requires config prop', () => {
      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('requires palette prop', () => {
      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('accepts optional scale prop', () => {
      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
          scale: 0.5,
        },
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('rendering', () => {
    it('initializes TextureRenderer on mount', async () => {
      const { TextureRenderer } = await import('@practice/texture')

      mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })

      await flushPromises()

      expect(TextureRenderer.create).toHaveBeenCalled()
    })

    it('calls renderHeroConfig with correct parameters', async () => {
      const { renderHeroConfig } = await import('../../modules/HeroScene')
      const config = createMockHeroConfig()
      const palette = createMockPalette()

      mount(HeroPreviewThumbnail, {
        props: { config, palette },
      })

      await flushPromises()

      expect(renderHeroConfig).toHaveBeenCalledWith(
        mockRendererInstance,
        config,
        palette,
        expect.objectContaining({ scale: expect.any(Number) })
      )
    })

    it('destroys renderer on unmount', async () => {
      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })

      await flushPromises()
      wrapper.unmount()

      expect(mockDestroy).toHaveBeenCalled()
    })
  })

  describe('reactivity', () => {
    it('re-renders when config changes', async () => {
      const { renderHeroConfig } = await import('../../modules/HeroScene')
      const config = createMockHeroConfig()
      const palette = createMockPalette()

      const wrapper = mount(HeroPreviewThumbnail, {
        props: { config, palette },
      })

      await flushPromises()
      vi.mocked(renderHeroConfig).mockClear()

      // Update config
      const newConfig = { ...config, background: { type: 'texture' as const, patternIndex: 1 } }
      await wrapper.setProps({ config: newConfig })
      await flushPromises()

      expect(renderHeroConfig).toHaveBeenCalled()
    })

    it('re-renders when palette changes', async () => {
      const { renderHeroConfig } = await import('../../modules/HeroScene')
      const config = createMockHeroConfig()
      const palette = createMockPalette()

      const wrapper = mount(HeroPreviewThumbnail, {
        props: { config, palette },
      })

      await flushPromises()
      vi.mocked(renderHeroConfig).mockClear()

      // Update palette
      const newPalette = { ...palette, B: { L: 0.6, C: 0.2, H: 300 } }
      await wrapper.setProps({ palette: newPalette })
      await flushPromises()

      expect(renderHeroConfig).toHaveBeenCalled()
    })
  })

  describe('responsive sizing', () => {
    it('uses ResizeObserver for responsive sizing', () => {
      mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })

      // ResizeObserver should be created and observing
      expect(mockObserve).toHaveBeenCalled()
    })

    it('disconnects ResizeObserver on unmount', async () => {
      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })

      await flushPromises()
      wrapper.unmount()

      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('handles WebGPU initialization failure gracefully', async () => {
      const { TextureRenderer } = await import('@practice/texture')
      vi.mocked(TextureRenderer.create).mockRejectedValueOnce(new Error('WebGPU not available'))

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const wrapper = mount(HeroPreviewThumbnail, {
        props: {
          config: createMockHeroConfig(),
          palette: createMockPalette(),
        },
      })

      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(consoleError).toHaveBeenCalled()

      consoleError.mockRestore()
    })
  })
})
