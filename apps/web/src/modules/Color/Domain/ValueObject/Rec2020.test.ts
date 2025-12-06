import { describe, it, expect } from 'vitest'
import { $Rec2020 } from './Rec2020'
import type { Srgb } from './Srgb'

describe('Rec2020', () => {
  describe('fromSrgb', () => {
    it('should convert black correctly', () => {
      const srgb: Srgb = { r: 0, g: 0, b: 0 }
      const rec2020 = $Rec2020.fromSrgb(srgb)

      expect(rec2020.r).toBeCloseTo(0, 5)
      expect(rec2020.g).toBeCloseTo(0, 5)
      expect(rec2020.b).toBeCloseTo(0, 5)
    })

    it('should convert white correctly', () => {
      const srgb: Srgb = { r: 1, g: 1, b: 1 }
      const rec2020 = $Rec2020.fromSrgb(srgb)

      // White should map to approximately (1, 1, 1) in Rec.2020
      expect(rec2020.r).toBeCloseTo(1, 2)
      expect(rec2020.g).toBeCloseTo(1, 2)
      expect(rec2020.b).toBeCloseTo(1, 2)
    })

    it('should convert sRGB red to smaller Rec.2020 values', () => {
      const srgb: Srgb = { r: 1, g: 0, b: 0 }
      const rec2020 = $Rec2020.fromSrgb(srgb)

      // sRGB red is inside Rec.2020, so values should be positive but not all 1
      expect(rec2020.r).toBeGreaterThan(0)
      expect(rec2020.r).toBeLessThan(1)
    })

    it('should convert mid-gray correctly', () => {
      const srgb: Srgb = { r: 0.5, g: 0.5, b: 0.5 }
      const rec2020 = $Rec2020.fromSrgb(srgb)

      // Gray should have similar values in all channels
      expect(Math.abs(rec2020.r - rec2020.g)).toBeLessThan(0.01)
      expect(Math.abs(rec2020.g - rec2020.b)).toBeLessThan(0.01)
    })
  })

  describe('toSrgb', () => {
    it('should round-trip black correctly', () => {
      const original: Srgb = { r: 0, g: 0, b: 0 }
      const rec2020 = $Rec2020.fromSrgb(original)
      const result = $Rec2020.toSrgb(rec2020)

      expect(result.r).toBeCloseTo(original.r, 3)
      expect(result.g).toBeCloseTo(original.g, 3)
      expect(result.b).toBeCloseTo(original.b, 3)
    })

    it('should round-trip white correctly', () => {
      const original: Srgb = { r: 1, g: 1, b: 1 }
      const rec2020 = $Rec2020.fromSrgb(original)
      const result = $Rec2020.toSrgb(rec2020)

      expect(result.r).toBeCloseTo(original.r, 2)
      expect(result.g).toBeCloseTo(original.g, 2)
      expect(result.b).toBeCloseTo(original.b, 2)
    })

    it('should round-trip mid-tone colors', () => {
      const original: Srgb = { r: 0.5, g: 0.3, b: 0.7 }
      const rec2020 = $Rec2020.fromSrgb(original)
      const result = $Rec2020.toSrgb(rec2020)

      expect(result.r).toBeCloseTo(original.r, 2)
      expect(result.g).toBeCloseTo(original.g, 2)
      expect(result.b).toBeCloseTo(original.b, 2)
    })
  })

  describe('toXyz / fromXyz', () => {
    it('should round-trip through XYZ', () => {
      const original = $Rec2020.create(0.5, 0.3, 0.7)
      const xyz = $Rec2020.toXyz(original)
      const result = $Rec2020.fromXyz(xyz)

      expect(result.r).toBeCloseTo(original.r, 5)
      expect(result.g).toBeCloseTo(original.g, 5)
      expect(result.b).toBeCloseTo(original.b, 5)
    })
  })

  describe('isInGamut', () => {
    it('should return true for valid colors', () => {
      const rec2020 = $Rec2020.create(0.5, 0.5, 0.5)
      expect($Rec2020.isInGamut(rec2020)).toBe(true)
    })

    it('should return false for out-of-gamut colors', () => {
      const rec2020 = $Rec2020.create(1.1, 0.5, 0.5)
      expect($Rec2020.isInGamut(rec2020)).toBe(false)
    })

    it('should return false for negative values', () => {
      const rec2020 = $Rec2020.create(-0.1, 0.5, 0.5)
      expect($Rec2020.isInGamut(rec2020)).toBe(false)
    })
  })
})
