import { describe, it, expect, beforeAll } from 'vitest'
import { TextureRenderer } from '@practice/texture'

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
