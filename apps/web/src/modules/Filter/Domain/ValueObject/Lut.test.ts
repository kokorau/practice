import { describe, it, expect, beforeAll } from 'vitest'
import { $Lut } from './Lut'

/**
 * ImageData polyfill for Node.js test environment
 */
class ImageDataPolyfill {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
  readonly colorSpace: PredefinedColorSpace = 'srgb'

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data
    this.width = width
    this.height = height ?? Math.floor(data.length / 4 / width)
  }
}

beforeAll(() => {
  if (typeof globalThis.ImageData === 'undefined') {
    ;(globalThis as unknown as { ImageData: typeof ImageDataPolyfill }).ImageData = ImageDataPolyfill
  }
})

/**
 * ダミーImageDataを作成
 */
const createImageData = (pixels: [number, number, number, number][]): ImageData => {
  const data = new Uint8ClampedArray(pixels.length * 4)
  for (let i = 0; i < pixels.length; i++) {
    data[i * 4] = pixels[i]![0]
    data[i * 4 + 1] = pixels[i]![1]
    data[i * 4 + 2] = pixels[i]![2]
    data[i * 4 + 3] = pixels[i]![3]
  }
  return new ImageData(data, pixels.length, 1)
}

describe('$Lut.applyWithEffects', () => {
  describe('Selective Color', () => {
    it('should keep selected hue in color and desaturate others', () => {
      const imageData = createImageData([
        [255, 0, 0, 255],     // 純赤（Hue=0）
        [0, 0, 255, 255],     // 純青（Hue=240）
        [0, 255, 0, 255],     // 純緑（Hue=120）
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        selectiveColorEnabled: true,
        selectiveHue: 0,        // 赤を選択
        selectiveRange: 30,
        selectiveDesaturate: 0, // 赤以外を完全にグレー化 (0=完全グレー)
      })

      // 赤はそのまま（R優勢）
      expect(result.data[0]).toBeGreaterThan(200)
      expect(result.data[1]).toBeLessThan(50)
      expect(result.data[2]).toBeLessThan(50)

      // 青はグレー化（R≈G≈B）
      const blueR = result.data[4]!
      const blueG = result.data[5]!
      const blueB = result.data[6]!
      expect(Math.abs(blueR - blueG)).toBeLessThan(5)
      expect(Math.abs(blueG - blueB)).toBeLessThan(5)

      // 緑もグレー化
      const greenR = result.data[8]!
      const greenG = result.data[9]!
      const greenB = result.data[10]!
      expect(Math.abs(greenR - greenG)).toBeLessThan(5)
      expect(Math.abs(greenG - greenB)).toBeLessThan(5)
    })

    it('should partially desaturate with selectiveDesaturate > 0', () => {
      const imageData = createImageData([
        [0, 0, 255, 255], // 青
      ])

      const fullDesat = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        selectiveColorEnabled: true,
        selectiveHue: 0,
        selectiveRange: 30,
        selectiveDesaturate: 0, // 完全グレー（0=範囲外を完全に脱色）
      })

      const partialDesat = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        selectiveColorEnabled: true,
        selectiveHue: 0,
        selectiveRange: 30,
        selectiveDesaturate: 0.5, // 50%グレー（範囲外を50%脱色）
      })

      // 部分的な彩度低下では青味がまだ残る
      expect(partialDesat.data[2]).toBeGreaterThan(fullDesat.data[2]!)
    })

    it('should handle wide hue range', () => {
      const imageData = createImageData([
        [255, 100, 100, 255], // 赤寄り
        [255, 50, 50, 255],   // より純粋な赤
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        selectiveColorEnabled: true,
        selectiveHue: 0,
        selectiveRange: 60, // 広い範囲
        selectiveDesaturate: 0, // 範囲外を完全に脱色 (0=完全グレー)
      })

      // 両方ともカラーのまま（範囲内）
      expect(result.data[0]).toBeGreaterThan(200)
      expect(result.data[4]).toBeGreaterThan(200)
    })
  })

  describe('Posterize', () => {
    it('should quantize colors to specified levels', () => {
      const imageData = createImageData([
        [0, 0, 0, 255],       // 黒
        [64, 64, 64, 255],    // 暗いグレー
        [128, 128, 128, 255], // 中間グレー
        [192, 192, 192, 255], // 明るいグレー
        [255, 255, 255, 255], // 白
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        posterizeLevels: 4, // 4階調
      })

      // 4階調では 0, 85, 170, 255 のいずれかになる
      const validValues = [0, 85, 170, 255]
      expect(validValues).toContain(result.data[0])  // 黒
      expect(validValues).toContain(result.data[4])  // 暗いグレー
      expect(validValues).toContain(result.data[8])  // 中間グレー
      expect(validValues).toContain(result.data[12]) // 明るいグレー
      expect(validValues).toContain(result.data[16]) // 白
    })

    it('should reduce color variation', () => {
      const imageData = createImageData([
        [100, 100, 100, 255],
        [101, 101, 101, 255],
        [102, 102, 102, 255],
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        posterizeLevels: 4,
      })

      // 近い値は同じ値に量子化される
      expect(result.data[0]).toBe(result.data[4])
      expect(result.data[4]).toBe(result.data[8])
    })

    it('should preserve alpha channel', () => {
      const imageData = createImageData([
        [100, 100, 100, 128],
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        posterizeLevels: 4,
      })

      expect(result.data[3]).toBe(128)
    })

    it('should not change image when levels = 256', () => {
      const imageData = createImageData([
        [100, 150, 200, 255],
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        posterizeLevels: 256,
      })

      expect(result.data[0]).toBe(100)
      expect(result.data[1]).toBe(150)
      expect(result.data[2]).toBe(200)
    })
  })

  describe('Hue Rotation', () => {
    it('should rotate red to green at 120 degrees', () => {
      const imageData = createImageData([
        [255, 0, 0, 255], // 純赤 (Hue=0)
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        hueRotation: 120,
      })

      // 赤(Hue=0) + 120度 = 緑(Hue=120)
      expect(result.data[1]).toBeGreaterThan(result.data[0]!) // G > R
      expect(result.data[1]).toBeGreaterThan(result.data[2]!) // G > B
    })

    it('should rotate green to blue at 120 degrees', () => {
      const imageData = createImageData([
        [0, 255, 0, 255], // 純緑 (Hue=120)
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        hueRotation: 120,
      })

      // 緑(Hue=120) + 120度 = 青(Hue=240)
      expect(result.data[2]).toBeGreaterThan(result.data[0]!) // B > R
      expect(result.data[2]).toBeGreaterThan(result.data[1]!) // B > G
    })

    it('should handle negative rotation', () => {
      const imageData = createImageData([
        [0, 255, 0, 255], // 純緑 (Hue=120)
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        hueRotation: -120,
      })

      // 緑(Hue=120) - 120度 = 赤(Hue=0)
      expect(result.data[0]).toBeGreaterThan(result.data[1]!) // R > G
      expect(result.data[0]).toBeGreaterThan(result.data[2]!) // R > B
    })

    it('should preserve gray (no saturation)', () => {
      const imageData = createImageData([
        [128, 128, 128, 255], // グレー
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        hueRotation: 90,
      })

      // グレーは彩度0なので色相回転しても変わらない
      expect(result.data[0]).toBe(128)
      expect(result.data[1]).toBe(128)
      expect(result.data[2]).toBe(128)
    })

    it('should invert colors at 180 degrees', () => {
      const imageData = createImageData([
        [255, 0, 0, 255], // 赤
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        hueRotation: 180,
      })

      // 赤(Hue=0) + 180度 = シアン(Hue=180)
      expect(result.data[1]).toBeGreaterThan(result.data[0]!) // G > R
      expect(result.data[2]).toBeGreaterThan(result.data[0]!) // B > R
    })

    it('should preserve alpha channel', () => {
      const imageData = createImageData([
        [255, 0, 0, 128],
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        hueRotation: 120,
      })

      expect(result.data[3]).toBe(128)
    })

    it('should not change image when rotation = 0', () => {
      const imageData = createImageData([
        [100, 150, 200, 255],
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        hueRotation: 0,
      })

      expect(result.data[0]).toBe(100)
      expect(result.data[1]).toBe(150)
      expect(result.data[2]).toBe(200)
    })
  })

  describe('Combined effects', () => {
    it('should apply posterize and hue rotation together', () => {
      const imageData = createImageData([
        [255, 0, 0, 255],
      ])

      const result = $Lut.applyWithEffects(imageData, $Lut.identity(), {
        posterizeLevels: 4,
        hueRotation: 120,
      })

      // エラーなく処理され、緑系になる
      expect(result.data[1]).toBeGreaterThan(result.data[0]!)
      expect(result.data.length).toBe(4)
    })
  })
})
