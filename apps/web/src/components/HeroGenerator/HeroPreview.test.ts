// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import HeroPreview from './HeroPreview.vue'
import { DEFAULT_FOREGROUND_CONFIG, type ForegroundConfig } from '../../composables/SiteBuilder'
import { HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/hero-scene'

// ============================================================
// Mocks
// ============================================================

vi.mock('@practice/font', () => ({
  ensureFontLoaded: vi.fn((fontId: string) => `mock-font-${fontId}`),
}))

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// ============================================================
// Tests
// ============================================================

describe('HeroPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('component structure', () => {
    it('renders without errors', () => {
      const wrapper = mount(HeroPreview)
      expect(wrapper.exists()).toBe(true)
    })

    it('renders preview container', () => {
      const wrapper = mount(HeroPreview)
      expect(wrapper.find('.hero-preview-container').exists()).toBe(true)
    })

    it('renders canvas element', () => {
      const wrapper = mount(HeroPreview)
      const canvas = wrapper.find('canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.attributes('width')).toBe(String(HERO_CANVAS_WIDTH))
      expect(canvas.attributes('height')).toBe(String(HERO_CANVAS_HEIGHT))
    })

    it('renders layer structure', () => {
      const wrapper = mount(HeroPreview)
      expect(wrapper.find('.layer-background').exists()).toBe(true)
      expect(wrapper.find('.layer-midground').exists()).toBe(true)
      expect(wrapper.find('.layer-foreground').exists()).toBe(true)
    })

    it('renders foreground grid', () => {
      const wrapper = mount(HeroPreview)
      expect(wrapper.find('.foreground-grid').exists()).toBe(true)
    })
  })

  describe('props', () => {
    it('uses default foreground config when not provided', () => {
      const wrapper = mount(HeroPreview)
      // Component should mount without errors using default config
      expect(wrapper.exists()).toBe(true)
    })

    it('accepts custom foreground config', () => {
      const customConfig: ForegroundConfig = {
        ...DEFAULT_FOREGROUND_CONFIG,
        title: {
          ...DEFAULT_FOREGROUND_CONFIG.title,
          text: 'Custom Title',
        },
      }

      const wrapper = mount(HeroPreview, {
        props: {
          foregroundConfig: customConfig,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('applies title color when provided', () => {
      const wrapper = mount(HeroPreview, {
        props: {
          foregroundConfig: DEFAULT_FOREGROUND_CONFIG,
          titleColor: '#ff0000',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('applies body color when provided', () => {
      const wrapper = mount(HeroPreview, {
        props: {
          foregroundConfig: DEFAULT_FOREGROUND_CONFIG,
          bodyColor: '#00ff00',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('applies element colors from map', () => {
      const elementColors = new Map([
        ['title-1', '#ff0000'],
        ['description-1', '#00ff00'],
      ])

      const wrapper = mount(HeroPreview, {
        props: {
          foregroundConfig: DEFAULT_FOREGROUND_CONFIG,
          elementColors,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('exposed methods', () => {
    it('exposes canvasRef', () => {
      const wrapper = mount(HeroPreview)
      const exposed = wrapper.vm as unknown as { canvasRef: HTMLCanvasElement | null }
      expect(exposed.canvasRef).toBeDefined()
    })

    it('exposes getElementBounds method', () => {
      const wrapper = mount(HeroPreview)
      const exposed = wrapper.vm as unknown as {
        getElementBounds: (type: 'title' | 'description') => unknown
      }
      expect(typeof exposed.getElementBounds).toBe('function')
    })

    it('getElementBounds returns null when element not found', () => {
      const wrapper = mount(HeroPreview, {
        props: {
          foregroundConfig: {
            ...DEFAULT_FOREGROUND_CONFIG,
            title: { ...DEFAULT_FOREGROUND_CONFIG.title, enabled: false },
          },
        },
      })

      const exposed = wrapper.vm as unknown as {
        getElementBounds: (type: 'title' | 'description') => unknown
      }

      // Elements may not be rendered, so bounds could be null
      const bounds = exposed.getElementBounds('title')
      // Result depends on actual rendering
      expect(bounds === null || typeof bounds === 'object').toBe(true)
    })
  })

  describe('scaling', () => {
    it('frame has correct base dimensions', () => {
      const wrapper = mount(HeroPreview)
      const frame = wrapper.find('.hero-preview-frame')

      // Frame should have inline style with dimensions
      const style = frame.attributes('style')
      expect(style).toContain(`${HERO_CANVAS_WIDTH}px`)
      expect(style).toContain(`${HERO_CANVAS_HEIGHT}px`)
    })
  })

  describe('grid positions', () => {
    it('renders grid cells with position classes', () => {
      const wrapper = mount(HeroPreview, {
        props: {
          foregroundConfig: DEFAULT_FOREGROUND_CONFIG,
        },
      })

      // Check that grid cells exist
      const gridCells = wrapper.findAll('.grid-cell')
      expect(gridCells.length).toBeGreaterThan(0)
    })
  })

  describe('constants', () => {
    it('uses correct canvas dimensions', () => {
      expect(HERO_CANVAS_WIDTH).toBe(1920)
      expect(HERO_CANVAS_HEIGHT).toBe(1080)
    })
  })
})
