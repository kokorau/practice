import { describe, it, expect } from 'vitest'
import { $Hsl } from './Hsl'
import { $Srgb } from './Srgb'

describe('$Hsl', () => {
  describe('create', () => {
    it('should create valid Hsl', () => {
      const color = $Hsl.create(180, 0.5, 0.5)
      expect(color).toEqual({ h: 180, s: 0.5, l: 0.5 })
    })

    it('should handle edge values', () => {
      const black = $Hsl.create(0, 0, 0)
      expect(black).toEqual({ h: 0, s: 0, l: 0 })

      const white = $Hsl.create(0, 0, 1)
      expect(white).toEqual({ h: 0, s: 0, l: 1 })
    })
  })

  describe('fromSrgb', () => {
    it('should convert black', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(0, 0, 0))
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(0)
      expect(hsl.l).toBe(0)
    })

    it('should convert white', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(1, 1, 1))
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(0)
      expect(hsl.l).toBe(1)
    })

    it('should convert pure red', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(1, 0, 0))
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(1)
      expect(hsl.l).toBe(0.5)
    })

    it('should convert pure green', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(0, 1, 0))
      expect(hsl.h).toBe(120)
      expect(hsl.s).toBe(1)
      expect(hsl.l).toBe(0.5)
    })

    it('should convert pure blue', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(0, 0, 1))
      expect(hsl.h).toBe(240)
      expect(hsl.s).toBe(1)
      expect(hsl.l).toBe(0.5)
    })

    it('should convert yellow', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(1, 1, 0))
      expect(hsl.h).toBe(60)
      expect(hsl.s).toBe(1)
      expect(hsl.l).toBe(0.5)
    })

    it('should convert cyan', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(0, 1, 1))
      expect(hsl.h).toBe(180)
      expect(hsl.s).toBe(1)
      expect(hsl.l).toBe(0.5)
    })

    it('should convert magenta', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(1, 0, 1))
      expect(hsl.h).toBe(300)
      expect(hsl.s).toBe(1)
      expect(hsl.l).toBe(0.5)
    })

    it('should convert gray (achromatic)', () => {
      const hsl = $Hsl.fromSrgb($Srgb.create(0.5, 0.5, 0.5))
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(0)
      expect(hsl.l).toBe(0.5)
    })
  })

  describe('toSrgb', () => {
    it('should convert black', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(0, 0, 0))
      expect(rgb).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('should convert white', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(0, 0, 1))
      expect(rgb).toEqual({ r: 1, g: 1, b: 1 })
    })

    it('should convert pure red', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(0, 1, 0.5))
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should convert pure green', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(120, 1, 0.5))
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should convert pure blue', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(240, 1, 0.5))
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })

    it('should convert yellow', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(60, 1, 0.5))
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should convert cyan', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(180, 1, 0.5))
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })

    it('should convert magenta', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(300, 1, 0.5))
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })

    it('should convert gray (saturation = 0)', () => {
      const rgb = $Hsl.toSrgb($Hsl.create(0, 0, 0.5))
      expect(rgb).toEqual({ r: 0.5, g: 0.5, b: 0.5 })
    })

    it('should handle all hue sectors', () => {
      // 0-60: red to yellow
      const sector0 = $Hsl.toSrgb($Hsl.create(30, 1, 0.5))
      expect(sector0.r).toBeCloseTo(1, 5)
      expect(sector0.g).toBeCloseTo(0.5, 5)
      expect(sector0.b).toBeCloseTo(0, 5)

      // 60-120: yellow to green
      const sector1 = $Hsl.toSrgb($Hsl.create(90, 1, 0.5))
      expect(sector1.r).toBeCloseTo(0.5, 5)
      expect(sector1.g).toBeCloseTo(1, 5)
      expect(sector1.b).toBeCloseTo(0, 5)

      // 120-180: green to cyan
      const sector2 = $Hsl.toSrgb($Hsl.create(150, 1, 0.5))
      expect(sector2.r).toBeCloseTo(0, 5)
      expect(sector2.g).toBeCloseTo(1, 5)
      expect(sector2.b).toBeCloseTo(0.5, 5)

      // 180-240: cyan to blue
      const sector3 = $Hsl.toSrgb($Hsl.create(210, 1, 0.5))
      expect(sector3.r).toBeCloseTo(0, 5)
      expect(sector3.g).toBeCloseTo(0.5, 5)
      expect(sector3.b).toBeCloseTo(1, 5)

      // 240-300: blue to magenta
      const sector4 = $Hsl.toSrgb($Hsl.create(270, 1, 0.5))
      expect(sector4.r).toBeCloseTo(0.5, 5)
      expect(sector4.g).toBeCloseTo(0, 5)
      expect(sector4.b).toBeCloseTo(1, 5)

      // 300-360: magenta to red
      const sector5 = $Hsl.toSrgb($Hsl.create(330, 1, 0.5))
      expect(sector5.r).toBeCloseTo(1, 5)
      expect(sector5.g).toBeCloseTo(0, 5)
      expect(sector5.b).toBeCloseTo(0.5, 5)
    })
  })

  describe('roundtrip conversion', () => {
    it('should preserve values through HSL -> RGB -> HSL', () => {
      const testCases = [
        { h: 0, s: 1, l: 0.5 },
        { h: 120, s: 0.8, l: 0.4 },
        { h: 240, s: 0.6, l: 0.7 },
        { h: 60, s: 0.5, l: 0.5 },
        { h: 180, s: 0.3, l: 0.6 },
        { h: 300, s: 0.9, l: 0.3 },
      ]

      for (const original of testCases) {
        const rgb = $Hsl.toSrgb(original)
        const roundtrip = $Hsl.fromSrgb(rgb)
        expect(roundtrip.h).toBeCloseTo(original.h, 5)
        expect(roundtrip.s).toBeCloseTo(original.s, 5)
        expect(roundtrip.l).toBeCloseTo(original.l, 5)
      }
    })

    it('should preserve values through RGB -> HSL -> RGB', () => {
      const testCases = [
        $Srgb.create(1, 0, 0),
        $Srgb.create(0, 1, 0),
        $Srgb.create(0, 0, 1),
        $Srgb.create(0.8, 0.4, 0.2),
        $Srgb.create(0.2, 0.6, 0.8),
        $Srgb.create(0.5, 0.5, 0.5),
      ]

      for (const original of testCases) {
        const hsl = $Hsl.fromSrgb(original)
        const roundtrip = $Hsl.toSrgb(hsl)
        expect(roundtrip.r).toBeCloseTo(original.r, 5)
        expect(roundtrip.g).toBeCloseTo(original.g, 5)
        expect(roundtrip.b).toBeCloseTo(original.b, 5)
      }
    })
  })

  describe('toCylindrical', () => {
    it('should convert to cylindrical coordinates for black', () => {
      const [x, y, z] = $Hsl.toCylindrical($Hsl.create(0, 0, 0))
      expect(x).toBe(0.5) // center x (s=0)
      expect(y).toBe(0.5) // center y (s=0)
      expect(z).toBe(0) // bottom (l=0)
    })

    it('should convert to cylindrical coordinates for white', () => {
      const [x, y, z] = $Hsl.toCylindrical($Hsl.create(0, 0, 1))
      expect(x).toBe(0.5) // center x (s=0)
      expect(y).toBe(0.5) // center y (s=0)
      expect(z).toBe(1) // top (l=1)
    })

    it('should convert pure red at edge', () => {
      const [x, y, z] = $Hsl.toCylindrical($Hsl.create(0, 1, 0.5))
      expect(x).toBeCloseTo(1, 5) // s * cos(0) * 0.5 + 0.5 = 1
      expect(y).toBeCloseTo(0.5, 5) // s * sin(0) * 0.5 + 0.5 = 0.5
      expect(z).toBe(0.5)
    })

    it('should convert pure green at edge', () => {
      const [x, y, z] = $Hsl.toCylindrical($Hsl.create(120, 1, 0.5))
      expect(x).toBeCloseTo(0.25, 5) // s * cos(120°) * 0.5 + 0.5
      expect(y).toBeCloseTo(0.933, 2) // s * sin(120°) * 0.5 + 0.5
      expect(z).toBe(0.5)
    })

    it('should convert pure blue at edge', () => {
      const [x, y, z] = $Hsl.toCylindrical($Hsl.create(240, 1, 0.5))
      expect(x).toBeCloseTo(0.25, 5) // s * cos(240°) * 0.5 + 0.5
      expect(y).toBeCloseTo(0.067, 2) // s * sin(240°) * 0.5 + 0.5
      expect(z).toBe(0.5)
    })
  })
})
