import { describe, it, expect } from 'vitest'
import { convertXyYToColorSpaces } from './ConvertXyYToColorSpaces'

describe('convertXyYToColorSpaces', () => {
  describe('D65 white point', () => {
    it('should convert D65 white to approximately equal RGB in all spaces', () => {
      // D65 white point
      const result = convertXyYToColorSpaces(0.31272, 0.32903, 1.0)

      // XYZ should be approximately (0.95, 1.0, 1.09)
      expect(result.xyz.Y).toBeCloseTo(1.0, 3)

      // sRGB should be approximately white (values close to 1)
      expect(result.colorSpaces.srgb.linear.r).toBeCloseTo(1, 0)
      expect(result.colorSpaces.srgb.linear.g).toBeCloseTo(1, 0)
      expect(result.colorSpaces.srgb.linear.b).toBeCloseTo(1, 0)

      // Other spaces should also be close to white
      expect(result.colorSpaces['display-p3'].linear.r).toBeCloseTo(1, 0)
      expect(result.colorSpaces.rec2020.linear.r).toBeCloseTo(1, 0)
    })
  })

  describe('black', () => {
    it('should return zeros for black (Y=0)', () => {
      const result = convertXyYToColorSpaces(0.31272, 0.32903, 0)

      expect(result.xyz.X).toBe(0)
      expect(result.xyz.Y).toBe(0)
      expect(result.xyz.Z).toBe(0)

      expect(result.colorSpaces.srgb.linear.r).toBe(0)
      expect(result.colorSpaces.srgb.linear.g).toBe(0)
      expect(result.colorSpaces.srgb.linear.b).toBe(0)
    })
  })

  describe('sRGB red primary', () => {
    it('should be in sRGB gamut at sRGB red primary xy', () => {
      // sRGB red primary: x=0.64, y=0.33
      const result = convertXyYToColorSpaces(0.64, 0.33, 0.2126)

      expect(result.xyGamut.srgb).toBe(true)
      expect(result.xyGamut['display-p3']).toBe(true)
      expect(result.xyGamut.rec2020).toBe(true)
    })
  })

  describe('out of sRGB gamut', () => {
    it('should detect point outside sRGB but inside P3', () => {
      // Point between sRGB and P3 red primaries
      const result = convertXyYToColorSpaces(0.66, 0.33, 0.5)

      expect(result.xyGamut.srgb).toBe(false)
      expect(result.xyGamut['display-p3']).toBe(true)
      expect(result.xyGamut.rec2020).toBe(true)
    })

    it('should have out-of-gamut RGB values for sRGB', () => {
      // P3 red primary is outside sRGB
      const result = convertXyYToColorSpaces(0.68, 0.32, 0.5)

      // sRGB should have out-of-gamut values (negative g or b)
      expect(result.colorSpaces.srgb.inGamut).toBe(false)

      // xy coordinate should be in P3 triangle
      expect(result.xyGamut['display-p3']).toBe(true)
    })
  })

  describe('CSS color output', () => {
    it('should generate valid CSS color strings', () => {
      const result = convertXyYToColorSpaces(0.31272, 0.32903, 0.5)

      expect(result.colorSpaces.srgb.css).toMatch(/^color\(srgb [\d.]+ [\d.]+ [\d.]+\)$/)
      expect(result.colorSpaces['display-p3'].css).toMatch(/^color\(display-p3 [\d.]+ [\d.]+ [\d.]+\)$/)
      expect(result.colorSpaces.rec2020.css).toMatch(/^color\(rec2020 [\d.]+ [\d.]+ [\d.]+\)$/)
      // ACES falls back to sRGB
      expect(result.colorSpaces['aces-ap1'].css).toMatch(/^color\(srgb [\d.]+ [\d.]+ [\d.]+\)$/)
    })

    it('should clamp CSS values to 0-1', () => {
      // Out of gamut color
      const result = convertXyYToColorSpaces(0.68, 0.32, 0.5)

      // CSS should be clamped even if linear values are out of range
      const cssMatch = result.colorSpaces.srgb.css.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\)/)
      expect(cssMatch).toBeTruthy()
      if (cssMatch) {
        const [, r, g, b] = cssMatch
        expect(parseFloat(r!)).toBeGreaterThanOrEqual(0)
        expect(parseFloat(r!)).toBeLessThanOrEqual(1)
        expect(parseFloat(g!)).toBeGreaterThanOrEqual(0)
        expect(parseFloat(g!)).toBeLessThanOrEqual(1)
        expect(parseFloat(b!)).toBeGreaterThanOrEqual(0)
        expect(parseFloat(b!)).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('input preservation', () => {
    it('should preserve input values in result', () => {
      const result = convertXyYToColorSpaces(0.4, 0.5, 0.7)

      expect(result.input.x).toBe(0.4)
      expect(result.input.y).toBe(0.5)
      expect(result.input.Y).toBe(0.7)
    })
  })
})
