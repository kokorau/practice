import { describe, it, expect } from 'vitest'
import { $LinearRgb } from './LinearRgb'

describe('$LinearRgb', () => {
  const GAMMA = 2.2

  describe('create', () => {
    it('should create valid LinearRgb', () => {
      const color = $LinearRgb.create(0.5, 0.3, 0.8)
      expect(color).toEqual({ r: 0.5, g: 0.3, b: 0.8 })
    })

    it('should handle edge values', () => {
      const black = $LinearRgb.create(0, 0, 0)
      expect(black).toEqual({ r: 0, g: 0, b: 0 })

      const white = $LinearRgb.create(1, 1, 1)
      expect(white).toEqual({ r: 1, g: 1, b: 1 })
    })
  })

  describe('fromSrgb', () => {
    it('should convert black (no change)', () => {
      const linear = $LinearRgb.fromSrgb({ r: 0, g: 0, b: 0 })
      expect(linear.r).toBe(0)
      expect(linear.g).toBe(0)
      expect(linear.b).toBe(0)
    })

    it('should convert white (no change)', () => {
      const linear = $LinearRgb.fromSrgb({ r: 1, g: 1, b: 1 })
      expect(linear.r).toBe(1)
      expect(linear.g).toBe(1)
      expect(linear.b).toBe(1)
    })

    it('should apply gamma correction (darker result)', () => {
      // sRGB 0.5 should become darker in linear space
      const linear = $LinearRgb.fromSrgb({ r: 0.5, g: 0.5, b: 0.5 })
      const expected = Math.pow(0.5, GAMMA)
      expect(linear.r).toBeCloseTo(expected, 5)
      expect(linear.g).toBeCloseTo(expected, 5)
      expect(linear.b).toBeCloseTo(expected, 5)
      // Linear value should be less than sRGB value (darker)
      expect(linear.r).toBeLessThan(0.5)
    })

    it('should convert pure red', () => {
      const linear = $LinearRgb.fromSrgb({ r: 1, g: 0, b: 0 })
      expect(linear.r).toBe(1)
      expect(linear.g).toBe(0)
      expect(linear.b).toBe(0)
    })

    it('should convert different values per channel', () => {
      const srgb = { r: 0.2, g: 0.5, b: 0.8 }
      const linear = $LinearRgb.fromSrgb(srgb)
      expect(linear.r).toBeCloseTo(Math.pow(0.2, GAMMA), 5)
      expect(linear.g).toBeCloseTo(Math.pow(0.5, GAMMA), 5)
      expect(linear.b).toBeCloseTo(Math.pow(0.8, GAMMA), 5)
    })
  })

  describe('toSrgb', () => {
    it('should convert black (no change)', () => {
      const srgb = $LinearRgb.toSrgb($LinearRgb.create(0, 0, 0))
      expect(srgb.r).toBe(0)
      expect(srgb.g).toBe(0)
      expect(srgb.b).toBe(0)
    })

    it('should convert white (no change)', () => {
      const srgb = $LinearRgb.toSrgb($LinearRgb.create(1, 1, 1))
      expect(srgb.r).toBe(1)
      expect(srgb.g).toBe(1)
      expect(srgb.b).toBe(1)
    })

    it('should apply inverse gamma (brighter result)', () => {
      // Linear 0.5 should become brighter in sRGB space
      const linearValue = 0.5
      const srgb = $LinearRgb.toSrgb($LinearRgb.create(linearValue, linearValue, linearValue))
      const expected = Math.pow(linearValue, 1 / GAMMA)
      expect(srgb.r).toBeCloseTo(expected, 5)
      expect(srgb.g).toBeCloseTo(expected, 5)
      expect(srgb.b).toBeCloseTo(expected, 5)
      // sRGB value should be greater than linear value (brighter)
      expect(srgb.r).toBeGreaterThan(0.5)
    })

    it('should convert pure red', () => {
      const srgb = $LinearRgb.toSrgb($LinearRgb.create(1, 0, 0))
      expect(srgb.r).toBe(1)
      expect(srgb.g).toBe(0)
      expect(srgb.b).toBe(0)
    })

    it('should convert different values per channel', () => {
      const linear = $LinearRgb.create(0.1, 0.3, 0.6)
      const srgb = $LinearRgb.toSrgb(linear)
      expect(srgb.r).toBeCloseTo(Math.pow(0.1, 1 / GAMMA), 5)
      expect(srgb.g).toBeCloseTo(Math.pow(0.3, 1 / GAMMA), 5)
      expect(srgb.b).toBeCloseTo(Math.pow(0.6, 1 / GAMMA), 5)
    })
  })

  describe('roundtrip conversion', () => {
    it('should preserve values through sRGB -> Linear -> sRGB', () => {
      const testCases = [
        { r: 0, g: 0, b: 0 },
        { r: 1, g: 1, b: 1 },
        { r: 0.5, g: 0.5, b: 0.5 },
        { r: 0.2, g: 0.4, b: 0.8 },
        { r: 1, g: 0, b: 0 },
        { r: 0, g: 1, b: 0 },
        { r: 0, g: 0, b: 1 },
      ]

      for (const original of testCases) {
        const linear = $LinearRgb.fromSrgb(original)
        const roundtrip = $LinearRgb.toSrgb(linear)
        expect(roundtrip.r).toBeCloseTo(original.r, 5)
        expect(roundtrip.g).toBeCloseTo(original.g, 5)
        expect(roundtrip.b).toBeCloseTo(original.b, 5)
      }
    })

    it('should preserve values through Linear -> sRGB -> Linear', () => {
      const testCases = [
        $LinearRgb.create(0, 0, 0),
        $LinearRgb.create(1, 1, 1),
        $LinearRgb.create(0.5, 0.5, 0.5),
        $LinearRgb.create(0.1, 0.3, 0.7),
        $LinearRgb.create(1, 0, 0),
        $LinearRgb.create(0, 1, 0),
        $LinearRgb.create(0, 0, 1),
      ]

      for (const original of testCases) {
        const srgb = $LinearRgb.toSrgb(original)
        const roundtrip = $LinearRgb.fromSrgb(srgb)
        expect(roundtrip.r).toBeCloseTo(original.r, 5)
        expect(roundtrip.g).toBeCloseTo(original.g, 5)
        expect(roundtrip.b).toBeCloseTo(original.b, 5)
      }
    })
  })

  describe('gamma behavior', () => {
    it('should use gamma 2.2', () => {
      // Verify the gamma value by checking a known conversion
      const srgb = { r: 0.5, g: 0.5, b: 0.5 }
      const linear = $LinearRgb.fromSrgb(srgb)
      // With gamma 2.2, 0.5^2.2 ≈ 0.2176
      expect(linear.r).toBeCloseTo(0.2176, 3)
    })

    it('should make mid-tones darker in linear space', () => {
      // This is the key property of gamma - perceptual mid-gray (0.5)
      // is actually quite dark in linear light
      const srgb = { r: 0.5, g: 0.5, b: 0.5 }
      const linear = $LinearRgb.fromSrgb(srgb)
      expect(linear.r).toBeLessThan(0.3)
    })

    it('should preserve linearity for light mixing calculations', () => {
      // In linear space, adding two 50% lights should give 100% brightness
      // (which would clip), not 100% * 2^(1/2.2) as it would in sRGB
      const light1 = $LinearRgb.fromSrgb({ r: 0.5, g: 0.5, b: 0.5 })
      const light2 = $LinearRgb.fromSrgb({ r: 0.5, g: 0.5, b: 0.5 })
      const combined = {
        r: light1.r + light2.r,
        g: light1.g + light2.g,
        b: light1.b + light2.b,
      }
      // Two sRGB 0.5 values in linear space should sum to about 0.435
      expect(combined.r).toBeCloseTo(0.435, 2)
    })
  })
})
