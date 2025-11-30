import { describe, it, expect } from 'vitest'
import { $Hex } from './Hex'
import { $Srgb } from './Srgb'

describe('$Hex', () => {
  describe('fromSrgb', () => {
    it('should convert black', () => {
      const hex = $Hex.fromSrgb($Srgb.create(0, 0, 0))
      expect(hex).toBe('#000000')
    })

    it('should convert white', () => {
      const hex = $Hex.fromSrgb($Srgb.create(1, 1, 1))
      expect(hex).toBe('#ffffff')
    })

    it('should convert pure red', () => {
      const hex = $Hex.fromSrgb($Srgb.create(1, 0, 0))
      expect(hex).toBe('#ff0000')
    })

    it('should convert pure green', () => {
      const hex = $Hex.fromSrgb($Srgb.create(0, 1, 0))
      expect(hex).toBe('#00ff00')
    })

    it('should convert pure blue', () => {
      const hex = $Hex.fromSrgb($Srgb.create(0, 0, 1))
      expect(hex).toBe('#0000ff')
    })

    it('should convert mid-gray', () => {
      const hex = $Hex.fromSrgb($Srgb.create(0.5, 0.5, 0.5))
      expect(hex).toBe('#808080')
    })

    it('should pad with zeros for low values', () => {
      const hex = $Hex.fromSrgb($Srgb.create(1 / 255, 10 / 255, 15 / 255))
      expect(hex).toBe('#010a0f')
    })

    it('should convert orange', () => {
      const hex = $Hex.fromSrgb($Srgb.create(1, 0.5, 0))
      expect(hex).toBe('#ff8000')
    })
  })

  describe('toSrgb', () => {
    it('should parse black', () => {
      const rgb = $Hex.toSrgb('#000000')
      expect(rgb.r).toBe(0)
      expect(rgb.g).toBe(0)
      expect(rgb.b).toBe(0)
    })

    it('should parse white', () => {
      const rgb = $Hex.toSrgb('#ffffff')
      expect(rgb.r).toBe(1)
      expect(rgb.g).toBe(1)
      expect(rgb.b).toBe(1)
    })

    it('should parse pure red', () => {
      const rgb = $Hex.toSrgb('#ff0000')
      expect(rgb.r).toBe(1)
      expect(rgb.g).toBe(0)
      expect(rgb.b).toBe(0)
    })

    it('should parse pure green', () => {
      const rgb = $Hex.toSrgb('#00ff00')
      expect(rgb.r).toBe(0)
      expect(rgb.g).toBe(1)
      expect(rgb.b).toBe(0)
    })

    it('should parse pure blue', () => {
      const rgb = $Hex.toSrgb('#0000ff')
      expect(rgb.r).toBe(0)
      expect(rgb.g).toBe(0)
      expect(rgb.b).toBe(1)
    })

    it('should parse mid-gray', () => {
      const rgb = $Hex.toSrgb('#808080')
      expect(rgb.r).toBeCloseTo(128 / 255, 5)
      expect(rgb.g).toBeCloseTo(128 / 255, 5)
      expect(rgb.b).toBeCloseTo(128 / 255, 5)
    })

    it('should parse uppercase hex', () => {
      const rgb = $Hex.toSrgb('#FF8000')
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(128 / 255, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should parse mixed case hex', () => {
      const rgb = $Hex.toSrgb('#FfAa00')
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(170 / 255, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })
  })

  describe('roundtrip conversion', () => {
    it('should preserve values through Srgb -> Hex -> Srgb', () => {
      // Use 255-aligned values to avoid rounding issues
      const testCases = [
        $Srgb.create(0, 0, 0),
        $Srgb.create(1, 1, 1),
        $Srgb.create(1, 0, 0),
        $Srgb.create(0, 1, 0),
        $Srgb.create(0, 0, 1),
        $Srgb.create(128 / 255, 64 / 255, 192 / 255),
      ]

      for (const original of testCases) {
        const hex = $Hex.fromSrgb(original)
        const roundtrip = $Hex.toSrgb(hex)
        expect(roundtrip.r).toBeCloseTo(original.r, 2)
        expect(roundtrip.g).toBeCloseTo(original.g, 2)
        expect(roundtrip.b).toBeCloseTo(original.b, 2)
      }
    })

    it('should preserve values through Hex -> Srgb -> Hex', () => {
      const testCases = [
        '#000000',
        '#ffffff',
        '#ff0000',
        '#00ff00',
        '#0000ff',
        '#ff8000',
        '#804020',
        '#123456',
      ] as const

      for (const original of testCases) {
        const rgb = $Hex.toSrgb(original)
        const roundtrip = $Hex.fromSrgb(rgb)
        expect(roundtrip.toLowerCase()).toBe(original.toLowerCase())
      }
    })
  })
})
