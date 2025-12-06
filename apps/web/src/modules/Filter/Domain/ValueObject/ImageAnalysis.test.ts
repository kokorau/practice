import { describe, it, expect, beforeAll } from 'vitest'
import { $ImageAnalysis } from './ImageAnalysis'

/**
 * ImageData polyfill for Node.js test environment
 */
class ImageDataPolyfill {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data
    this.width = width
    this.height = height
  }
}

beforeAll(() => {
  if (typeof globalThis.ImageData === 'undefined') {
    ;(globalThis as unknown as { ImageData: typeof ImageDataPolyfill }).ImageData = ImageDataPolyfill
  }
})

/** テスト用 ImageData を作成 */
function createTestImageData(
  width: number,
  height: number,
  fillFn: (x: number, y: number) => [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const [r, g, b, a] = fillFn(x, y)
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = a
    }
  }
  return new ImageData(data, width, height)
}

describe('$ImageAnalysis', () => {
  describe('analyze', () => {
    describe('histogram statistics', () => {
      it('should compute mean for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        // 0-255 の平均は 127.5
        expect(analysis.luminance.mean).toBeCloseTo(127.5, 0)
      })

      it('should compute median for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        // 中央値は 127 or 128
        expect(analysis.luminance.median).toBeGreaterThanOrEqual(127)
        expect(analysis.luminance.median).toBeLessThanOrEqual(128)
      })

      it('should compute stdDev for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        // 一様分布の標準偏差 ≈ 73.9
        expect(analysis.luminance.stdDev).toBeCloseTo(73.9, 0)
      })

      it('should detect negative skewness for bright image', () => {
        // 明るい画像（値が右に偏る）
        const imageData = createTestImageData(256, 1, (x) => {
          const v = Math.round(Math.pow(x / 255, 0.5) * 255)
          return [v, v, v, 255]
        })
        const analysis = $ImageAnalysis.analyze(imageData)

        // 明るい画像は負の歪度
        expect(analysis.luminance.skewness).toBeLessThan(0)
      })

      it('should detect positive skewness for dark image', () => {
        // 暗い画像（値が左に偏る）
        const imageData = createTestImageData(256, 1, (x) => {
          const v = Math.round(Math.pow(x / 255, 2) * 255)
          return [v, v, v, 255]
        })
        const analysis = $ImageAnalysis.analyze(imageData)

        // 暗い画像は正の歪度
        expect(analysis.luminance.skewness).toBeGreaterThan(0)
      })
    })

    describe('dynamic range', () => {
      it('should detect full range for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.dynamicRange.range).toBeGreaterThan(250)
      })

      it('should detect limited range', () => {
        // 50-200 の範囲
        const imageData = createTestImageData(151, 1, (x) => {
          const v = 50 + x
          return [v, v, v, 255]
        })
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.dynamicRange.range).toBeLessThan(200)
      })

      it('should detect low-key image', () => {
        // 暗い画像
        const imageData = createTestImageData(100, 1, (x) => {
          const v = Math.round(x * 0.5)
          return [v, v, v, 255]
        })
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.dynamicRange.key).toBe('low')
        expect(analysis.dynamicRange.keyValue).toBeLessThan(0.35)
      })

      it('should detect high-key image', () => {
        // 明るい画像
        const imageData = createTestImageData(100, 1, (x) => {
          const v = 180 + Math.round(x * 0.75)
          return [v, v, v, 255]
        })
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.dynamicRange.key).toBe('high')
        expect(analysis.dynamicRange.keyValue).toBeGreaterThan(0.65)
      })
    })

    describe('tonal zones', () => {
      it('should distribute evenly for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        // 各ゾーンが約1/3ずつ
        expect(analysis.tonalZones.shadows.percentage).toBeCloseTo(86 / 256, 1)
        expect(analysis.tonalZones.midtones.percentage).toBeCloseTo(85 / 256, 1)
        expect(analysis.tonalZones.highlights.percentage).toBeCloseTo(85 / 256, 1)
      })

      it('should detect shadow-heavy image', () => {
        // シャドウが多い画像
        const imageData = createTestImageData(100, 1, (x) => {
          const v = Math.round(x * 0.5)
          return [v, v, v, 255]
        })
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.tonalZones.shadows.percentage).toBeGreaterThan(0.5)
      })
    })

    describe('saturation', () => {
      it('should detect low saturation for grayscale', () => {
        const imageData = createTestImageData(100, 1, (x) => [x, x, x, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.saturation.mean).toBe(0)
      })

      it('should detect high saturation for pure colors', () => {
        // 純色（赤）
        const imageData = createTestImageData(10, 1, () => [255, 0, 0, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.saturation.mean).toBeGreaterThan(0.5)
      })
    })

    describe('clipping', () => {
      it('should detect no clipping for normal image', () => {
        const imageData = createTestImageData(200, 1, (x) => {
          const v = 28 + x
          return [v, v, v, 255]
        })
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.clipping.blackClipped).toBe(0)
        expect(analysis.clipping.whiteClipped).toBe(0)
      })

      it('should detect black clipping', () => {
        const imageData = createTestImageData(10, 1, () => [0, 0, 0, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.clipping.blackClipped).toBe(10)
        expect(analysis.clipping.blackClippedPercent).toBe(1)
      })

      it('should detect white clipping', () => {
        const imageData = createTestImageData(10, 1, () => [255, 255, 255, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.clipping.whiteClipped).toBe(10)
        expect(analysis.clipping.whiteClippedPercent).toBe(1)
      })

      it('should track channel-specific clipping', () => {
        // 赤チャンネルだけ飽和
        const imageData = createTestImageData(10, 1, () => [255, 128, 128, 255])
        const analysis = $ImageAnalysis.analyze(imageData)

        expect(analysis.clipping.channels.r.white).toBe(10)
        expect(analysis.clipping.channels.g.white).toBe(0)
        expect(analysis.clipping.channels.b.white).toBe(0)
      })
    })
  })
})
