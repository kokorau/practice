import { describe, it, expect } from 'vitest'
import { $Photo } from './Photo'
import { $Histogram } from './Histogram'
import { $PhotoAnalysis } from './PhotoAnalysis'

const createMockImageData = (pixels: number[][]): ImageData => {
  const data = new Uint8ClampedArray(pixels.flat())
  return {
    data,
    width: pixels.length,
    height: 1,
    colorSpace: 'srgb',
  }
}

describe('$Histogram', () => {
  it('should count RGB values correctly', () => {
    // 2 pixels: [R=100, G=150, B=200, A=255], [R=100, G=50, B=200, A=255]
    const imageData = createMockImageData([
      [100, 150, 200, 255],
      [100, 50, 200, 255],
    ])
    const photo = $Photo.create(imageData)
    const histogram = $Histogram.create(photo)

    // R=100 appears 2 times
    expect(histogram.r[100]).toBe(2)
    // G=150 appears 1 time
    expect(histogram.g[150]).toBe(1)
    // G=50 appears 1 time
    expect(histogram.g[50]).toBe(1)
    // B=200 appears 2 times
    expect(histogram.b[200]).toBe(2)
    // Other values should be 0
    expect(histogram.r[0]).toBe(0)
    expect(histogram.r[255]).toBe(0)
  })

  it('should handle empty image', () => {
    const imageData = createMockImageData([])
    const photo = $Photo.create(imageData)
    const histogram = $Histogram.create(photo)

    expect(histogram.r.every(v => v === 0)).toBe(true)
    expect(histogram.g.every(v => v === 0)).toBe(true)
    expect(histogram.b.every(v => v === 0)).toBe(true)
  })
})

describe('$PhotoAnalysis', () => {
  it('should create analysis with histogram', () => {
    const imageData = createMockImageData([
      [255, 0, 0, 255],   // Red pixel
      [0, 255, 0, 255],   // Green pixel
      [0, 0, 255, 255],   // Blue pixel
    ])
    const photo = $Photo.create(imageData)
    const analysis = $PhotoAnalysis.create(photo)

    expect(analysis.histogram).toBeDefined()
    expect(analysis.histogram.r[255]).toBe(1)
    expect(analysis.histogram.g[255]).toBe(1)
    expect(analysis.histogram.b[255]).toBe(1)
  })
})
