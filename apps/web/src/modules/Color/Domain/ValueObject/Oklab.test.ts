import { describe, it, expect } from 'vitest'
import { $Oklab } from './Oklab'

describe('$Oklab', () => {
  describe('fromSrgb', () => {
    it('should convert black to L=0', () => {
      const oklab = $Oklab.fromSrgb({ r: 0, g: 0, b: 0 })
      expect(oklab.L).toBeCloseTo(0, 5)
    })

    it('should convert white to L≈1', () => {
      const oklab = $Oklab.fromSrgb({ r: 255, g: 255, b: 255 })
      expect(oklab.L).toBeCloseTo(1, 2)
    })

    it('should convert mid-gray to L≈0.6', () => {
      // sRGB 128 (perceptually mid) maps to ~0.6 in OKLAB
      const oklab = $Oklab.fromSrgb({ r: 128, g: 128, b: 128 })
      expect(oklab.L).toBeGreaterThan(0.5)
      expect(oklab.L).toBeLessThan(0.7)
    })

    it('should have neutral a,b for grayscale', () => {
      const oklab = $Oklab.fromSrgb({ r: 128, g: 128, b: 128 })
      expect(oklab.a).toBeCloseTo(0, 3)
      expect(oklab.b).toBeCloseTo(0, 3)
    })

    it('should have positive a for red', () => {
      const oklab = $Oklab.fromSrgb({ r: 255, g: 0, b: 0 })
      expect(oklab.a).toBeGreaterThan(0)
    })

    it('should have positive b for yellow', () => {
      const oklab = $Oklab.fromSrgb({ r: 255, g: 255, b: 0 })
      expect(oklab.b).toBeGreaterThan(0)
    })
  })

  describe('toSrgb', () => {
    it('should convert L=0 to black', () => {
      const srgb = $Oklab.toSrgb({ L: 0, a: 0, b: 0 })
      expect(srgb.r).toBe(0)
      expect(srgb.g).toBe(0)
      expect(srgb.b).toBe(0)
    })

    it('should convert L=1 to white', () => {
      const srgb = $Oklab.toSrgb({ L: 1, a: 0, b: 0 })
      expect(srgb.r).toBe(255)
      expect(srgb.g).toBe(255)
      expect(srgb.b).toBe(255)
    })

    it('should round-trip grayscale', () => {
      const original = { r: 128, g: 128, b: 128 }
      const oklab = $Oklab.fromSrgb(original)
      const back = $Oklab.toSrgb(oklab)
      expect(back.r).toBe(original.r)
      expect(back.g).toBe(original.g)
      expect(back.b).toBe(original.b)
    })

    it('should round-trip colors', () => {
      const original = { r: 200, g: 100, b: 50 }
      const oklab = $Oklab.fromSrgb(original)
      const back = $Oklab.toSrgb(oklab)
      expect(back.r).toBe(original.r)
      expect(back.g).toBe(original.g)
      expect(back.b).toBe(original.b)
    })

    it('should clamp out-of-gamut values', () => {
      // High chroma might produce out of gamut
      const srgb = $Oklab.toSrgb({ L: 0.5, a: 0.5, b: 0.5 })
      expect(srgb.r).toBeGreaterThanOrEqual(0)
      expect(srgb.r).toBeLessThanOrEqual(255)
      expect(srgb.g).toBeGreaterThanOrEqual(0)
      expect(srgb.g).toBeLessThanOrEqual(255)
      expect(srgb.b).toBeGreaterThanOrEqual(0)
      expect(srgb.b).toBeLessThanOrEqual(255)
    })
  })

  describe('lightness', () => {
    it('should return 0 for black', () => {
      expect($Oklab.lightness({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5)
    })

    it('should return ~1 for white', () => {
      expect($Oklab.lightness({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 2)
    })
  })

  describe('lightness255', () => {
    it('should return 0 for black', () => {
      expect($Oklab.lightness255({ r: 0, g: 0, b: 0 })).toBe(0)
    })

    it('should return 255 for white', () => {
      expect($Oklab.lightness255({ r: 255, g: 255, b: 255 })).toBe(255)
    })

    it('should return integer value', () => {
      const result = $Oklab.lightness255({ r: 128, g: 128, b: 128 })
      expect(Number.isInteger(result)).toBe(true)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(255)
    })
  })
})
