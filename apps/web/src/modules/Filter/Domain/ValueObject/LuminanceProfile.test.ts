import { describe, it, expect, beforeAll } from 'vitest'
import { $LuminanceProfile } from './LuminanceProfile'

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

describe('$LuminanceProfile', () => {
  describe('extract', () => {
    it('should extract profile from linear grayscale gradient', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $LuminanceProfile.extract(imageData, 0)

      expect(profile.blackPoint).toBe(0)
      expect(profile.whitePoint).toBe(255)
      expect(profile.gamma).toBeCloseTo(1.0, 0)
    })

    it('should detect limited black/white points', () => {
      // 50-200 の範囲
      const imageData = createTestImageData(151, 1, (x) => {
        const v = 50 + x
        return [v, v, v, 255]
      })
      const profile = $LuminanceProfile.extract(imageData, 0)

      // Oklabの輝度は非線形（暗い部分が圧縮される）
      // sRGB 50 → Oklab L ≈ 0.32 → L255 ≈ 81
      // sRGB 200 → Oklab L ≈ 0.83 → L255 ≈ 212
      expect(profile.blackPoint).toBeGreaterThan(60)
      expect(profile.blackPoint).toBeLessThan(100)
      expect(profile.whitePoint).toBeGreaterThan(190)
      expect(profile.whitePoint).toBeLessThan(230)
    })

    it('should have CDF that starts near 0 and ends at 1', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $LuminanceProfile.extract(imageData, 0)

      expect(profile.cdf[0]).toBeGreaterThanOrEqual(0)
      expect(profile.cdf[0]).toBeLessThan(0.1)
      expect(profile.cdf[255]).toBeCloseTo(1, 2)
    })

    it('should extract control points', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $LuminanceProfile.extract(imageData, 0, 5)

      expect(profile.controlPoints).toHaveLength(5)
      expect(profile.controlPoints[0]!.input).toBe(0)
      expect(profile.controlPoints[4]!.input).toBe(1)
    })
  })

  describe('neutral', () => {
    it('should return identity profile', () => {
      const profile = $LuminanceProfile.neutral()

      expect(profile.blackPoint).toBe(0)
      expect(profile.whitePoint).toBe(255)
      expect(profile.gamma).toBe(1.0)
      expect(profile.cdf[0]).toBe(0)
      expect(profile.cdf[127]).toBeCloseTo(127 / 255, 5)
      expect(profile.cdf[255]).toBe(1)
    })
  })

  describe('toLut / toInverseLut', () => {
    it('should generate LUT from CDF', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $LuminanceProfile.extract(imageData, 0)
      const lut = $LuminanceProfile.toLut(profile)

      // CDFがそのままLUTになる
      expect(lut[0]).toBe(profile.cdf[0])
      expect(lut[255]).toBe(profile.cdf[255])
    })

    it('should generate inverse LUT', () => {
      const profile = $LuminanceProfile.neutral()
      const lut = $LuminanceProfile.toLut(profile)
      const inverseLut = $LuminanceProfile.toInverseLut(profile)

      // リニアプロファイルの場合、LUTと逆LUTは同じ
      expect(lut[127]).toBeCloseTo(inverseLut[127]!, 2)
    })
  })

  describe('toSimpleInverseLut', () => {
    it('should generate gentler inverse LUT', () => {
      const imageData = createTestImageData(151, 1, (x) => {
        const v = 50 + x
        return [v, v, v, 255]
      })
      const profile = $LuminanceProfile.extract(imageData, 0)
      const simpleLut = $LuminanceProfile.toSimpleInverseLut(profile)

      // 簡易LUTは0から始まる
      expect(simpleLut[0]).toBeCloseTo(0, 1)
      // 白点付近で1に近づく
      expect(simpleLut[255]).toBeCloseTo(1, 1)
    })
  })

  describe('blendLut', () => {
    it('should return identity at strength 0', () => {
      const profile = $LuminanceProfile.neutral()
      const lut = $LuminanceProfile.toLut(profile)
      const blended = $LuminanceProfile.blendLut(lut, 0)

      // strength=0 なので、入力=出力
      expect(blended[0]).toBeCloseTo(0, 5)
      expect(blended[127]).toBeCloseTo(127 / 255, 5)
      expect(blended[255]).toBeCloseTo(1, 5)
    })

    it('should return original LUT at strength 1', () => {
      const profile = $LuminanceProfile.neutral()
      const lut = $LuminanceProfile.toLut(profile)
      const blended = $LuminanceProfile.blendLut(lut, 1)

      expect(blended[127]).toBeCloseTo(lut[127]!, 5)
    })

    it('should blend at strength 0.5', () => {
      // LUTを変更してテスト
      const modifiedLut = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        modifiedLut[i] = Math.pow(i / 255, 2) // 暗くするカーブ
      }
      const blended = $LuminanceProfile.blendLut(modifiedLut, 0.5)

      // 中間値でブレンドされている
      const original = 127 / 255
      const modified = Math.pow(127 / 255, 2)
      const expected = (original + modified) / 2
      expect(blended[127]).toBeCloseTo(expected, 2)
    })
  })

  describe('applyLut', () => {
    it('should preserve colors when applying identity LUT', () => {
      const imageData = createTestImageData(10, 1, (x) => [
        x * 25, // R: 0-225
        128,    // G: constant
        255 - x * 25, // B: 255-30
        255,
      ])
      const profile = $LuminanceProfile.neutral()
      const lut = $LuminanceProfile.toLut(profile)
      const result = $LuminanceProfile.applyLut(imageData, lut)

      // アイデンティティLUTなので、ほぼ同じ値
      // Oklab往復 + LUT離散化で ±2 程度の誤差が生じる
      for (let i = 0; i < result.data.length; i += 4) {
        expect(Math.abs(result.data[i]! - imageData.data[i]!)).toBeLessThanOrEqual(3)
        expect(Math.abs(result.data[i + 1]! - imageData.data[i + 1]!)).toBeLessThanOrEqual(3)
        expect(Math.abs(result.data[i + 2]! - imageData.data[i + 2]!)).toBeLessThanOrEqual(3)
        expect(result.data[i + 3]).toBe(imageData.data[i + 3]) // alpha exact
      }
    })

    it('should modify luminance while preserving hue', () => {
      // 純色（赤）を使用
      const imageData = createTestImageData(1, 1, () => [255, 0, 0, 255])

      // 輝度を下げるLUT
      const lut = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        lut[i] = (i / 255) * 0.5 // 輝度半分
      }

      const result = $LuminanceProfile.applyLut(imageData, lut)

      // 暗くなっているはず
      expect(result.data[0]).toBeLessThan(255)
      // まだ赤っぽい（RがG,Bより大きい）
      expect(result.data[0]).toBeGreaterThan(result.data[1]!)
      expect(result.data[0]).toBeGreaterThan(result.data[2]!)
    })
  })

  describe('toFittedLut / toFittedInverseLut', () => {
    it('should generate smooth polynomial fitted LUT', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $LuminanceProfile.extract(imageData, 0)
      const lut = $LuminanceProfile.toFittedLut(profile, 'polynomial')

      // 滑らかであること（大きな不連続がない）
      let maxJump = 0
      for (let i = 1; i < 256; i++) {
        const jump = Math.abs((lut[i] ?? 0) - (lut[i - 1] ?? 0))
        maxJump = Math.max(maxJump, jump)
      }
      expect(maxJump).toBeLessThan(0.05) // 隣接値の差は5%未満

      // 端点が適切
      expect(lut[0]).toBeCloseTo(0, 1)
      expect(lut[255]).toBeCloseTo(1, 1)
    })

    it('should generate smooth spline fitted LUT', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $LuminanceProfile.extract(imageData, 0, 7)
      const lut = $LuminanceProfile.toFittedLut(profile, 'spline')

      // 滑らかであること
      let maxJump = 0
      for (let i = 1; i < 256; i++) {
        const jump = Math.abs((lut[i] ?? 0) - (lut[i - 1] ?? 0))
        maxJump = Math.max(maxJump, jump)
      }
      expect(maxJump).toBeLessThan(0.05)
    })

    it('should generate inverse LUT that approximately inverts', () => {
      const profile = $LuminanceProfile.neutral()
      const lut = $LuminanceProfile.toFittedLut(profile, 'polynomial')
      const inverseLut = $LuminanceProfile.toFittedInverseLut(profile, 'polynomial')

      // 中間値でlut → inverseLut で概ね元に戻る
      const mid = 127
      const afterLut = Math.round((lut[mid] ?? 0) * 255)
      const afterInverse = inverseLut[afterLut] ?? 0
      expect(afterInverse).toBeCloseTo(mid / 255, 1)
    })

    it('should support simple fit type', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $LuminanceProfile.extract(imageData, 0)
      const lut = $LuminanceProfile.toFittedLut(profile, 'simple')

      // simple はガンマカーブベース
      expect(lut[0]).toBeCloseTo(profile.blackPoint / 255, 1)
      expect(lut[255]).toBeCloseTo(profile.whitePoint / 255, 1)
    })

    it('should support raw fit type', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const profile = $LuminanceProfile.extract(imageData, 0)
      const lut = $LuminanceProfile.toFittedLut(profile, 'raw')

      // raw はCDFそのまま
      expect(lut[127]).toBeCloseTo(profile.cdf[127]!, 5)
    })
  })
})
