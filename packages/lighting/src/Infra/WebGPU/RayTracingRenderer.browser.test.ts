import { describe, test, expect, beforeAll } from 'vitest'
import { RayTracingRenderer, isWebGPUSupported, $Scene } from './RayTracingRenderer'
import { $Camera } from '../../Domain/ValueObject/Camera'

/**
 * Read a single pixel from canvas
 */
const readPixel = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): [number, number, number, number] => {
  // WebGPU canvas needs to be copied to 2d canvas for reading
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.drawImage(canvas, 0, 0)
  const data = tempCtx.getImageData(x, y, 1, 1).data
  return [data[0]!, data[1]!, data[2]!, data[3]!]
}

describe('RayTracingRenderer', () => {
  let webGPUSupported = false

  beforeAll(async () => {
    webGPUSupported = await isWebGPUSupported()
  })

  test('WebGPU support check', async () => {
    // This test documents whether WebGPU is available
    // In headless mode, WebGPU may not be supported
    console.log(`WebGPU supported: ${webGPUSupported}`)
    expect(typeof webGPUSupported).toBe('boolean')
  })

  test('can create renderer', async ({ skip }) => {
    if (!webGPUSupported) {
      skip()
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1

    const renderer = await RayTracingRenderer.create(canvas)
    expect(renderer).toBeDefined()

    renderer.dispose()
  })

  test('renders background color', async ({ skip }) => {
    if (!webGPUSupported) {
      skip()
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1

    const renderer = await RayTracingRenderer.create(canvas)

    // Empty scene with red background
    const scene = $Scene.create({
      objects: [],
      lights: [],
      backgroundColor: { r: 1, g: 0, b: 0 },
    })

    // Simple camera looking at origin
    const camera = $Camera.createOrthographic(
      { x: 0, y: 0, z: 10 }, // position
      { x: 0, y: 0, z: 0 },  // lookAt
      { x: 0, y: 1, z: 0 },  // up
      2,                      // width
      2                       // height
    )

    renderer.render(scene, camera)

    // Read pixel color
    const pixel = readPixel(canvas, 0, 0)

    // Expect red (255, 0, 0, 255)
    expect(pixel[0]).toBeGreaterThan(200) // R
    expect(pixel[1]).toBeLessThan(50)     // G
    expect(pixel[2]).toBeLessThan(50)     // B

    renderer.dispose()
  })
})
