import { describe, it, expect } from 'vitest'
import { $Curve, type Curve } from './Curve'

describe('$Curve', () => {
  describe('identity', () => {
    it('should create linear curve with specified points', () => {
      const curve = $Curve.identity(7)
      expect(curve.points).toHaveLength(7)
      expect(curve.points[0]).toBeCloseTo(0)
      expect(curve.points[3]).toBeCloseTo(0.5)
      expect(curve.points[6]).toBeCloseTo(1)
    })

    it('should create identity LUT', () => {
      const curve = $Curve.identity(7)
      const lut = $Curve.toLut(curve)

      expect(lut[0]).toBe(0)
      expect(lut[127]).toBe(127)
      expect(lut[255]).toBe(255)
    })
  })

  describe('getXPositions', () => {
    it('should return equally spaced x values', () => {
      const xs = $Curve.getXPositions(7)
      expect(xs).toHaveLength(7)
      expect(xs[0]).toBe(0)
      expect(xs[1]).toBeCloseTo(1 / 6)
      expect(xs[6]).toBe(1)
    })
  })

  describe('toLut', () => {
    it('should brighten with increased points', () => {
      const curve: Curve = {
        points: [0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 1.0],
      }
      const lut = $Curve.toLut(curve)

      // 暗い入力値が明るくなる
      expect(lut[0]).toBe(Math.round(0.2 * 255))
      expect(lut[255]).toBe(255)
    })

    it('should darken with decreased points', () => {
      const curve: Curve = {
        points: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8],
      }
      const lut = $Curve.toLut(curve)

      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(Math.round(0.8 * 255))
    })

    it('should handle S-curve (contrast boost)', () => {
      const curve: Curve = {
        points: [0, 0.05, 0.2, 0.5, 0.8, 0.95, 1],
      }
      const lut = $Curve.toLut(curve)

      // 端点は維持
      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
      // 中間は変化
      expect(lut[127]).toBeGreaterThan(110)
      expect(lut[127]).toBeLessThan(145)
    })
  })

  describe('monotonic interpolation', () => {
    it('should produce monotonically increasing output for increasing input', () => {
      const curve: Curve = {
        points: [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1],
      }
      const lut = $Curve.toLut(curve)

      // すべての隣接要素で単調増加をチェック
      for (let i = 1; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]!)
      }
    })

    it('should not overshoot beyond control points', () => {
      const curve: Curve = {
        points: [0, 0.3, 0.3, 0.5, 0.7, 0.7, 1],
      }
      const lut = $Curve.toLut(curve)

      // 最小・最大を超えない
      for (let i = 0; i < 256; i++) {
        expect(lut[i]).toBeGreaterThanOrEqual(0)
        expect(lut[i]).toBeLessThanOrEqual(255)
      }
    })

    it('should handle flat regions gracefully', () => {
      const curve: Curve = {
        points: [0, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
      }
      const lut = $Curve.toLut(curve)

      expect(lut[0]).toBe(0)
      expect(lut[255]).toBe(255)
      // 中央付近は0.5付近
      expect(lut[127]).toBeGreaterThan(100)
      expect(lut[127]).toBeLessThan(155)
    })
  })

  describe('getInterpolator', () => {
    it('should return function that interpolates values', () => {
      const curve = $Curve.identity(7)
      const interpolate = $Curve.getInterpolator(curve)

      expect(interpolate(0)).toBeCloseTo(0)
      expect(interpolate(0.5)).toBeCloseTo(0.5)
      expect(interpolate(1)).toBeCloseTo(1)
    })

    it('should clamp values outside range', () => {
      const curve = $Curve.identity(7)
      const interpolate = $Curve.getInterpolator(curve)

      expect(interpolate(-0.5)).toBeCloseTo(0)
      expect(interpolate(1.5)).toBeCloseTo(1)
    })
  })
})
