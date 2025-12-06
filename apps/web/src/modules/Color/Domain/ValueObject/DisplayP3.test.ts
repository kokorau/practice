import { describe, it, expect } from 'vitest'
import { $DisplayP3 } from './DisplayP3'
import type { Srgb } from './Srgb'

describe('DisplayP3', () => {
  describe('fromSrgb', () => {
    it('should convert black correctly', () => {
      const srgb: Srgb = { r: 0, g: 0, b: 0 }
      const p3 = $DisplayP3.fromSrgb(srgb)

      expect(p3.r).toBeCloseTo(0, 5)
      expect(p3.g).toBeCloseTo(0, 5)
      expect(p3.b).toBeCloseTo(0, 5)
    })

    it('should convert white correctly', () => {
      const srgb: Srgb = { r: 1, g: 1, b: 1 }
      const p3 = $DisplayP3.fromSrgb(srgb)

      // White should map to approximately (1, 1, 1) in Display P3
      expect(p3.r).toBeCloseTo(1, 2)
      expect(p3.g).toBeCloseTo(1, 2)
      expect(p3.b).toBeCloseTo(1, 2)
    })

    it('should convert sRGB red to P3 values', () => {
      const srgb: Srgb = { r: 1, g: 0, b: 0 }
      const p3 = $DisplayP3.fromSrgb(srgb)

      // sRGB red is inside P3, so values should be positive
      expect(p3.r).toBeGreaterThan(0)
      expect(p3.r).toBeLessThan(1) // sRGB red doesn't reach P3 red primary
    })

    it('should convert mid-gray correctly', () => {
      const srgb: Srgb = { r: 0.5, g: 0.5, b: 0.5 }
      const p3 = $DisplayP3.fromSrgb(srgb)

      // Gray should have similar values in all channels
      expect(Math.abs(p3.r - p3.g)).toBeLessThan(0.01)
      expect(Math.abs(p3.g - p3.b)).toBeLessThan(0.01)
    })
  })

  describe('toSrgb', () => {
    it('should round-trip black correctly', () => {
      const original: Srgb = { r: 0, g: 0, b: 0 }
      const p3 = $DisplayP3.fromSrgb(original)
      const result = $DisplayP3.toSrgb(p3)

      expect(result.r).toBeCloseTo(original.r, 3)
      expect(result.g).toBeCloseTo(original.g, 3)
      expect(result.b).toBeCloseTo(original.b, 3)
    })

    it('should round-trip white correctly', () => {
      const original: Srgb = { r: 1, g: 1, b: 1 }
      const p3 = $DisplayP3.fromSrgb(original)
      const result = $DisplayP3.toSrgb(p3)

      expect(result.r).toBeCloseTo(original.r, 2)
      expect(result.g).toBeCloseTo(original.g, 2)
      expect(result.b).toBeCloseTo(original.b, 2)
    })

    it('should round-trip mid-tone colors', () => {
      const original: Srgb = { r: 0.5, g: 0.3, b: 0.7 }
      const p3 = $DisplayP3.fromSrgb(original)
      const result = $DisplayP3.toSrgb(p3)

      expect(result.r).toBeCloseTo(original.r, 2)
      expect(result.g).toBeCloseTo(original.g, 2)
      expect(result.b).toBeCloseTo(original.b, 2)
    })

    it('should clip out-of-sRGB-gamut P3 colors', () => {
      // P3 red primary (1, 0, 0 in P3) is outside sRGB
      const p3Red = $DisplayP3.create(1, 0, 0)
      const srgb = $DisplayP3.toSrgb(p3Red)

      // Should be clipped to valid sRGB range
      expect(srgb.r).toBeLessThanOrEqual(1)
      expect(srgb.g).toBeGreaterThanOrEqual(0)
      expect(srgb.b).toBeGreaterThanOrEqual(0)
    })
  })

  describe('toXyz / fromXyz', () => {
    it('should round-trip through XYZ', () => {
      const original = $DisplayP3.create(0.5, 0.3, 0.7)
      const xyz = $DisplayP3.toXyz(original)
      const result = $DisplayP3.fromXyz(xyz)

      expect(result.r).toBeCloseTo(original.r, 5)
      expect(result.g).toBeCloseTo(original.g, 5)
      expect(result.b).toBeCloseTo(original.b, 5)
    })
  })

  describe('isInGamut', () => {
    it('should return true for valid colors', () => {
      const p3 = $DisplayP3.create(0.5, 0.5, 0.5)
      expect($DisplayP3.isInGamut(p3)).toBe(true)
    })

    it('should return false for out-of-gamut colors', () => {
      const p3 = $DisplayP3.create(1.1, 0.5, 0.5)
      expect($DisplayP3.isInGamut(p3)).toBe(false)
    })

    it('should return false for negative values', () => {
      const p3 = $DisplayP3.create(-0.1, 0.5, 0.5)
      expect($DisplayP3.isInGamut(p3)).toBe(false)
    })
  })
})
