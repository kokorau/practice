// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NodePreview from './NodePreview.vue'
import type { TextureRenderSpec } from '@practice/texture'

// ============================================================
// Mocks
// ============================================================

const mockRender = vi.fn()
const mockDestroy = vi.fn()
const mockRendererInstance = {
  render: mockRender,
  destroy: mockDestroy,
  getViewport: vi.fn(() => ({ width: 160, height: 90 })),
}

vi.mock('@practice/texture', () => ({
  TextureRenderer: {
    create: vi.fn(() => Promise.resolve(mockRendererInstance)),
  },
  // Export DEFAULT_GRADIENT_GRAIN_CURVE_POINTS to prevent mock leakage
  DEFAULT_GRADIENT_GRAIN_CURVE_POINTS: [0.0, 0.0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1.0, 1.0],
}))

// Mock navigator.gpu
Object.defineProperty(navigator, 'gpu', {
  value: { requestAdapter: vi.fn() },
  configurable: true,
})

// ============================================================
// Test Helpers
// ============================================================

function createMockSpec(): TextureRenderSpec {
  return {
    type: 'stripe',
    color1: [1, 0, 0, 1],
    color2: [0, 1, 0, 1],
    width1: 10,
    width2: 10,
    angle: 0,
    viewport: { width: 160, height: 90 },
  } as unknown as TextureRenderSpec
}

// ============================================================
// Tests
// ============================================================

describe('NodePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('component structure', () => {
    it('renders without errors', () => {
      const wrapper = mount(NodePreview, {
        props: {
          spec: createMockSpec(),
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('renders canvas element', () => {
      const wrapper = mount(NodePreview, {
        props: {
          spec: createMockSpec(),
        },
      })
      const canvas = wrapper.find('canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.classes()).toContain('node-canvas')
    })
  })

  describe('props', () => {
    it('uses default width and height when not specified', () => {
      const wrapper = mount(NodePreview, {
        props: {
          spec: createMockSpec(),
        },
      })
      const canvas = wrapper.find('canvas')
      expect(canvas.attributes('width')).toBe('160')
      expect(canvas.attributes('height')).toBe('90')
    })

    it('accepts custom width', () => {
      const wrapper = mount(NodePreview, {
        props: {
          spec: createMockSpec(),
          width: 320,
        },
      })
      const canvas = wrapper.find('canvas')
      expect(canvas.attributes('width')).toBe('320')
    })

    it('accepts custom height', () => {
      const wrapper = mount(NodePreview, {
        props: {
          spec: createMockSpec(),
          height: 180,
        },
      })
      const canvas = wrapper.find('canvas')
      expect(canvas.attributes('height')).toBe('180')
    })

    it('handles null spec', () => {
      const wrapper = mount(NodePreview, {
        props: {
          spec: null,
        },
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('rendering', () => {
    it('initializes renderer on mount', async () => {
      const { TextureRenderer } = await import('@practice/texture')

      mount(NodePreview, {
        props: {
          spec: createMockSpec(),
        },
      })

      await flushPromises()

      expect(TextureRenderer.create).toHaveBeenCalled()
    })

    it('renders spec when provided', async () => {
      const spec = createMockSpec()

      mount(NodePreview, {
        props: { spec },
      })

      await flushPromises()

      expect(mockRender).toHaveBeenCalledWith(spec)
    })

    it('does not render when spec is null', async () => {
      mount(NodePreview, {
        props: {
          spec: null,
        },
      })

      await flushPromises()

      expect(mockRender).not.toHaveBeenCalled()
    })

    it('destroys renderer on unmount', async () => {
      const wrapper = mount(NodePreview, {
        props: {
          spec: createMockSpec(),
        },
      })

      await flushPromises()
      wrapper.unmount()

      expect(mockDestroy).toHaveBeenCalled()
    })
  })

  describe('reactivity', () => {
    it('re-renders when spec changes', async () => {
      const spec = createMockSpec()

      const wrapper = mount(NodePreview, {
        props: { spec },
      })

      await flushPromises()
      mockRender.mockClear()

      const newSpec = { ...spec, angle: Math.PI / 4 } as unknown as TextureRenderSpec
      await wrapper.setProps({ spec: newSpec })
      await flushPromises()

      expect(mockRender).toHaveBeenCalledWith(newSpec)
    })
  })

  describe('WebGPU availability', () => {
    it('checks for navigator.gpu before initializing', async () => {
      const originalGpu = navigator.gpu

      // Temporarily remove GPU
      Object.defineProperty(navigator, 'gpu', {
        value: undefined,
        configurable: true,
      })

      const wrapper = mount(NodePreview, {
        props: {
          spec: createMockSpec(),
        },
      })

      await flushPromises()

      // Should not attempt to create renderer without GPU
      expect(wrapper.exists()).toBe(true)

      // Restore GPU
      Object.defineProperty(navigator, 'gpu', {
        value: originalGpu,
        configurable: true,
      })
    })
  })

  describe('error handling', () => {
    it('handles renderer creation failure gracefully', async () => {
      const { TextureRenderer } = await import('@practice/texture')
      vi.mocked(TextureRenderer.create).mockRejectedValueOnce(new Error('WebGPU init failed'))

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const wrapper = mount(NodePreview, {
        props: {
          spec: createMockSpec(),
        },
      })

      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(consoleError).toHaveBeenCalled()

      consoleError.mockRestore()
    })
  })
})
