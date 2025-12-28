import { describe, it, expect } from 'vitest'
import { $ExposureCorrection } from './ExposureCorrection'

describe('$ExposureCorrection', () => {
  // テスト用ヒストグラム生成ヘルパー
  const createHistogram = (distribution: 'dark' | 'bright' | 'normal' | 'lowContrast'): Uint32Array => {
    const hist = new Uint32Array(256)
    const total = 10000

    switch (distribution) {
      case 'dark':
        // 中央値が約0.2になるような暗い分布
        for (let i = 0; i < 256; i++) {
          hist[i] = Math.round(total * Math.exp(-((i - 50) ** 2) / 1000))
        }
        break
      case 'bright':
        // 中央値が約0.8になるような明るい分布
        for (let i = 0; i < 256; i++) {
          hist[i] = Math.round(total * Math.exp(-((i - 200) ** 2) / 1000))
        }
        break
      case 'normal':
        // 中央値が約0.45になるような分布
        for (let i = 0; i < 256; i++) {
          hist[i] = Math.round(total * Math.exp(-((i - 115) ** 2) / 2000))
        }
        break
      case 'lowContrast':
        // 狭い範囲に集中（低コントラスト）
        for (let i = 100; i < 150; i++) {
          hist[i] = Math.round(total / 50)
        }
        break
    }

    return hist
  }

  describe('computeStats', () => {
    it('暗い画像のp50は低い', () => {
      const hist = createHistogram('dark')
      const stats = $ExposureCorrection.computeStats(hist)

      expect(stats.p50).toBeLessThan(0.3)
      expect(stats.p10).toBeLessThan(stats.p50)
      expect(stats.p90).toBeGreaterThan(stats.p50)
    })

    it('明るい画像のp50は高い', () => {
      const hist = createHistogram('bright')
      const stats = $ExposureCorrection.computeStats(hist)

      expect(stats.p50).toBeGreaterThan(0.7)
    })

    it('通常画像のp50は中間', () => {
      const hist = createHistogram('normal')
      const stats = $ExposureCorrection.computeStats(hist)

      expect(stats.p50).toBeGreaterThan(0.3)
      expect(stats.p50).toBeLessThan(0.6)
    })

    it('低コントラスト画像のrangeは小さい', () => {
      const hist = createHistogram('lowContrast')
      const stats = $ExposureCorrection.computeStats(hist)

      expect(stats.range).toBeLessThan(0.3)
    })
  })

  describe('classify', () => {
    it('ローキー画像を検出', () => {
      const stats = {
        p01: 0.01, p10: 0.05, p50: 0.2, p90: 0.4, p99: 0.5,
        clipBlack: 0.01, clipWhite: 0, range: 0.35, midRatio: 0.3,
      }
      const classification = $ExposureCorrection.classify(stats)

      expect(classification.isLowKey).toBe(true)
      expect(classification.isHighKey).toBe(false)
    })

    it('ハイキー画像を検出', () => {
      const stats = {
        p01: 0.4, p10: 0.5, p50: 0.8, p90: 0.95, p99: 0.99,
        clipBlack: 0, clipWhite: 0.01, range: 0.45, midRatio: 0.3,
      }
      const classification = $ExposureCorrection.classify(stats)

      expect(classification.isHighKey).toBe(true)
      expect(classification.isLowKey).toBe(false)
    })

    it('通常画像は両方false', () => {
      const stats = {
        p01: 0.05, p10: 0.15, p50: 0.45, p90: 0.75, p99: 0.9,
        clipBlack: 0, clipWhite: 0, range: 0.6, midRatio: 0.4,
      }
      const classification = $ExposureCorrection.classify(stats)

      expect(classification.isLowKey).toBe(false)
      expect(classification.isHighKey).toBe(false)
    })
  })

  describe('compute', () => {
    it('暗い画像は明るく補正（gain > 1）', () => {
      const stats = {
        p01: 0.01, p10: 0.05, p50: 0.2, p90: 0.4, p99: 0.5,
        clipBlack: 0, clipWhite: 0, range: 0.35, midRatio: 0.3,
      }
      const result = $ExposureCorrection.compute(stats)

      expect(result.gain).toBeGreaterThan(1)
      expect(result.evDelta).toBeGreaterThan(0) // 暗いので正のEV差
    })

    it('明るい画像は暗く補正（gain < 1）', () => {
      const stats = {
        p01: 0.3, p10: 0.4, p50: 0.7, p90: 0.9, p99: 0.95,
        clipBlack: 0, clipWhite: 0, range: 0.5, midRatio: 0.3,
      }
      const result = $ExposureCorrection.compute(stats)

      expect(result.gain).toBeLessThan(1)
      expect(result.evDelta).toBeLessThan(0) // 明るいので負のEV差
    })

    it('目標値に近い画像はほぼ補正なし（gain ≈ 1）', () => {
      const stats = {
        p01: 0.1, p10: 0.2, p50: 0.45, p90: 0.7, p99: 0.85,
        clipBlack: 0, clipWhite: 0, range: 0.5, midRatio: 0.4,
      }
      const result = $ExposureCorrection.compute(stats)

      expect(result.gain).toBeCloseTo(1, 1)
      expect(Math.abs(result.evDelta)).toBeLessThan(0.1)
    })

    it('非線形抑制: 大きなズレでもmaxEVを超えない', () => {
      const stats = {
        p01: 0.01, p10: 0.02, p50: 0.05, p90: 0.1, p99: 0.15,
        clipBlack: 0, clipWhite: 0, range: 0.08, midRatio: 0.2,
      }
      const result = $ExposureCorrection.compute(stats, { maxEV: 0.7 })

      // appliedEvDelta は maxEV を超えない
      expect(Math.abs(result.appliedEvDelta)).toBeLessThanOrEqual(0.7)
    })

    it('ローキー画像では補正が控えめ', () => {
      // ローキー: p50 < 0.25 かつ p90 < 0.55
      const lowKeyStats = {
        p01: 0.01, p10: 0.05, p50: 0.2, p90: 0.4, p99: 0.5,
        clipBlack: 0, clipWhite: 0, range: 0.35, midRatio: 0.3,
      }
      // 通常画像: p50 は同じだが p90 > 0.55 なのでローキーではない
      const normalStats = {
        p01: 0.05, p10: 0.1, p50: 0.2, p90: 0.6, p99: 0.75,
        clipBlack: 0, clipWhite: 0, range: 0.5, midRatio: 0.4,
      }

      const lowKeyResult = $ExposureCorrection.compute(lowKeyStats)
      const normalResult = $ExposureCorrection.compute(normalStats)

      // ローキーは strength が下がるので、同じ p50 でも補正が弱い
      expect(lowKeyResult.effectiveStrength).toBeLessThan(normalResult.effectiveStrength)
    })
  })

  describe('toLut', () => {
    it('gain=1 なら identity LUT', () => {
      const result = {
        gain: 1,
        evDelta: 0,
        appliedEvDelta: 0,
        effectiveStrength: 0.6,
      }
      const lut = $ExposureCorrection.toLut(result)

      // 中間値をチェック
      expect(lut.r[128]).toBeCloseTo(128 / 255, 3)
      expect(lut.g[128]).toBeCloseTo(128 / 255, 3)
      expect(lut.b[128]).toBeCloseTo(128 / 255, 3)
    })

    it('gain>1 なら値が上がる', () => {
      const result = {
        gain: 1.5,
        evDelta: 0.5,
        appliedEvDelta: 0.4,
        effectiveStrength: 0.6,
      }
      const lut = $ExposureCorrection.toLut(result)

      const original = 128 / 255
      const expected = Math.min(1, original * 1.5)
      expect(lut.r[128]).toBeCloseTo(expected, 3)
    })

    it('値は0-1にクランプされる', () => {
      const result = {
        gain: 2,
        evDelta: 1,
        appliedEvDelta: 0.7,
        effectiveStrength: 0.6,
      }
      const lut = $ExposureCorrection.toLut(result)

      // 高い値はクランプ
      expect(lut.r[200]).toBeLessThanOrEqual(1)
      expect(lut.r[255]).toBe(1)
    })
  })

  describe('createLutFromHistogram', () => {
    it('暗い画像から明るくするLUTを生成', () => {
      const hist = createHistogram('dark')
      const { lut, result, stats } = $ExposureCorrection.createLutFromHistogram(hist)

      expect(stats.p50).toBeLessThan(0.3)
      expect(result.gain).toBeGreaterThan(1)
      expect(lut.r[128]).toBeGreaterThan(128 / 255)
    })
  })
})
