import { describe, it, expect } from 'vitest'
import { $WhiteBalanceCorrection, type WbGuardType } from './WhiteBalanceCorrection'
import type { NeutralStats, LuminanceStats } from './AutoCorrectionStats'

describe('$WhiteBalanceCorrection', () => {
  // テスト用ヘルパー: NeutralStats
  const createNeutralStats = (overrides: Partial<NeutralStats> = {}): NeutralStats => ({
    count: 1000,
    ratio: 0.10, // 10% = high confidence
    medianRGB: [0.5, 0.5, 0.5],
    confidence: 'high',
    ...overrides,
  })

  // テスト用ヘルパー: LuminanceStats
  const createLuminanceStats = (overrides: Partial<LuminanceStats> = {}): LuminanceStats => ({
    p01: 0.05,
    p10: 0.15,
    p50: 0.50, // 中間値
    p90: 0.85,
    p99: 0.95,
    clipBlack: 0.01,
    clipWhite: 0.01,
    range: 0.70,
    midRatio: 0.40, // 40% = normal
    ...overrides,
  })

  describe('compute', () => {
    it('無彩色（グレー）の場合はゲインが1.0', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.5, 0.5, 0.5],
        confidence: 'high',
      })
      const luminance = createLuminanceStats()
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      expect(result.rawKr).toBeCloseTo(1.0, 2)
      expect(result.rawKb).toBeCloseTo(1.0, 2)
      expect(result.gainR).toBeCloseTo(1.0, 2)
      expect(result.gainG).toBeCloseTo(1.0, 2)
      expect(result.gainB).toBeCloseTo(1.0, 2)
      expect(result.guardApplied).toBe(false)
    })

    it('青かぶりの場合は B ゲインを下げる (kb < 1)', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.4, 0.4, 0.5], // 青が強い
        confidence: 'high',
      })
      const luminance = createLuminanceStats()
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      // kb = m.g / m.b = 0.4 / 0.5 = 0.8 (青を下げる)
      expect(result.rawKb).toBeCloseTo(0.8, 2)
      // クランプ範囲内
      expect(result.clampedKb).toBeCloseTo(0.9, 2) // min clamp at 0.90
      expect(result.gainB).toBeLessThan(1.0)
      // G は常に 1.0
      expect(result.gainG).toBe(1.0)
    })

    it('黄かぶり（青が弱い）の場合は B ゲインを上げる (kb > 1)', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.5, 0.5, 0.4], // 青が弱い = 黄かぶり
        confidence: 'high',
      })
      const luminance = createLuminanceStats()
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      // kb = m.g / m.b = 0.5 / 0.4 = 1.25
      expect(result.rawKb).toBeCloseTo(1.25, 2)
      // クランプ範囲にかかる
      expect(result.clampedKb).toBeCloseTo(1.10, 2) // max clamp at 1.10
      expect(result.gainB).toBeGreaterThan(1.0)
    })

    it('信頼度が none の場合は補正なし', () => {
      const neutral = createNeutralStats({
        count: 0,
        ratio: 0,
        medianRGB: [1, 1, 1],
        confidence: 'none',
      })
      const luminance = createLuminanceStats()
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      expect(result.gainR).toBe(1)
      expect(result.gainG).toBe(1)
      expect(result.gainB).toBe(1)
      expect(result.guardApplied).toBe(true)
      expect(result.guards).toContain('noNeutral')
    })

    it('無彩色候補が少ない場合は強度が下がる', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.4, 0.5, 0.5], // 赤が弱い
        ratio: 0.01, // 1% < 2% threshold
        confidence: 'low',
      })
      const luminance = createLuminanceStats()
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      // 強度が 0.4 * 0.2 = 0.08 に減衰
      expect(result.effectiveStrength).toBeCloseTo(0.08, 2)
      expect(result.guardApplied).toBe(true)
      expect(result.guards).toContain('lowNeutralRatio')
    })

    it('中間調が少ない場合は強度が下がる', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.4, 0.5, 0.5],
      })
      const luminance = createLuminanceStats({
        midRatio: 0.15, // 15% < 20% threshold
      })
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      // 強度が 0.4 * 0.3 = 0.12 に減衰
      expect(result.effectiveStrength).toBeCloseTo(0.12, 2)
      expect(result.guards).toContain('lowMidRatio')
    })

    it('ローキー画像では強度が下がる', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.4, 0.5, 0.5],
      })
      const luminance = createLuminanceStats({
        p50: 0.20, // ローキー
      })
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      // 強度が 0.4 * 0.5 = 0.20 に減衰
      expect(result.effectiveStrength).toBeCloseTo(0.20, 2)
      expect(result.guards).toContain('extremeKey')
    })

    it('ハイキー画像では強度が下がる', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.4, 0.5, 0.5],
      })
      const luminance = createLuminanceStats({
        p50: 0.80, // ハイキー
      })
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      expect(result.effectiveStrength).toBeCloseTo(0.20, 2)
      expect(result.guards).toContain('extremeKey')
    })

    it('クリップが多い場合は強度が下がる', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.4, 0.5, 0.5],
      })
      const luminance = createLuminanceStats({
        clipBlack: 0.06,
        clipWhite: 0.06, // 合計 12% > 10%
      })
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      expect(result.effectiveStrength).toBeCloseTo(0.20, 2)
      expect(result.guards).toContain('highClipping')
    })

    it('複数のガードが累積的に適用される', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.4, 0.5, 0.5],
        ratio: 0.01, // lowNeutralRatio
      })
      const luminance = createLuminanceStats({
        midRatio: 0.15, // lowMidRatio
      })
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      // 強度が 0.4 * 0.2 * 0.3 = 0.024 に減衰
      expect(result.effectiveStrength).toBeCloseTo(0.024, 3)
      expect(result.guards).toContain('lowNeutralRatio')
      expect(result.guards).toContain('lowMidRatio')
    })

    it('ゲインは [0.90, 1.10] にクランプされる', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.3, 0.5, 0.7], // 極端な色かぶり
        confidence: 'high',
      })
      const luminance = createLuminanceStats()
      const result = $WhiteBalanceCorrection.compute(neutral, luminance)

      // raw: kr = 0.5/0.3 ≈ 1.67, kb = 0.5/0.7 ≈ 0.71
      expect(result.rawKr).toBeGreaterThan(1.10)
      expect(result.rawKb).toBeLessThan(0.90)
      // clamped
      expect(result.clampedKr).toBeCloseTo(1.10, 2)
      expect(result.clampedKb).toBeCloseTo(0.90, 2)
    })

    it('強度を 0 にすると変化なし', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.3, 0.5, 0.6],
        confidence: 'high',
      })
      const luminance = createLuminanceStats()
      const result = $WhiteBalanceCorrection.compute(neutral, luminance, { strength: 0 })

      expect(result.gainR).toBeCloseTo(1.0, 3)
      expect(result.gainG).toBeCloseTo(1.0, 3)
      expect(result.gainB).toBeCloseTo(1.0, 3)
    })
  })

  describe('toLut', () => {
    it('LUT を生成できる', () => {
      const result = {
        rawKr: 1.1,
        rawKb: 0.9,
        clampedKr: 1.1,
        clampedKb: 0.9,
        gainR: 1.05,
        gainG: 1.0,
        gainB: 0.95,
        effectiveStrength: 0.4,
        guardApplied: false,
        guards: [] as WbGuardType[],
      }
      const lut = $WhiteBalanceCorrection.toLut(result)

      expect(lut.type).toBe('lut1d')
      expect(lut.r).toHaveLength(256)
      expect(lut.g).toHaveLength(256)
      expect(lut.b).toHaveLength(256)
    })

    it('R ゲイン > 1 なら R チャンネルの値が上がる', () => {
      const result = {
        rawKr: 1.2,
        rawKb: 1.0,
        clampedKr: 1.1,
        clampedKb: 1.0,
        gainR: 1.04,
        gainG: 1.0,
        gainB: 1.0,
        effectiveStrength: 0.4,
        guardApplied: false,
        guards: [] as WbGuardType[],
      }
      const lut = $WhiteBalanceCorrection.toLut(result)

      expect(lut.r[128]!).toBeGreaterThan(128 / 255)
      expect(lut.g[128]!).toBeCloseTo(128 / 255, 3)
      expect(lut.b[128]!).toBeCloseTo(128 / 255, 3)
    })

    it('G チャンネルは常に identity', () => {
      const result = {
        rawKr: 1.2,
        rawKb: 0.8,
        clampedKr: 1.1,
        clampedKb: 0.9,
        gainR: 1.04,
        gainG: 1.0,
        gainB: 0.96,
        effectiveStrength: 0.4,
        guardApplied: false,
        guards: [] as WbGuardType[],
      }
      const lut = $WhiteBalanceCorrection.toLut(result)

      // G は identity
      for (let i = 0; i < 256; i++) {
        expect(lut.g[i]!).toBeCloseTo(i / 255, 5)
      }
    })

    it('ゲイン > 1 でも値は 1 にクランプ', () => {
      const result = {
        rawKr: 1.5,
        rawKb: 1.0,
        clampedKr: 1.1,
        clampedKb: 1.0,
        gainR: 1.04,
        gainG: 1.0,
        gainB: 1.0,
        effectiveStrength: 0.4,
        guardApplied: false,
        guards: [] as WbGuardType[],
      }
      const lut = $WhiteBalanceCorrection.toLut(result)

      expect(lut.r[255]).toBeLessThanOrEqual(1)
    })
  })

  describe('createLutFromStats', () => {
    it('Stats から直接 LUT を生成', () => {
      const neutral = createNeutralStats({
        medianRGB: [0.45, 0.5, 0.55],
        confidence: 'high',
      })
      const luminance = createLuminanceStats()
      const { lut, result } = $WhiteBalanceCorrection.createLutFromStats(neutral, luminance)

      expect(lut.type).toBe('lut1d')
      // 赤が弱いので R ゲインを上げる
      expect(result.gainR).toBeGreaterThan(1)
      // 青が強いので B ゲインを下げる
      expect(result.gainB).toBeLessThan(1)
    })
  })
})
