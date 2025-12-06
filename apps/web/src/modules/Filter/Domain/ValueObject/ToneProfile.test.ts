import { describe, it, expect, beforeAll } from 'vitest'
import { $ToneProfile, type ToneProfile } from './ToneProfile'
import { $Lut1D } from './Lut1D'

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

describe('$ToneProfile', () => {
  describe('neutral', () => {
    it('should return identity profile', () => {
      const profile = $ToneProfile.neutral()

      expect(profile.r).toEqual({ blackPoint: 0, whitePoint: 255, gamma: 1.0 })
      expect(profile.g).toEqual({ blackPoint: 0, whitePoint: 255, gamma: 1.0 })
      expect(profile.b).toEqual({ blackPoint: 0, whitePoint: 255, gamma: 1.0 })
    })
  })

  describe('extract', () => {
    it('should extract neutral profile from linear gradient', () => {
      // 0-255 の線形グラデーション
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $ToneProfile.extract(imageData, 0) // percentile=0 で正確な min/max

      expect(profile.r.blackPoint).toBe(0)
      expect(profile.r.whitePoint).toBe(255)
      expect(profile.r.gamma).toBeCloseTo(1.0, 1)
    })

    it('should detect black/white point shift', () => {
      // 50-200 の範囲に制限されたグラデーション
      const imageData = createTestImageData(151, 1, (x) => {
        const v = 50 + x
        return [v, v, v, 255]
      })
      const profile = $ToneProfile.extract(imageData, 0)

      expect(profile.r.blackPoint).toBe(50)
      expect(profile.r.whitePoint).toBe(200)
    })

    it('should detect gamma shift for dark image', () => {
      // 暗めの画像 (ガンマ > 1)
      const imageData = createTestImageData(256, 1, (x) => {
        // 暗い値が多い分布
        const v = Math.round(Math.pow(x / 255, 2) * 255)
        return [v, v, v, 255]
      })
      const profile = $ToneProfile.extract(imageData, 0)

      // ガンマは 1 より大きいはず（暗い画像）
      expect(profile.r.gamma).toBeGreaterThan(1.0)
    })

    it('should detect gamma shift for bright image', () => {
      // 明るめの画像 (ガンマ < 1)
      const imageData = createTestImageData(256, 1, (x) => {
        // 明るい値が多い分布
        const v = Math.round(Math.pow(x / 255, 0.5) * 255)
        return [v, v, v, 255]
      })
      const profile = $ToneProfile.extract(imageData, 0)

      // ガンマは 1 より小さいはず（明るい画像）
      expect(profile.r.gamma).toBeLessThan(1.0)
    })
  })

  describe('toLut', () => {
    it('should generate identity LUT from neutral profile', () => {
      const profile = $ToneProfile.neutral()
      const lut = $ToneProfile.toLut(profile)

      // 入力 = 出力
      expect(lut.r[0]).toBeCloseTo(0)
      expect(lut.r[127]).toBeCloseTo(127 / 255, 2)
      expect(lut.r[255]).toBeCloseTo(1)
    })

    it('should apply black/white point shift', () => {
      const profile: ToneProfile = {
        r: { blackPoint: 50, whitePoint: 200, gamma: 1.0 },
        g: { blackPoint: 50, whitePoint: 200, gamma: 1.0 },
        b: { blackPoint: 50, whitePoint: 200, gamma: 1.0 },
      }
      const lut = $ToneProfile.toLut(profile)

      // 入力0 → 出力50/255
      expect(lut.r[0]).toBeCloseTo(50 / 255, 2)
      // 入力255 → 出力200/255
      expect(lut.r[255]).toBeCloseTo(200 / 255, 2)
    })
  })

  describe('toInverseLut', () => {
    it('should generate inverse LUT that cancels profile', () => {
      const profile: ToneProfile = {
        r: { blackPoint: 30, whitePoint: 220, gamma: 1.2 },
        g: { blackPoint: 30, whitePoint: 220, gamma: 1.2 },
        b: { blackPoint: 30, whitePoint: 220, gamma: 1.2 },
      }

      const applyLut = $ToneProfile.toLut(profile)
      const inverseLut = $ToneProfile.toInverseLut(profile)
      const composed = $Lut1D.compose(applyLut, inverseLut)

      // 適用 → 逆適用 で元に戻る（概ね）
      expect(composed.r[0]).toBeCloseTo(0, 1)
      expect(composed.r[127]).toBeCloseTo(127 / 255, 1)
      expect(composed.r[255]).toBeCloseTo(1, 1)
    })
  })

  describe('createTransferLut', () => {
    it('should create LUT that transfers from one profile to another', () => {
      const fromProfile: ToneProfile = {
        r: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
        g: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
        b: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
      }
      const toProfile: ToneProfile = {
        r: { blackPoint: 20, whitePoint: 230, gamma: 0.9 },
        g: { blackPoint: 20, whitePoint: 230, gamma: 0.9 },
        b: { blackPoint: 20, whitePoint: 230, gamma: 0.9 },
      }

      const transferLut = $ToneProfile.createTransferLut(fromProfile, toProfile)

      // ニュートラルからtoProfileへの変換 = toLut(toProfile) と同等
      const directLut = $ToneProfile.toLut(toProfile)

      expect(transferLut.r[0]!).toBeCloseTo(directLut.r[0]!, 2)
      expect(transferLut.r[127]!).toBeCloseTo(directLut.r[127]!, 2)
      expect(transferLut.r[255]!).toBeCloseTo(directLut.r[255]!, 2)
    })
  })
})
