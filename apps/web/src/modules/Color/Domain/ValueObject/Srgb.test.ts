import { describe, it, expect } from 'vitest'
import { $Srgb } from './Srgb'

describe('$Srgb', () => {
  describe('create', () => {
    it('should create valid Srgb with values in range [0, 1]', () => {
      const color = $Srgb.create(0.5, 0.3, 0.8)
      expect(color).toEqual({ r: 0.5, g: 0.3, b: 0.8 })
    })

    it('should clamp values above 1 to 1', () => {
      const color = $Srgb.create(1.5, 2.0, 1.1)
      expect(color).toEqual({ r: 1, g: 1, b: 1 })
    })

    it('should clamp values below 0 to 0', () => {
      const color = $Srgb.create(-0.5, -1.0, -0.1)
      expect(color).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('should handle mixed out-of-range values', () => {
      const color = $Srgb.create(-0.5, 0.5, 1.5)
      expect(color).toEqual({ r: 0, g: 0.5, b: 1 })
    })

    it('should handle edge values 0 and 1', () => {
      const black = $Srgb.create(0, 0, 0)
      expect(black).toEqual({ r: 0, g: 0, b: 0 })

      const white = $Srgb.create(1, 1, 1)
      expect(white).toEqual({ r: 1, g: 1, b: 1 })
    })
  })

  describe('createStrict', () => {
    it('should create valid Srgb with values in range [0, 1]', () => {
      const color = $Srgb.createStrict(0.5, 0.3, 0.8)
      expect(color).toEqual({ r: 0.5, g: 0.3, b: 0.8 })
    })

    it('should throw error for values above 1', () => {
      expect(() => $Srgb.createStrict(1.5, 0.5, 0.5)).toThrow('Srgb values must be in range [0, 1]')
    })

    it('should throw error for values below 0', () => {
      expect(() => $Srgb.createStrict(-0.1, 0.5, 0.5)).toThrow('Srgb values must be in range [0, 1]')
    })

    it('should throw error with details for multiple invalid values', () => {
      expect(() => $Srgb.createStrict(-0.1, 1.5, 2.0)).toThrow('Invalid: r=-0.1, g=1.5, b=2')
    })
  })

  describe('from255', () => {
    it('should convert 0-255 values to 0-1', () => {
      const color = $Srgb.from255(128, 64, 255)
      expect(color.r).toBeCloseTo(128 / 255, 5)
      expect(color.g).toBeCloseTo(64 / 255, 5)
      expect(color.b).toBeCloseTo(255 / 255, 5)
    })

    it('should clamp 255+ values', () => {
      const color = $Srgb.from255(300, 256, 1000)
      expect(color).toEqual({ r: 1, g: 1, b: 1 })
    })

    it('should clamp negative values', () => {
      const color = $Srgb.from255(-10, -1, -100)
      expect(color).toEqual({ r: 0, g: 0, b: 0 })
    })
  })

  describe('to255', () => {
    it('should convert 0-1 values to 0-255', () => {
      const color = $Srgb.create(0.5, 0.25, 1.0)
      const rgb255 = $Srgb.to255(color)
      expect(rgb255.r).toBe(128)
      expect(rgb255.g).toBe(64)
      expect(rgb255.b).toBe(255)
    })

    it('should round values correctly', () => {
      const color = $Srgb.create(0.502, 0.498, 0.999)
      const rgb255 = $Srgb.to255(color)
      expect(rgb255.r).toBe(128) // 0.502 * 255 = 128.01 -> 128
      expect(rgb255.g).toBe(127) // 0.498 * 255 = 126.99 -> 127
      expect(rgb255.b).toBe(255) // 0.999 * 255 = 254.745 -> 255
    })
  })

  describe('toCssRgb', () => {
    it('should convert to CSS rgb() string', () => {
      const color = $Srgb.create(1, 0.5, 0)
      const css = $Srgb.toCssRgb(color)
      expect(css).toBe('rgb(255, 128, 0)')
    })

    it('should handle black and white', () => {
      const black = $Srgb.create(0, 0, 0)
      expect($Srgb.toCssRgb(black)).toBe('rgb(0, 0, 0)')

      const white = $Srgb.create(1, 1, 1)
      expect($Srgb.toCssRgb(white)).toBe('rgb(255, 255, 255)')
    })
  })

  describe('toHex', () => {
    it('should convert to hex string', () => {
      const color = $Srgb.create(1, 0.5, 0)
      const hex = $Srgb.toHex(color)
      expect(hex).toBe('#ff8000')
    })

    it('should pad with zeros', () => {
      const color = $Srgb.create(0.0627, 0.0392, 0.0196) // ~16, 10, 5
      const hex = $Srgb.toHex(color)
      expect(hex).toBe('#100a05')
    })

    it('should handle black and white', () => {
      const black = $Srgb.create(0, 0, 0)
      expect($Srgb.toHex(black)).toBe('#000000')

      const white = $Srgb.create(1, 1, 1)
      expect($Srgb.toHex(white)).toBe('#ffffff')
    })
  })

  describe('fromHex', () => {
    it('should parse hex string with #', () => {
      const color = $Srgb.fromHex('#ff8000')
      expect(color).toBeTruthy()
      if (color) {
        expect(color.r).toBeCloseTo(1, 5)
        expect(color.g).toBeCloseTo(0.5019, 2)
        expect(color.b).toBeCloseTo(0, 5)
      }
    })

    it('should parse hex string without #', () => {
      const color = $Srgb.fromHex('ff8000')
      expect(color).toBeTruthy()
      if (color) {
        expect(color.r).toBeCloseTo(1, 5)
        expect(color.g).toBeCloseTo(0.5019, 2)
        expect(color.b).toBeCloseTo(0, 5)
      }
    })

    it('should return null for invalid hex', () => {
      expect($Srgb.fromHex('invalid')).toBeNull()
      expect($Srgb.fromHex('#gg0000')).toBeNull()
      expect($Srgb.fromHex('#ff00')).toBeNull()  // Too short
      expect($Srgb.fromHex('#ff00000')).toBeNull()  // Too long
    })
  })

  describe('equals', () => {
    it('should return true for equal colors', () => {
      const color1 = $Srgb.create(0.5, 0.3, 0.8)
      const color2 = $Srgb.create(0.5, 0.3, 0.8)
      expect($Srgb.equals(color1, color2)).toBe(true)
    })

    it('should return false for different colors', () => {
      const color1 = $Srgb.create(0.5, 0.3, 0.8)
      const color2 = $Srgb.create(0.5, 0.3, 0.7)
      expect($Srgb.equals(color1, color2)).toBe(false)
    })

    it('should handle floating point tolerance', () => {
      const color1 = $Srgb.create(0.5, 0.3, 0.8)
      const color2 = $Srgb.create(0.5000001, 0.3000001, 0.8000001)
      expect($Srgb.equals(color1, color2)).toBe(true)
      expect($Srgb.equals(color1, color2, 0.0000001)).toBe(false)
    })
  })

  describe('unit cube validation', () => {
    it('should validate that colors are within unit cube', () => {
      // Valid colors within unit cube
      const validColors = [
        $Srgb.create(0, 0, 0),      // Origin
        $Srgb.create(1, 1, 1),      // Opposite corner
        $Srgb.create(0.5, 0.5, 0.5), // Center
        $Srgb.create(1, 0, 0),      // Red corner
        $Srgb.create(0, 1, 0),      // Green corner
        $Srgb.create(0, 0, 1),      // Blue corner
      ]

      for (const color of validColors) {
        expect(color.r).toBeGreaterThanOrEqual(0)
        expect(color.r).toBeLessThanOrEqual(1)
        expect(color.g).toBeGreaterThanOrEqual(0)
        expect(color.g).toBeLessThanOrEqual(1)
        expect(color.b).toBeGreaterThanOrEqual(0)
        expect(color.b).toBeLessThanOrEqual(1)
      }
    })

    it('should clamp colors outside unit cube', () => {
      const clampedColors = [
        $Srgb.create(1.5, 0.5, 0.5),  // r > 1
        $Srgb.create(0.5, -0.5, 0.5), // g < 0
        $Srgb.create(0.5, 0.5, 2.0),  // b > 1
        $Srgb.create(-1, -1, -1),     // All < 0
        $Srgb.create(2, 2, 2),        // All > 1
      ]

      for (const color of clampedColors) {
        // All components should be clamped to [0, 1]
        expect(color.r).toBeGreaterThanOrEqual(0)
        expect(color.r).toBeLessThanOrEqual(1)
        expect(color.g).toBeGreaterThanOrEqual(0)
        expect(color.g).toBeLessThanOrEqual(1)
        expect(color.b).toBeGreaterThanOrEqual(0)
        expect(color.b).toBeLessThanOrEqual(1)
      }
    })
  })
})