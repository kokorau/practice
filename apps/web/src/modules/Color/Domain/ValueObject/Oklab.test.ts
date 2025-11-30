import { describe, it, expect } from 'vitest'
import { $Oklab } from './Oklab'

describe('$Oklab', () => {
  describe('fromSrgb', () => {
    it('should convert black to L=0', () => {
      const oklab = $Oklab.fromSrgb({ r: 0, g: 0, b: 0 })
      expect(oklab.L).toBeCloseTo(0, 5)
    })

    it('should convert white to L≈1', () => {
      const oklab = $Oklab.fromSrgb({ r: 1, g: 1, b: 1 })
      expect(oklab.L).toBeCloseTo(1, 2)
    })

    it('should convert mid-gray to L≈0.6', () => {
      // sRGB 0.5 (perceptually mid) maps to ~0.6 in OKLAB
      const oklab = $Oklab.fromSrgb({ r: 0.5, g: 0.5, b: 0.5 })
      expect(oklab.L).toBeGreaterThan(0.5)
      expect(oklab.L).toBeLessThan(0.7)
    })

    it('should have neutral a,b for grayscale', () => {
      const oklab = $Oklab.fromSrgb({ r: 0.5, g: 0.5, b: 0.5 })
      expect(oklab.a).toBeCloseTo(0, 3)
      expect(oklab.b).toBeCloseTo(0, 3)
    })

    it('should have positive a for red', () => {
      const oklab = $Oklab.fromSrgb({ r: 1, g: 0, b: 0 })
      expect(oklab.a).toBeGreaterThan(0)
    })

    it('should have positive b for yellow', () => {
      const oklab = $Oklab.fromSrgb({ r: 1, g: 1, b: 0 })
      expect(oklab.b).toBeGreaterThan(0)
    })
  })

  describe('toSrgb', () => {
    it('should convert L=0 to black', () => {
      const srgb = $Oklab.toSrgb({ L: 0, a: 0, b: 0 })
      expect(srgb.r).toBeCloseTo(0, 5)
      expect(srgb.g).toBeCloseTo(0, 5)
      expect(srgb.b).toBeCloseTo(0, 5)
    })

    it('should convert L=1 to white', () => {
      const srgb = $Oklab.toSrgb({ L: 1, a: 0, b: 0 })
      expect(srgb.r).toBeCloseTo(1, 5)
      expect(srgb.g).toBeCloseTo(1, 5)
      expect(srgb.b).toBeCloseTo(1, 5)
    })

    it('should round-trip grayscale', () => {
      const original = { r: 0.5, g: 0.5, b: 0.5 }
      const oklab = $Oklab.fromSrgb(original)
      const back = $Oklab.toSrgb(oklab)
      expect(back.r).toBeCloseTo(original.r, 2)
      expect(back.g).toBeCloseTo(original.g, 2)
      expect(back.b).toBeCloseTo(original.b, 2)
    })

    it('should round-trip colors', () => {
      const original = { r: 0.784, g: 0.392, b: 0.196 }  // ~200, 100, 50 in 0-255
      const oklab = $Oklab.fromSrgb(original)
      const back = $Oklab.toSrgb(oklab)
      expect(back.r).toBeCloseTo(original.r, 2)
      expect(back.g).toBeCloseTo(original.g, 2)
      expect(back.b).toBeCloseTo(original.b, 2)
    })

    it('should clamp out-of-gamut values', () => {
      // High chroma might produce out of gamut
      const srgb = $Oklab.toSrgb({ L: 0.5, a: 0.5, b: 0.5 })
      expect(srgb.r).toBeGreaterThanOrEqual(0)
      expect(srgb.r).toBeLessThanOrEqual(1)
      expect(srgb.g).toBeGreaterThanOrEqual(0)
      expect(srgb.g).toBeLessThanOrEqual(1)
      expect(srgb.b).toBeGreaterThanOrEqual(0)
      expect(srgb.b).toBeLessThanOrEqual(1)
    })
  })

  describe('lightness', () => {
    it('should return 0 for black', () => {
      expect($Oklab.lightness({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5)
    })

    it('should return ~1 for white', () => {
      expect($Oklab.lightness({ r: 1, g: 1, b: 1 })).toBeCloseTo(1, 2)
    })
  })

  describe('lightness255', () => {
    it('should return 0 for black', () => {
      expect($Oklab.lightness255({ r: 0, g: 0, b: 0 })).toBe(0)
    })

    it('should return 255 for white', () => {
      expect($Oklab.lightness255({ r: 1, g: 1, b: 1 })).toBe(255)
    })

    it('should return integer value', () => {
      const result = $Oklab.lightness255({ r: 0.5, g: 0.5, b: 0.5 })
      expect(Number.isInteger(result)).toBe(true)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(255)
    })
  })
})
