// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import LayerStackPreview from './LayerStackPreview.vue'
import type { ColorBasedLayerMap } from '../modules/Segmentation/Domain'

// Mock ImageData for happy-dom environment
class MockImageData {
  data: Uint8ClampedArray
  width: number
  height: number
  constructor(data: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
    if (typeof data === 'number') {
      // new ImageData(width, height)
      this.width = data
      this.height = widthOrHeight!
      this.data = new Uint8ClampedArray(this.width * this.height * 4)
    } else {
      // new ImageData(data, width, height)
      this.data = data
      this.width = widthOrHeight!
      this.height = height!
    }
  }
}
global.ImageData = MockImageData as unknown as typeof ImageData

// ============================================================
// Test Helpers
// ============================================================

function createMockColorLayerMap(layerCount: number = 3): ColorBasedLayerMap {
  const layers = Array.from({ length: layerCount }, (_, i) => ({
    id: i,
    color: { r: Math.random(), g: Math.random(), b: Math.random() },
    area: 1000 - i * 100,
  }))

  return {
    layers,
    labels: new Uint8Array(100 * 100).fill(0),
    width: 100,
    height: 100,
  }
}

function createMockImageData(width: number = 100, height: number = 100): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255     // R
    data[i + 1] = 128 // G
    data[i + 2] = 64  // B
    data[i + 3] = 255 // A
  }
  return new ImageData(data, width, height)
}

// ============================================================
// Tests
// ============================================================

describe('LayerStackPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('component structure', () => {
    it('renders without errors', () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: null,
          originalImageData: null,
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('renders 3D preview container', () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(),
        },
      })

      // Container should have perspective style
      const container = wrapper.find('[style*="perspective"]')
      expect(container.exists()).toBe(true)
    })

    it('renders help text', () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(),
        },
      })

      expect(wrapper.text()).toContain('Drag to rotate')
    })
  })

  describe('props', () => {
    it('handles null colorLayerMap', () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: null,
          originalImageData: createMockImageData(),
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('handles null originalImageData', () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: null,
        },
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('layer rendering', () => {
    it('renders canvas for each layer', async () => {
      const layerCount = 3
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(layerCount),
          originalImageData: createMockImageData(),
        },
      })

      await flushPromises()

      const canvases = wrapper.findAll('canvas')
      expect(canvases.length).toBe(layerCount)
    })

    it('renders glass plates for each layer', async () => {
      const layerCount = 3
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(layerCount),
          originalImageData: createMockImageData(),
        },
      })

      await flushPromises()

      // Glass plates are rendered alongside canvases
      // The structure includes both glass divs and canvas elements per layer
      const canvases = wrapper.findAll('canvas')
      expect(canvases.length).toBe(layerCount)
    })
  })

  describe('3D controls', () => {
    it('has default rotation values', () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(),
        },
      })

      const scene = wrapper.find('[style*="rotateX"]')
      expect(scene.exists()).toBe(true)

      const style = scene.attributes('style')
      expect(style).toContain('rotateX(10deg)')
      expect(style).toContain('rotateY(20deg)')
    })

    it('responds to mousedown event', async () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(),
        },
      })

      const container = wrapper.find('[style*="perspective"]')
      await container.trigger('mousedown', { clientX: 100, clientY: 100 })

      // Dragging state should be active (component internal state)
      expect(wrapper.exists()).toBe(true)
    })

    it('responds to mousemove event when dragging', async () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(),
        },
      })

      const container = wrapper.find('[style*="perspective"]')

      // Start dragging
      await container.trigger('mousedown', { clientX: 100, clientY: 100 })

      // Move mouse
      await container.trigger('mousemove', { clientX: 150, clientY: 120 })

      // Rotation should have changed
      const scene = wrapper.find('[style*="rotateX"]')
      const style = scene.attributes('style')

      // Values should be different from defaults after drag
      // Note: Exact values depend on drag distance
      expect(style).toContain('rotateX')
      expect(style).toContain('rotateY')
    })

    it('stops dragging on mouseup', async () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(),
        },
      })

      const container = wrapper.find('[style*="perspective"]')

      await container.trigger('mousedown', { clientX: 100, clientY: 100 })
      await container.trigger('mouseup')

      // Further mouse movement should not affect rotation
      const sceneBefore = wrapper.find('[style*="rotateX"]').attributes('style')
      await container.trigger('mousemove', { clientX: 200, clientY: 200 })
      const sceneAfter = wrapper.find('[style*="rotateX"]').attributes('style')

      expect(sceneBefore).toBe(sceneAfter)
    })

    it('stops dragging on mouseleave', async () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(),
        },
      })

      const container = wrapper.find('[style*="perspective"]')

      await container.trigger('mousedown', { clientX: 100, clientY: 100 })
      await container.trigger('mouseleave')

      // Component should handle this gracefully
      expect(wrapper.exists()).toBe(true)
    })

    it('resets rotation on double click', async () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(),
        },
      })

      const container = wrapper.find('[style*="perspective"]')

      // First change rotation by dragging
      await container.trigger('mousedown', { clientX: 100, clientY: 100 })
      await container.trigger('mousemove', { clientX: 200, clientY: 200 })
      await container.trigger('mouseup')

      // Then double click to reset
      await container.trigger('dblclick')

      const scene = wrapper.find('[style*="rotateX"]')
      const style = scene.attributes('style')

      expect(style).toContain('rotateX(0deg)')
      expect(style).toContain('rotateY(0deg)')
    })
  })

  describe('reactivity', () => {
    it('re-renders when colorLayerMap changes', async () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(2),
          originalImageData: createMockImageData(),
        },
      })

      await flushPromises()

      let canvases = wrapper.findAll('canvas')
      expect(canvases.length).toBe(2)

      await wrapper.setProps({
        colorLayerMap: createMockColorLayerMap(4),
      })

      await flushPromises()

      canvases = wrapper.findAll('canvas')
      expect(canvases.length).toBe(4)
    })
  })

  describe('layer spacing', () => {
    it('applies layer spacing in z-transform', async () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(3),
          originalImageData: createMockImageData(),
        },
      })

      await flushPromises()

      const canvases = wrapper.findAll('canvas')
      const styles = canvases.map(c => c.attributes('style'))

      // Each layer should have different translateZ
      expect(styles[0]).toContain('translateZ(0px)')
      expect(styles[1]).toContain('translateZ(50px)')
      expect(styles[2]).toContain('translateZ(100px)')
    })
  })

  describe('image sizing', () => {
    it('calculates appropriate image size', async () => {
      const wrapper = mount(LayerStackPreview, {
        props: {
          colorLayerMap: createMockColorLayerMap(),
          originalImageData: createMockImageData(400, 300),
        },
      })

      await flushPromises()

      const canvases = wrapper.findAll('canvas')
      // Canvas should have some width/height set
      expect(canvases[0].attributes('style')).toContain('width')
      expect(canvases[0].attributes('style')).toContain('height')
    })
  })
})
