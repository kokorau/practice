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

  describe('extractDetailed', () => {
    it('should extract CDF from linear gradient', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const detailed = $ToneProfile.extractDetailed(imageData, 0, 5)

      // CDFは累積分布なので、線形グラデーションでは線形になる
      expect(detailed.r.cdf[0]).toBeCloseTo(1 / 256, 2) // 最初の1ピクセル
      expect(detailed.r.cdf[127]).toBeCloseTo(128 / 256, 2)
      expect(detailed.r.cdf[255]).toBeCloseTo(1, 2)
    })

    it('should extract control points', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const detailed = $ToneProfile.extractDetailed(imageData, 0, 5)

      // 5つのコントロールポイント
      expect(detailed.r.controlPoints).toHaveLength(5)
      expect(detailed.r.controlPoints[0]!.input).toBe(0)
      expect(detailed.r.controlPoints[2]!.input).toBe(0.5)
      expect(detailed.r.controlPoints[4]!.input).toBe(1)
    })

    it('should include tone parameters', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const detailed = $ToneProfile.extractDetailed(imageData, 0, 7)

      expect(detailed.r.tone.blackPoint).toBe(0)
      expect(detailed.r.tone.whitePoint).toBe(255)
      expect(detailed.r.tone.gamma).toBeCloseTo(1.0, 1)
    })
  })

  describe('detailedToLut', () => {
    it('should generate LUT from CDF', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const detailed = $ToneProfile.extractDetailed(imageData, 0, 7)
      const lut = $ToneProfile.detailedToLut(detailed)

      // CDFがそのままLUTになる
      expect(lut.r[0]).toBeCloseTo(detailed.r.cdf[0]!, 5)
      expect(lut.r[127]).toBeCloseTo(detailed.r.cdf[127]!, 5)
      expect(lut.r[255]).toBeCloseTo(detailed.r.cdf[255]!, 5)
    })
  })

  describe('detailedToInverseLut', () => {
    it('should generate inverse LUT that approximately inverts CDF', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const detailed = $ToneProfile.extractDetailed(imageData, 0, 7)

      const lut = $ToneProfile.detailedToLut(detailed)
      const inverseLut = $ToneProfile.detailedToInverseLut(detailed)
      const composed = $Lut1D.compose(lut, inverseLut)

      // 適用 → 逆適用 で概ね元に戻る
      expect(composed.r[50]!).toBeCloseTo(50 / 255, 1)
      expect(composed.r[127]!).toBeCloseTo(127 / 255, 1)
      expect(composed.r[200]!).toBeCloseTo(200 / 255, 1)
    })
  })

  describe('neutralDetailed', () => {
    it('should return identity detailed profile', () => {
      const detailed = $ToneProfile.neutralDetailed()

      // CDFは線形
      expect(detailed.r.cdf[0]).toBe(0)
      expect(detailed.r.cdf[127]).toBeCloseTo(127 / 255, 5)
      expect(detailed.r.cdf[255]).toBe(1)

      // コントロールポイントは対角線上
      expect(detailed.r.controlPoints[0]).toEqual({ input: 0, output: 0 })
      expect(detailed.r.controlPoints[2]).toEqual({ input: 0.5, output: 0.5 })
      expect(detailed.r.controlPoints[4]).toEqual({ input: 1, output: 1 })
    })
  })

  describe('toSimple', () => {
    it('should convert detailed profile to simple profile', () => {
      const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
      const detailed = $ToneProfile.extractDetailed(imageData, 0, 7)
      const simple = $ToneProfile.toSimple(detailed)

      expect(simple.r).toEqual(detailed.r.tone)
      expect(simple.g).toEqual(detailed.g.tone)
      expect(simple.b).toEqual(detailed.b.tone)
    })
  })

  describe('analyze', () => {
    describe('histogram statistics', () => {
      it('should compute mean for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ToneProfile.analyze(imageData)

        // 0-255 の平均は 127.5
        expect(analysis.luminance.mean).toBeCloseTo(127.5, 0)
      })

      it('should compute median for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ToneProfile.analyze(imageData)

        // 中央値は 127 or 128
        expect(analysis.luminance.median).toBeGreaterThanOrEqual(127)
        expect(analysis.luminance.median).toBeLessThanOrEqual(128)
      })

      it('should compute stdDev for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ToneProfile.analyze(imageData)

        // 一様分布の標準偏差 ≈ 73.9
        expect(analysis.luminance.stdDev).toBeCloseTo(73.9, 0)
      })

      it('should detect negative skewness for bright image', () => {
        // 明るい画像（値が右に偏る）
        const imageData = createTestImageData(256, 1, (x) => {
          const v = Math.round(Math.pow(x / 255, 0.5) * 255)
          return [v, v, v, 255]
        })
        const analysis = $ToneProfile.analyze(imageData)

        // 明るい画像は負の歪度
        expect(analysis.luminance.skewness).toBeLessThan(0)
      })

      it('should detect positive skewness for dark image', () => {
        // 暗い画像（値が左に偏る）
        const imageData = createTestImageData(256, 1, (x) => {
          const v = Math.round(Math.pow(x / 255, 2) * 255)
          return [v, v, v, 255]
        })
        const analysis = $ToneProfile.analyze(imageData)

        // 暗い画像は正の歪度
        expect(analysis.luminance.skewness).toBeGreaterThan(0)
      })
    })

    describe('dynamic range', () => {
      it('should detect full range for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.dynamicRange.range).toBeGreaterThan(250)
      })

      it('should detect limited range', () => {
        // 50-200 の範囲
        const imageData = createTestImageData(151, 1, (x) => {
          const v = 50 + x
          return [v, v, v, 255]
        })
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.dynamicRange.range).toBeLessThan(200)
      })

      it('should detect low-key image', () => {
        // 暗い画像
        const imageData = createTestImageData(100, 1, (x) => {
          const v = Math.round(x * 0.5)
          return [v, v, v, 255]
        })
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.dynamicRange.key).toBe('low')
        expect(analysis.dynamicRange.keyValue).toBeLessThan(0.35)
      })

      it('should detect high-key image', () => {
        // 明るい画像
        const imageData = createTestImageData(100, 1, (x) => {
          const v = 180 + Math.round(x * 0.75)
          return [v, v, v, 255]
        })
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.dynamicRange.key).toBe('high')
        expect(analysis.dynamicRange.keyValue).toBeGreaterThan(0.65)
      })
    })

    describe('tonal zones', () => {
      it('should distribute evenly for linear gradient', () => {
        const imageData = createTestImageData(256, 1, (x) => [x, x, x, 255])
        const analysis = $ToneProfile.analyze(imageData)

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
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.tonalZones.shadows.percentage).toBeGreaterThan(0.5)
      })
    })

    describe('saturation', () => {
      it('should detect low saturation for grayscale', () => {
        const imageData = createTestImageData(100, 1, (x) => [x, x, x, 255])
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.saturation.mean).toBe(0)
      })

      it('should detect high saturation for pure colors', () => {
        // 純色（赤）
        const imageData = createTestImageData(10, 1, () => [255, 0, 0, 255])
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.saturation.mean).toBeGreaterThan(0.5)
      })
    })

    describe('clipping', () => {
      it('should detect no clipping for normal image', () => {
        const imageData = createTestImageData(200, 1, (x) => {
          const v = 28 + x
          return [v, v, v, 255]
        })
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.clipping.blackClipped).toBe(0)
        expect(analysis.clipping.whiteClipped).toBe(0)
      })

      it('should detect black clipping', () => {
        const imageData = createTestImageData(10, 1, () => [0, 0, 0, 255])
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.clipping.blackClipped).toBe(10)
        expect(analysis.clipping.blackClippedPercent).toBe(1)
      })

      it('should detect white clipping', () => {
        const imageData = createTestImageData(10, 1, () => [255, 255, 255, 255])
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.clipping.whiteClipped).toBe(10)
        expect(analysis.clipping.whiteClippedPercent).toBe(1)
      })

      it('should track channel-specific clipping', () => {
        // 赤チャンネルだけ飽和
        const imageData = createTestImageData(10, 1, () => [255, 128, 128, 255])
        const analysis = $ToneProfile.analyze(imageData)

        expect(analysis.clipping.channels.r.white).toBe(10)
        expect(analysis.clipping.channels.g.white).toBe(0)
        expect(analysis.clipping.channels.b.white).toBe(0)
      })
    })
  })
})
