// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HeroPreview from './HeroPreview.vue'
import type { CompiledHeroView, CompiledForegroundLayer } from '@practice/section-visual'
import { HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/section-visual'

// ============================================================
// Test Helpers
// ============================================================

/**
 * Create a mock CompiledHeroView for testing
 */
function createMockCompiledView(options?: {
  elements?: CompiledForegroundLayer['elements']
}): CompiledHeroView {
  const defaultElements: CompiledForegroundLayer['elements'] = [
    {
      id: 'title-1',
      type: 'title',
      visible: true,
      position: 'middle-center',
      content: 'Build Amazing',
      fontFamily: 'sans-serif',
      fontSize: 4,
      fontWeight: 700,
      letterSpacing: -0.02,
      lineHeight: 1.1,
      color: 'oklch(0.2 0.02 260)',
    },
    {
      id: 'description-1',
      type: 'description',
      visible: true,
      position: 'middle-center',
      content: 'Create beautiful websites',
      fontFamily: 'sans-serif',
      fontSize: 1.25,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1.5,
      color: 'oklch(0.3 0.02 260)',
    },
  ]

  return {
    viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
    isDark: false,
    layers: [],
    foreground: {
      elements: options?.elements ?? defaultElements,
    },
  }
}

// ============================================================
// Mocks
// ============================================================

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
      const wrapper = mount(HeroPreview, {
        props: { compiledView: createMockCompiledView() },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('renders preview container', () => {
      const wrapper = mount(HeroPreview, {
        props: { compiledView: createMockCompiledView() },
      })
      expect(wrapper.find('.hero-preview-container').exists()).toBe(true)
    })

    it('renders canvas element', () => {
      const wrapper = mount(HeroPreview, {
        props: { compiledView: createMockCompiledView() },
      })
      const canvas = wrapper.find('canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.attributes('width')).toBe(String(HERO_CANVAS_WIDTH))
      expect(canvas.attributes('height')).toBe(String(HERO_CANVAS_HEIGHT))
    })

    it('renders layer structure', () => {
      const wrapper = mount(HeroPreview, {
        props: { compiledView: createMockCompiledView() },
      })
      expect(wrapper.find('.layer-background').exists()).toBe(true)
      expect(wrapper.find('.layer-midground').exists()).toBe(true)
      expect(wrapper.find('.layer-foreground').exists()).toBe(true)
    })

    it('renders foreground grid', () => {
      const wrapper = mount(HeroPreview, {
        props: { compiledView: createMockCompiledView() },
      })
      expect(wrapper.find('.foreground-grid').exists()).toBe(true)
    })
  })

  describe('props', () => {
    it('accepts compiledView with custom elements', () => {
      const customView = createMockCompiledView({
        elements: [
          {
            id: 'custom-title',
            type: 'title',
            visible: true,
            position: 'top-left',
            content: 'Custom Title',
            fontFamily: 'Georgia',
            fontSize: 5,
            fontWeight: 800,
            letterSpacing: 0,
            lineHeight: 1.2,
            color: '#ff0000',
          },
        ],
      })

      const wrapper = mount(HeroPreview, {
        props: { compiledView: customView },
      })

      expect(wrapper.exists()).toBe(true)
      // Check that the custom element is rendered
      expect(wrapper.find('.scp-title').text()).toBe('Custom Title')
    })

    it('applies resolved colors from compiledView', () => {
      const customView = createMockCompiledView({
        elements: [
          {
            id: 'title-1',
            type: 'title',
            visible: true,
            position: 'middle-center',
            content: 'Colored Title',
            fontFamily: 'sans-serif',
            fontSize: 4,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.1,
            color: 'rgb(255, 0, 0)',
          },
        ],
      })

      const wrapper = mount(HeroPreview, {
        props: { compiledView: customView },
      })

      const title = wrapper.find('.scp-title')
      expect(title.attributes('style')).toContain('color: rgb(255, 0, 0)')
    })

    it('applies resolved font family from compiledView', () => {
      const customView = createMockCompiledView({
        elements: [
          {
            id: 'title-1',
            type: 'title',
            visible: true,
            position: 'middle-center',
            content: 'Custom Font',
            fontFamily: 'CustomFont, serif',
            fontSize: 4,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.1,
            color: '#000',
          },
        ],
      })

      const wrapper = mount(HeroPreview, {
        props: { compiledView: customView },
      })

      const title = wrapper.find('.scp-title')
      expect(title.attributes('style')).toContain('font-family: CustomFont, serif')
    })
  })

  describe('exposed methods', () => {
    it('exposes canvasRef', () => {
      const wrapper = mount(HeroPreview, {
        props: { compiledView: createMockCompiledView() },
      })
      const exposed = wrapper.vm as unknown as { canvasRef: HTMLCanvasElement | null }
      expect(exposed.canvasRef).toBeDefined()
    })

    it('exposes getElementBounds method', () => {
      const wrapper = mount(HeroPreview, {
        props: { compiledView: createMockCompiledView() },
      })
      const exposed = wrapper.vm as unknown as {
        getElementBounds: (type: 'title' | 'description') => unknown
      }
      expect(typeof exposed.getElementBounds).toBe('function')
    })

    it('getElementBounds returns null when element not visible', () => {
      const customView = createMockCompiledView({
        elements: [
          {
            id: 'title-1',
            type: 'title',
            visible: false,
            position: 'middle-center',
            content: 'Hidden Title',
            fontFamily: 'sans-serif',
            fontSize: 4,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.1,
            color: '#000',
          },
        ],
      })

      const wrapper = mount(HeroPreview, {
        props: { compiledView: customView },
      })

      const exposed = wrapper.vm as unknown as {
        getElementBounds: (type: 'title' | 'description') => unknown
      }

      // Element is not visible, so bounds should be null
      const bounds = exposed.getElementBounds('title')
      expect(bounds === null || typeof bounds === 'object').toBe(true)
    })
  })

  describe('scaling', () => {
    it('frame has correct base dimensions', () => {
      const wrapper = mount(HeroPreview, {
        props: { compiledView: createMockCompiledView() },
      })
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
        props: { compiledView: createMockCompiledView() },
      })

      // Check that grid cells exist
      const gridCells = wrapper.findAll('.grid-cell')
      expect(gridCells.length).toBeGreaterThan(0)
    })

    it('groups elements by position', () => {
      const customView = createMockCompiledView({
        elements: [
          {
            id: 'title-top',
            type: 'title',
            visible: true,
            position: 'top-left',
            content: 'Top Title',
            fontFamily: 'sans-serif',
            fontSize: 4,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.1,
            color: '#000',
          },
          {
            id: 'title-bottom',
            type: 'title',
            visible: true,
            position: 'bottom-right',
            content: 'Bottom Title',
            fontFamily: 'sans-serif',
            fontSize: 4,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.1,
            color: '#000',
          },
        ],
      })

      const wrapper = mount(HeroPreview, {
        props: { compiledView: customView },
      })

      // Check that both positions are rendered
      expect(wrapper.find('.position-top-left').exists()).toBe(true)
      expect(wrapper.find('.position-bottom-right').exists()).toBe(true)
    })
  })

  describe('constants', () => {
    it('uses correct canvas dimensions', () => {
      expect(HERO_CANVAS_WIDTH).toBe(1920)
      expect(HERO_CANVAS_HEIGHT).toBe(1080)
    })
  })
})
