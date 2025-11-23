import { describe, it, expect } from 'vitest'
import { $Adjustment } from './Adjustment'

describe('$Adjustment', () => {
  describe('identity', () => {
    it('should create identity adjustment', () => {
      const adj = $Adjustment.identity()
      expect(adj.exposure).toBe(0)
      expect(adj.highlights).toBe(0)
      expect(adj.shadows).toBe(0)
      expect(adj.whites).toBe(0)
      expect(adj.blacks).toBe(0)
      expect(adj.brightness).toBe(0)
      expect(adj.contrast).toBe(0)
      expect(adj.temperature).toBe(0)
      expect(adj.tint).toBe(0)
      expect(adj.clarity).toBe(0)
      expect(adj.fade).toBe(0)
      expect(adj.vibrance).toBe(0)
      expect(adj.splitShadowHue).toBe(220)
      expect(adj.splitShadowAmount).toBe(0)
      expect(adj.splitHighlightHue).toBe(40)
      expect(adj.splitHighlightAmount).toBe(0)
      expect(adj.splitBalance).toBe(0)
      expect(adj.toe).toBe(0)
      expect(adj.shoulder).toBe(0)
    })

    it('should produce identity LUT', () => {
      const adj = $Adjustment.identity()
      const lut = $Adjustment.toLut(adj)

      expect(lut[0]).toBe(0)
      expect(lut[127]).toBe(127)
      expect(lut[255]).toBe(255)
    })
  })

  describe('isIdentity', () => {
    it('should return true for identity', () => {
      expect($Adjustment.isIdentity({ exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 })).toBe(true)
    })

    it('should return false for non-identity', () => {
      expect($Adjustment.isIdentity({ exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0.1, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 })).toBe(false)
      expect($Adjustment.isIdentity({ exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0.1, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 })).toBe(false)
    })
  })

  describe('exposure (linear)', () => {
    it('should brighten with positive EV', () => {
      const adj = { exposure: 1, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // +1EV = 2倍の明るさ (線形光空間で)
      // 中間調が明るくなる
      expect(lut[128]).toBeGreaterThan(128)
      // 端点
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
    })

    it('should darken with negative EV', () => {
      const adj = { exposure: -1, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // -1EV = 1/2の明るさ
      expect(lut[128]).toBeLessThan(128)
      expect(lut[192]).toBeLessThan(192)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 1.5, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })

    it('should apply in linear light space', () => {
      // sRGB 中間値 (118) は線形で約0.18 (18%グレー)
      // +1EV で線形 0.36 → sRGB で約168程度になるはず
      const adj = { exposure: 1, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 118 (sRGB) ≈ 0.18 (linear) → 0.36 (linear) ≈ 168 (sRGB)
      expect(lut[118]).toBeGreaterThan(150)
      expect(lut[118]).toBeLessThan(180)
    })
  })

  describe('highlights/shadows', () => {
    it('should brighten highlights with positive value', () => {
      const adj = { exposure: 0, highlights: 0.5, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // ハイライト領域(192)がより明るく
      expect(lut[192]).toBeGreaterThan(192)
      // 中間調も少し影響
      expect(lut[128]).toBeGreaterThan(128)
      // シャドウ領域(64)はほぼ変わらない
      expect(lut[64]).toBeLessThan(80) // 少しは影響するが大きくない
    })

    it('should darken highlights with negative value', () => {
      const adj = { exposure: 0, highlights: -0.5, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // ハイライト領域が暗くなる
      expect(lut[192]).toBeLessThan(192)
      expect(lut[255]).toBeLessThan(255)
    })

    it('should brighten shadows with positive value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0.5, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // シャドウ領域(64)がより明るく
      expect(lut[64]).toBeGreaterThan(64)
      // ハイライト領域(192)はほぼ変わらない
      expect(lut[192]).toBeGreaterThan(180) // 少しは影響するが大きくない
    })

    it('should darken shadows with negative value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: -0.5, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // シャドウ領域が暗くなる
      expect(lut[64]).toBeLessThan(64)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 0, highlights: 0.8, shadows: -0.5, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })
  })

  describe('whites/blacks', () => {
    it('should brighten whites with positive value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0.5, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 最も明るい部分 (240-255) が影響を受ける
      expect(lut[250]).toBeGreaterThan(250)
      // 中間調 (128) はほぼ影響なし
      expect(lut[128]).toBeLessThan(135)
      expect(lut[128]).toBeGreaterThan(120)
    })

    it('should darken whites with negative value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: -0.5, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 最も明るい部分が暗くなる
      expect(lut[250]).toBeLessThan(250)
      expect(lut[255]).toBeLessThan(255)
    })

    it('should brighten blacks with positive value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0.5, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 最も暗い部分 (0-64) が影響を受ける
      expect(lut[10]).toBeGreaterThan(10)
      // 中間調はほぼ影響なし
      expect(lut[128]).toBeLessThan(135)
      expect(lut[128]).toBeGreaterThan(120)
    })

    it('should darken blacks with negative value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: -0.5, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 最も暗い部分がさらに暗くなる
      expect(lut[10]).toBeLessThan(10)
    })

    it('should affect narrower range than highlights/shadows', () => {
      const whitesAdj = { exposure: 0, highlights: 0, shadows: 0, whites: 0.5, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const highlightsAdj = { exposure: 0, highlights: 0.5, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const whitesLut = $Adjustment.toLut(whitesAdj)
      const highlightsLut = $Adjustment.toLut(highlightsAdj)

      // Whitesは中間調(160)での影響がHighlightsより小さい
      const whitesDiff160 = Math.abs(whitesLut[160]! - 160)
      const highlightsDiff160 = Math.abs(highlightsLut[160]! - 160)
      expect(whitesDiff160).toBeLessThan(highlightsDiff160)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0.8, blacks: -0.5, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })
  })

  describe('brightness (gamma)', () => {
    it('should brighten with positive value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0.5, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 暗いピクセルが明るくなる
      expect(lut[64]).toBeGreaterThan(64)
      expect(lut[128]).toBeGreaterThan(128)
      // 端点は維持
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
    })

    it('should darken with negative value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: -0.5, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 明るいピクセルが暗くなる
      expect(lut[128]).toBeLessThan(128)
      expect(lut[192]).toBeLessThan(192)
      // 端点は維持
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0.8, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })
  })

  describe('contrast (sigmoid)', () => {
    it('should increase contrast with positive value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0.5, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // シャドウがより暗く
      expect(lut[64]).toBeLessThan(64)
      // ハイライトがより明るく
      expect(lut[192]).toBeGreaterThan(192)
      // 中央付近は維持
      expect(lut[127]).toBeGreaterThan(120)
      expect(lut[127]).toBeLessThan(135)
    })

    it('should decrease contrast with negative value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: -0.5, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 負のコントラストは中央(128)に向かって圧縮
      // シャドウは明るく、ハイライトは暗くなる
      expect(lut[64]).toBeGreaterThan(64)
      expect(lut[192]).toBeLessThan(192)
      // 中央は変わらない
      expect(lut[128]).toBe(128)
    })

    it('should compress to mid-gray at contrast -1', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: -1, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // contrast = -1 で全て中央に
      expect(lut[0]).toBe(128)
      expect(lut[64]).toBe(128)
      expect(lut[128]).toBe(128)
      expect(lut[192]).toBe(128)
      expect(lut[255]).toBe(128)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0.8, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })
  })

  describe('combined adjustments', () => {
    it('should apply brightness then contrast', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0.3, contrast: 0.3, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 全体的に明るく、コントラストも上がる
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
      // 中間値がシフト
      expect(lut[128]).toBeGreaterThan(128)
    })

    it('should not clip values', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 1, contrast: 1, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 0; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(0)
        expect(lut[i]).toBeLessThanOrEqual(255)
      }
    })
  })

  describe('temperature', () => {
    it('should produce different RGB LUTs with positive temperature (warm)', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0.5, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lutRGB = $Adjustment.toLutFloatRGB(adj)

      // 暖色: R > G > B (中間値で確認)
      const mid = 128
      expect(lutRGB.r[mid]).toBeGreaterThan(lutRGB.g[mid]!)
      expect(lutRGB.g[mid]).toBeGreaterThan(lutRGB.b[mid]!)
    })

    it('should produce different RGB LUTs with negative temperature (cool)', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: -0.5, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lutRGB = $Adjustment.toLutFloatRGB(adj)

      // 寒色: B > G > R (中間値で確認)
      const mid = 128
      expect(lutRGB.b[mid]).toBeGreaterThan(lutRGB.g[mid]!)
      expect(lutRGB.g[mid]).toBeGreaterThan(lutRGB.r[mid]!)
    })

    it('should produce identical RGB LUTs with zero temperature', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lutRGB = $Adjustment.toLutFloatRGB(adj)

      // Temperature 0 では全チャンネル同一
      expect(lutRGB.r).toBe(lutRGB.g)
      expect(lutRGB.g).toBe(lutRGB.b)
    })

    it('should maintain values within valid range', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 1, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lutRGB = $Adjustment.toLutFloatRGB(adj)

      for (let i = 0; i < 256; i++) {
        expect(lutRGB.r[i]).toBeGreaterThanOrEqual(0)
        expect(lutRGB.r[i]).toBeLessThanOrEqual(1)
        expect(lutRGB.g[i]).toBeGreaterThanOrEqual(0)
        expect(lutRGB.g[i]).toBeLessThanOrEqual(1)
        expect(lutRGB.b[i]).toBeGreaterThanOrEqual(0)
        expect(lutRGB.b[i]).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('tint', () => {
    it('should produce magenta shift with positive tint', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0.5, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lutRGB = $Adjustment.toLutFloatRGB(adj)

      // マゼンタ: R と B が上がり、G が下がる
      const mid = 128
      expect(lutRGB.r[mid]).toBeGreaterThan(lutRGB.g[mid]!)
      expect(lutRGB.b[mid]).toBeGreaterThan(lutRGB.g[mid]!)
    })

    it('should produce green shift with negative tint', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: -0.5, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lutRGB = $Adjustment.toLutFloatRGB(adj)

      // 緑: G が上がり、R と B が下がる
      const mid = 128
      expect(lutRGB.g[mid]).toBeGreaterThan(lutRGB.r[mid]!)
      expect(lutRGB.g[mid]).toBeGreaterThan(lutRGB.b[mid]!)
    })

    it('should combine with temperature', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0.5, tint: 0.5, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lutRGB = $Adjustment.toLutFloatRGB(adj)

      // 暖色 + マゼンタ = R が最も高くなるはず
      const mid = 128
      expect(lutRGB.r[mid]).toBeGreaterThan(lutRGB.g[mid]!)
      expect(lutRGB.r[mid]).toBeGreaterThan(lutRGB.b[mid]!)
    })
  })

  describe('clarity', () => {
    it('should increase midtone contrast with positive value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0.5, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 正の clarity: 中間調が 0.5 から離れる
      // 128より暗い値はより暗く、128より明るい値はより明るく
      expect(lut[96]).toBeLessThan(96)
      expect(lut[160]).toBeGreaterThan(160)
      // 端点は維持
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
    })

    it('should decrease midtone contrast with negative value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: -0.5, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 負の clarity: 中間調が 0.5 に近づく
      expect(lut[96]).toBeGreaterThan(96)
      expect(lut[160]).toBeLessThan(160)
    })

    it('should preserve endpoints', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0.8, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // Clarity は端点を維持する
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
      // 中間調付近で変化がある
      expect(lut[96]).not.toBe(96)
      expect(lut[160]).not.toBe(160)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0.8, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })
  })

  describe('fade', () => {
    it('should lift blacks with positive value', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0.5, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // Fade: 黒が持ち上がる
      expect(lut[0]).toBeGreaterThan(0)
      // 白は維持される (線形補間で白点は保持)
      expect(lut[255]).toBe(255)
    })

    it('should have no effect at zero', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      expect(lut[0]).toBe(0)
      expect(lut[128]).toBe(128)
      expect(lut[255]).toBe(255)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 1, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })

    it('should compress dynamic range', () => {
      const adj = { exposure: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0, contrast: 0, temperature: 0, tint: 0, clarity: 0, fade: 0.5, vibrance: 0, splitShadowHue: 220, splitShadowAmount: 0, splitHighlightHue: 40, splitHighlightAmount: 0, splitBalance: 0, toe: 0, shoulder: 0, liftR: 0, liftG: 0, liftB: 0, gammaR: 0, gammaG: 0, gammaB: 0, gainR: 0, gainG: 0, gainB: 0 }
      const lut = $Adjustment.toLut(adj)

      // 出力範囲が狭くなる
      const range = lut[255]! - lut[0]!
      expect(range).toBeLessThan(255)
    })
  })

  describe('brightnessToGamma', () => {
    it('should convert brightness to gamma correctly', () => {
      expect($Adjustment.brightnessToGamma(0)).toBe(1) // no change
      expect($Adjustment.brightnessToGamma(1)).toBe(0.5) // brighten
      expect($Adjustment.brightnessToGamma(-1)).toBe(2) // darken
    })
  })
})
