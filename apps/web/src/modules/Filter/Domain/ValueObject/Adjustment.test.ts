import { describe, it, expect } from 'vitest'
import { $Adjustment } from './Adjustment'

describe('$Adjustment', () => {
  describe('identity', () => {
    it('should create identity adjustment', () => {
      const adj = $Adjustment.identity()
      expect(adj.exposure).toBe(0)
      expect(adj.brightness).toBe(0)
      expect(adj.contrast).toBe(0)
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
      expect($Adjustment.isIdentity({ exposure: 0, brightness: 0, contrast: 0 })).toBe(true)
    })

    it('should return false for non-identity', () => {
      expect($Adjustment.isIdentity({ exposure: 0, brightness: 0.1, contrast: 0 })).toBe(false)
      expect($Adjustment.isIdentity({ exposure: 0, brightness: 0, contrast: 0.1 })).toBe(false)
    })
  })

  describe('exposure (linear)', () => {
    it('should brighten with positive EV', () => {
      const adj = { exposure: 1, brightness: 0, contrast: 0 }
      const lut = $Adjustment.toLut(adj)

      // +1EV = 2倍の明るさ (線形光空間で)
      // 中間調が明るくなる
      expect(lut[128]).toBeGreaterThan(128)
      // 端点
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
    })

    it('should darken with negative EV', () => {
      const adj = { exposure: -1, brightness: 0, contrast: 0 }
      const lut = $Adjustment.toLut(adj)

      // -1EV = 1/2の明るさ
      expect(lut[128]).toBeLessThan(128)
      expect(lut[192]).toBeLessThan(192)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 1.5, brightness: 0, contrast: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })

    it('should apply in linear light space', () => {
      // sRGB 中間値 (118) は線形で約0.18 (18%グレー)
      // +1EV で線形 0.36 → sRGB で約168程度になるはず
      const adj = { exposure: 1, brightness: 0, contrast: 0 }
      const lut = $Adjustment.toLut(adj)

      // 118 (sRGB) ≈ 0.18 (linear) → 0.36 (linear) ≈ 168 (sRGB)
      expect(lut[118]).toBeGreaterThan(150)
      expect(lut[118]).toBeLessThan(180)
    })
  })

  describe('brightness (gamma)', () => {
    it('should brighten with positive value', () => {
      const adj = { exposure: 0, brightness: 0.5, contrast: 0 }
      const lut = $Adjustment.toLut(adj)

      // 暗いピクセルが明るくなる
      expect(lut[64]).toBeGreaterThan(64)
      expect(lut[128]).toBeGreaterThan(128)
      // 端点は維持
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
    })

    it('should darken with negative value', () => {
      const adj = { exposure: 0, brightness: -0.5, contrast: 0 }
      const lut = $Adjustment.toLut(adj)

      // 明るいピクセルが暗くなる
      expect(lut[128]).toBeLessThan(128)
      expect(lut[192]).toBeLessThan(192)
      // 端点は維持
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 0, brightness: 0.8, contrast: 0 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })
  })

  describe('contrast (sigmoid)', () => {
    it('should increase contrast with positive value', () => {
      const adj = { exposure: 0, brightness: 0, contrast: 0.5 }
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
      const adj = { exposure: 0, brightness: 0, contrast: -0.5 }
      const lut = $Adjustment.toLut(adj)

      // 負のコントラストは中央(128)に向かって圧縮
      // シャドウは明るく、ハイライトは暗くなる
      expect(lut[64]).toBeGreaterThan(64)
      expect(lut[192]).toBeLessThan(192)
      // 中央は変わらない
      expect(lut[128]).toBe(128)
    })

    it('should compress to mid-gray at contrast -1', () => {
      const adj = { exposure: 0, brightness: 0, contrast: -1 }
      const lut = $Adjustment.toLut(adj)

      // contrast = -1 で全て中央に
      expect(lut[0]).toBe(128)
      expect(lut[64]).toBe(128)
      expect(lut[128]).toBe(128)
      expect(lut[192]).toBe(128)
      expect(lut[255]).toBe(128)
    })

    it('should maintain monotonicity', () => {
      const adj = { exposure: 0, brightness: 0, contrast: 0.8 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })
  })

  describe('combined adjustments', () => {
    it('should apply brightness then contrast', () => {
      const adj = { exposure: 0, brightness: 0.3, contrast: 0.3 }
      const lut = $Adjustment.toLut(adj)

      // 全体的に明るく、コントラストも上がる
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
      // 中間値がシフト
      expect(lut[128]).toBeGreaterThan(128)
    })

    it('should not clip values', () => {
      const adj = { exposure: 0, brightness: 1, contrast: 1 }
      const lut = $Adjustment.toLut(adj)

      for (let i = 0; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(0)
        expect(lut[i]).toBeLessThanOrEqual(255)
      }
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
