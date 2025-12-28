import { describe, it, expect } from 'vitest'
import { $SaturationCorrection } from './SaturationCorrection'
import type { SaturationStats, LuminanceStats } from './AutoCorrectionStats'
import { $Lut3D } from './Lut3D'

describe('$SaturationCorrection', () => {
  // テスト用ヘルパー
  const createSaturationStats = (overrides: Partial<SaturationStats> = {}): SaturationStats => ({
    p95Proxy: 0.25,
    p99Proxy: 0.35,
    meanProxy: 0.15,
    ...overrides,
  })

  const createLuminanceStats = (overrides: Partial<LuminanceStats> = {}): LuminanceStats => ({
    p01: 0.05,
    p10: 0.15,
    p50: 0.50,
    p90: 0.85,
    p99: 0.95,
    clipBlack: 0.01,
    clipWhite: 0.01,
    range: 0.70,
    midRatio: 0.40,
    ...overrides,
  })

  describe('compute', () => {
    it('過彩度でない場合は補正なし (delta <= 0)', () => {
      // targetSat95 = 0.22、p95Proxy = 0.20 → delta = -0.02
      const saturation = createSaturationStats({ p95Proxy: 0.20 })
      const luminance = createLuminanceStats()
      const result = $SaturationCorrection.compute(saturation, luminance)

      expect(result.delta).toBeLessThanOrEqual(0)
      expect(result.compressionBase).toBe(0)
      expect(result.guardApplied).toBe(true)
      expect(result.guardType).toBe('noCompression')
    })

    it('過彩度の場合は圧縮が発生する', () => {
      // targetSat95 = 0.22、p95Proxy = 0.40 → delta = 0.18
      const saturation = createSaturationStats({ p95Proxy: 0.40 })
      const luminance = createLuminanceStats()
      const result = $SaturationCorrection.compute(saturation, luminance)

      expect(result.delta).toBeGreaterThan(0)
      expect(result.compressionBase).toBeGreaterThan(0)
      expect(result.compressionBase).toBeLessThanOrEqual(0.35) // maxCompression
    })

    it('ローキー画像では強度が減衰する', () => {
      const saturation = createSaturationStats({ p95Proxy: 0.40 })
      const normalLum = createLuminanceStats({ p50: 0.50 })
      const lowKeyLum = createLuminanceStats({ p50: 0.20 })

      const normalResult = $SaturationCorrection.compute(saturation, normalLum)
      const lowKeyResult = $SaturationCorrection.compute(saturation, lowKeyLum)

      expect(lowKeyResult.effectiveStrength).toBeLessThan(normalResult.effectiveStrength)
      expect(lowKeyResult.guardApplied).toBe(true)
      expect(lowKeyResult.guardType).toBe('extremeKey')
    })

    it('ハイキー画像では強度が減衰する', () => {
      const saturation = createSaturationStats({ p95Proxy: 0.40 })
      const normalLum = createLuminanceStats({ p50: 0.50 })
      const highKeyLum = createLuminanceStats({ p50: 0.80 })

      const normalResult = $SaturationCorrection.compute(saturation, normalLum)
      const highKeyResult = $SaturationCorrection.compute(saturation, highKeyLum)

      expect(highKeyResult.effectiveStrength).toBeLessThan(normalResult.effectiveStrength)
      expect(highKeyResult.guardApplied).toBe(true)
      expect(highKeyResult.guardType).toBe('extremeKey')
    })

    it('クリップが多い場合は強度が減衰する', () => {
      const saturation = createSaturationStats({ p95Proxy: 0.40 })
      const normalLum = createLuminanceStats({ clipBlack: 0.01, clipWhite: 0.01 })
      const highClipLum = createLuminanceStats({ clipBlack: 0.08, clipWhite: 0.05 })

      const normalResult = $SaturationCorrection.compute(saturation, normalLum)
      const highClipResult = $SaturationCorrection.compute(saturation, highClipLum)

      expect(highClipResult.effectiveStrength).toBeLessThan(normalResult.effectiveStrength)
    })

    it('中間調が少ない場合は強度が減衰する', () => {
      const saturation = createSaturationStats({ p95Proxy: 0.40 })
      const normalLum = createLuminanceStats({ midRatio: 0.40 })
      const lowMidLum = createLuminanceStats({ midRatio: 0.10 })

      const normalResult = $SaturationCorrection.compute(saturation, normalLum)
      const lowMidResult = $SaturationCorrection.compute(saturation, lowMidLum)

      expect(lowMidResult.effectiveStrength).toBeLessThan(normalResult.effectiveStrength)
    })

    it('非線形制限: compressionBase は maxCompression を超えない', () => {
      // 非常に高い彩度
      const saturation = createSaturationStats({ p95Proxy: 0.80 })
      const luminance = createLuminanceStats()
      const result = $SaturationCorrection.compute(saturation, luminance)

      expect(result.compressionBase).toBeLessThanOrEqual(0.35) // maxCompression
    })

    it('カスタムパラメータを適用できる', () => {
      // 軽度の過彩度（maxCompressionに達しない範囲）
      const saturation = createSaturationStats({ p95Proxy: 0.25 }) // delta = 0.03
      const luminance = createLuminanceStats()

      const defaultResult = $SaturationCorrection.compute(saturation, luminance)
      const customResult = $SaturationCorrection.compute(saturation, luminance, {
        satStrength: 0.8,  // 強度を上げる
      })

      // 両方ともmaxCompressionに達していないことを確認
      expect(defaultResult.compressionBase).toBeLessThan(0.35)
      expect(customResult.compressionBase).toBeLessThan(0.35)
      // 強度が高い方がcompressionBaseも大きい
      expect(customResult.compressionBase).toBeGreaterThan(defaultResult.compressionBase)
    })
  })

  describe('toLut3D', () => {
    it('圧縮なしの場合は identity LUT を返す', () => {
      const result = {
        delta: -0.05,
        normalizedDelta: 0,
        compressionBase: 0,
        effectiveStrength: 0.5,
        guardApplied: true,
        guardType: 'noCompression' as const,
        pixelSatLo: 0.10,
        pixelSatHi: 0.30,
      }
      const lut = $SaturationCorrection.toLut3D(result)
      const identity = $Lut3D.identity(17)

      // Identity LUT と同じ
      expect(lut.size).toBe(identity.size)
      expect(lut.data.length).toBe(identity.data.length)
      for (let i = 0; i < lut.data.length; i++) {
        expect(lut.data[i]).toBeCloseTo(identity.data[i]!, 5)
      }
    })

    it('圧縮ありの場合は高彩度ピクセルがグレーに寄る', () => {
      const result = {
        delta: 0.20,
        normalizedDelta: 1.0,
        compressionBase: 0.3,
        effectiveStrength: 0.5,
        guardApplied: false,
        guardType: 'none' as const,
        pixelSatLo: 0.10,
        pixelSatHi: 0.30,
      }
      const lut = $SaturationCorrection.toLut3D(result)

      // 高彩度ピクセル (R=1, G=0, B=0) を変換
      const [outR, outG, outB] = $Lut3D.lookup(lut, 1, 0, 0)
      const Y = 0.2126 * 1 + 0.7152 * 0 + 0.0722 * 0 // ≈ 0.2126

      // グレーに寄っているはず（Rが下がり、G/Bが上がる）
      expect(outR).toBeLessThan(1)
      expect(outG).toBeGreaterThan(0)
      expect(outB).toBeGreaterThan(0)

      // 輝度は保存される（グレーに寄せるだけ）
      const outY = 0.2126 * outR + 0.7152 * outG + 0.0722 * outB
      expect(outY).toBeCloseTo(Y, 2)
    })

    it('低彩度ピクセルはほぼ変化しない', () => {
      const result = {
        delta: 0.20,
        normalizedDelta: 1.0,
        compressionBase: 0.3,
        effectiveStrength: 0.5,
        guardApplied: false,
        guardType: 'none' as const,
        pixelSatLo: 0.10,
        pixelSatHi: 0.30,
      }
      const lut = $SaturationCorrection.toLut3D(result)

      // 低彩度ピクセル (R=0.5, G=0.5, B=0.5) を変換
      const [outR, outG, outB] = $Lut3D.lookup(lut, 0.5, 0.5, 0.5)

      // ほぼ変化なし
      expect(outR).toBeCloseTo(0.5, 2)
      expect(outG).toBeCloseTo(0.5, 2)
      expect(outB).toBeCloseTo(0.5, 2)
    })

    it('中程度の彩度は部分的に圧縮される', () => {
      const result = {
        delta: 0.20,
        normalizedDelta: 1.0,
        compressionBase: 0.3,
        effectiveStrength: 0.5,
        guardApplied: false,
        guardType: 'none' as const,
        pixelSatLo: 0.10,
        pixelSatHi: 0.30,
      }
      const lut = $SaturationCorrection.toLut3D(result)

      // 中程度の彩度 (R=0.7, G=0.5, B=0.5)
      // satProxy = 0.7 - 0.5 = 0.2
      const [outR, outG, outB] = $Lut3D.lookup(lut, 0.7, 0.5, 0.5)

      // 元の値と完全なグレーの間のどこかにあるはず
      expect(outR).toBeLessThan(0.7)
      expect(outR).toBeGreaterThan(0.5)
    })
  })

  describe('createLutFromStats', () => {
    it('SaturationStats と LuminanceStats から直接 LUT を生成', () => {
      const saturation = createSaturationStats({ p95Proxy: 0.40 })
      const luminance = createLuminanceStats()
      const { lut, result } = $SaturationCorrection.createLutFromStats(saturation, luminance)

      expect(result.delta).toBeGreaterThan(0)
      expect(result.compressionBase).toBeGreaterThan(0)
      expect(lut.type).toBe('lut3d')
      expect(lut.size).toBe(17)
    })

    it('カスタムサイズで LUT を生成', () => {
      const saturation = createSaturationStats({ p95Proxy: 0.40 })
      const luminance = createLuminanceStats()
      const { lut } = $SaturationCorrection.createLutFromStats(saturation, luminance, {}, 33)

      expect(lut.size).toBe(33)
    })
  })

  describe('getDefaultParams', () => {
    it('デフォルトパラメータを取得できる', () => {
      const params = $SaturationCorrection.getDefaultParams()

      expect(params.targetSat95).toBe(0.22)
      expect(params.satKnee).toBe(0.10)
      expect(params.satStrength).toBe(0.5)
      expect(params.maxCompression).toBe(0.35)
      expect(params.pixelSatLo).toBe(0.10)
      expect(params.pixelSatHi).toBe(0.30)
    })
  })
})
