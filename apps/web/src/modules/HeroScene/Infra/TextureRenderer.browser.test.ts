import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { TextureRenderer } from '@practice/texture'
import { renderHeroConfig } from './renderHeroConfig'
import {
  createTestPalette,
  createSolidBackgroundConfig,
  createGradientBackgroundConfig,
  createGridPatternConfig,
  createTwoLayerConfig,
  hasVisiblePixels,
  hasNonBlackPixels,
  getColorHistogram,
} from './__fixtures__'

// Check if WebGPU adapter is available (may fail in headless mode)
async function isWebGPUAvailable(): Promise<boolean> {
  if (!navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

describe('TextureRenderer (Browser)', () => {
  let gpuAvailable = false

  beforeAll(async () => {
    gpuAvailable = await isWebGPUAvailable()
  })

  it('should detect WebGPU support', () => {
    expect(navigator.gpu).toBeDefined()
  })

  it('should create TextureRenderer instance', async ({ skip }) => {
    if (!gpuAvailable) {
      skip()
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    document.body.appendChild(canvas)

    const renderer = await TextureRenderer.create(canvas)
    expect(renderer).toBeDefined()
    expect(renderer.getViewport()).toEqual({ width: 256, height: 256 })

    document.body.removeChild(canvas)
  })

  it('should read pixels from canvas', async ({ skip }) => {
    if (!gpuAvailable) {
      skip()
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    document.body.appendChild(canvas)

    const renderer = await TextureRenderer.create(canvas)

    // Clear to transparent (default state)
    const imageData = await renderer.readPixels()

    expect(imageData).toBeInstanceOf(ImageData)
    expect(imageData.width).toBe(64)
    expect(imageData.height).toBe(64)
    expect(imageData.data.length).toBe(64 * 64 * 4)

    document.body.removeChild(canvas)
  })
})

describe('HeroScene Rendering (Browser)', () => {
  let gpuAvailable = false
  let canvas: HTMLCanvasElement
  let renderer: TextureRenderer

  beforeAll(async () => {
    gpuAvailable = await isWebGPUAvailable()
  })

  beforeEach(async () => {
    if (!gpuAvailable) return

    canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    document.body.appendChild(canvas)
    renderer = await TextureRenderer.create(canvas)
  })

  afterEach(() => {
    if (canvas?.parentNode) {
      document.body.removeChild(canvas)
    }
  })

  it('should render solid background', async ({ skip }) => {
    if (!gpuAvailable) {
      skip()
      return
    }

    const config = createSolidBackgroundConfig('B')
    const palette = createTestPalette()

    await renderHeroConfig(renderer, config, palette)
    const imageData = await renderer.readPixels()

    // Should have visible (non-transparent) pixels
    expect(hasVisiblePixels(imageData)).toBe(true)

    // Should have non-black content (solid background should have color)
    expect(hasNonBlackPixels(imageData)).toBe(true)

    // Solid background should have very few unique colors (1-2)
    const histogram = getColorHistogram(imageData)
    expect(histogram.size).toBeLessThanOrEqual(3)
  })

  it('should render gradient background', async ({ skip }) => {
    if (!gpuAvailable) {
      skip()
      return
    }

    const config = createGradientBackgroundConfig()
    const palette = createTestPalette()

    await renderHeroConfig(renderer, config, palette)
    const imageData = await renderer.readPixels()

    expect(hasVisiblePixels(imageData)).toBe(true)
    expect(hasNonBlackPixels(imageData)).toBe(true)

    // Gradient should have many colors (more than solid)
    const histogram = getColorHistogram(imageData)
    expect(histogram.size).toBeGreaterThan(10)
  })

  it('should render grid pattern', async ({ skip }) => {
    if (!gpuAvailable) {
      skip()
      return
    }

    const config = createGridPatternConfig()
    const palette = createTestPalette()

    await renderHeroConfig(renderer, config, palette)
    const imageData = await renderer.readPixels()

    expect(hasVisiblePixels(imageData)).toBe(true)
    expect(hasNonBlackPixels(imageData)).toBe(true)

    // Grid should have at least 2 colors (grid lines + background)
    const histogram = getColorHistogram(imageData)
    expect(histogram.size).toBeGreaterThanOrEqual(2)
  })

  it('should render two-layer composition', async ({ skip }) => {
    if (!gpuAvailable) {
      skip()
      return
    }

    const config = createTwoLayerConfig()
    const palette = createTestPalette()

    await renderHeroConfig(renderer, config, palette)
    const imageData = await renderer.readPixels()

    expect(hasVisiblePixels(imageData)).toBe(true)
    expect(hasNonBlackPixels(imageData)).toBe(true)

    // Two layers with stripe should produce multiple colors
    const histogram = getColorHistogram(imageData)
    expect(histogram.size).toBeGreaterThan(2)
  })

  it('should render different colors for different palette', async ({ skip }) => {
    if (!gpuAvailable) {
      skip()
      return
    }

    const config = createSolidBackgroundConfig('B')

    // Render with default palette
    const palette1 = createTestPalette()
    await renderHeroConfig(renderer, config, palette1)
    const imageData1 = await renderer.readPixels()
    const histogram1 = getColorHistogram(imageData1)

    // Render with different brand color (orange)
    const palette2 = createTestPalette({
      brand: { L: 0.60, C: 0.20, H: 30 },  // Orange brand
      accent: { L: 0.55, C: 0.15, H: 220 },
      foundation: { L: 0.97, C: 0.005, H: 0 },
    })
    await renderHeroConfig(renderer, config, palette2)
    const imageData2 = await renderer.readPixels()
    const histogram2 = getColorHistogram(imageData2)

    // The two renders should produce different colors
    const keys1 = [...histogram1.keys()]
    const keys2 = [...histogram2.keys()]

    // At least one color should be different
    const commonKeys = keys1.filter(k => keys2.includes(k))
    expect(commonKeys.length).toBeLessThan(keys1.length)
  })
})
