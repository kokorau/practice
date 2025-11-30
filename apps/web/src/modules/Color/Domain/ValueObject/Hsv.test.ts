import { describe, it, expect } from 'vitest'
import { $Hsv } from './Hsv'
import { $Srgb } from './Srgb'

describe('$Hsv', () => {
  describe('create', () => {
    it('should create valid Hsv', () => {
      const color = $Hsv.create(180, 0.5, 0.8)
      expect(color).toEqual({ h: 180, s: 0.5, v: 0.8 })
    })

    it('should handle edge values', () => {
      const black = $Hsv.create(0, 0, 0)
      expect(black).toEqual({ h: 0, s: 0, v: 0 })

      const white = $Hsv.create(0, 0, 1)
      expect(white).toEqual({ h: 0, s: 0, v: 1 })
    })
  })

  describe('fromSrgb', () => {
    it('should convert black', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(0, 0, 0))
      expect(hsv.h).toBe(0)
      expect(hsv.s).toBe(0)
      expect(hsv.v).toBe(0)
    })

    it('should convert white', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(1, 1, 1))
      expect(hsv.h).toBe(0)
      expect(hsv.s).toBe(0)
      expect(hsv.v).toBe(1)
    })

    it('should convert pure red', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(1, 0, 0))
      expect(hsv.h).toBe(0)
      expect(hsv.s).toBe(1)
      expect(hsv.v).toBe(1)
    })

    it('should convert pure green', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(0, 1, 0))
      expect(hsv.h).toBe(120)
      expect(hsv.s).toBe(1)
      expect(hsv.v).toBe(1)
    })

    it('should convert pure blue', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(0, 0, 1))
      expect(hsv.h).toBe(240)
      expect(hsv.s).toBe(1)
      expect(hsv.v).toBe(1)
    })

    it('should convert yellow', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(1, 1, 0))
      expect(hsv.h).toBe(60)
      expect(hsv.s).toBe(1)
      expect(hsv.v).toBe(1)
    })

    it('should convert cyan', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(0, 1, 1))
      expect(hsv.h).toBe(180)
      expect(hsv.s).toBe(1)
      expect(hsv.v).toBe(1)
    })

    it('should convert magenta', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(1, 0, 1))
      expect(hsv.h).toBe(300)
      expect(hsv.s).toBe(1)
      expect(hsv.v).toBe(1)
    })

    it('should convert gray (achromatic)', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(0.5, 0.5, 0.5))
      expect(hsv.h).toBe(0)
      expect(hsv.s).toBe(0)
      expect(hsv.v).toBe(0.5)
    })

    it('should convert dark red (low value)', () => {
      const hsv = $Hsv.fromSrgb($Srgb.create(0.5, 0, 0))
      expect(hsv.h).toBe(0)
      expect(hsv.s).toBe(1)
      expect(hsv.v).toBe(0.5)
    })
  })

  describe('toSrgb', () => {
    it('should convert black', () => {
      const rgb = $Hsv.toSrgb($Hsv.create(0, 0, 0))
      expect(rgb).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('should convert white', () => {
      const rgb = $Hsv.toSrgb($Hsv.create(0, 0, 1))
      expect(rgb).toEqual({ r: 1, g: 1, b: 1 })
    })

    it('should convert pure red', () => {
      const rgb = $Hsv.toSrgb($Hsv.create(0, 1, 1))
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should convert pure green', () => {
      const rgb = $Hsv.toSrgb($Hsv.create(120, 1, 1))
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should convert pure blue', () => {
      const rgb = $Hsv.toSrgb($Hsv.create(240, 1, 1))
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })

    it('should convert yellow', () => {
      const rgb = $Hsv.toSrgb($Hsv.create(60, 1, 1))
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should convert cyan', () => {
      const rgb = $Hsv.toSrgb($Hsv.create(180, 1, 1))
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })

    it('should convert magenta', () => {
      const rgb = $Hsv.toSrgb($Hsv.create(300, 1, 1))
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })

    it('should handle all hue sectors', () => {
      // 0-60: red to yellow
      const sector0 = $Hsv.toSrgb($Hsv.create(30, 1, 1))
      expect(sector0.r).toBeCloseTo(1, 5)
      expect(sector0.g).toBeCloseTo(0.5, 5)
      expect(sector0.b).toBeCloseTo(0, 5)

      // 60-120: yellow to green
      const sector1 = $Hsv.toSrgb($Hsv.create(90, 1, 1))
      expect(sector1.r).toBeCloseTo(0.5, 5)
      expect(sector1.g).toBeCloseTo(1, 5)
      expect(sector1.b).toBeCloseTo(0, 5)

      // 120-180: green to cyan
      const sector2 = $Hsv.toSrgb($Hsv.create(150, 1, 1))
      expect(sector2.r).toBeCloseTo(0, 5)
      expect(sector2.g).toBeCloseTo(1, 5)
      expect(sector2.b).toBeCloseTo(0.5, 5)

      // 180-240: cyan to blue
      const sector3 = $Hsv.toSrgb($Hsv.create(210, 1, 1))
      expect(sector3.r).toBeCloseTo(0, 5)
      expect(sector3.g).toBeCloseTo(0.5, 5)
      expect(sector3.b).toBeCloseTo(1, 5)

      // 240-300: blue to magenta
      const sector4 = $Hsv.toSrgb($Hsv.create(270, 1, 1))
      expect(sector4.r).toBeCloseTo(0.5, 5)
      expect(sector4.g).toBeCloseTo(0, 5)
      expect(sector4.b).toBeCloseTo(1, 5)

      // 300-360: magenta to red
      const sector5 = $Hsv.toSrgb($Hsv.create(330, 1, 1))
      expect(sector5.r).toBeCloseTo(1, 5)
      expect(sector5.g).toBeCloseTo(0, 5)
      expect(sector5.b).toBeCloseTo(0.5, 5)
    })

    it('should handle low saturation (desaturated colors)', () => {
      const pastelRed = $Hsv.toSrgb($Hsv.create(0, 0.3, 1))
      expect(pastelRed.r).toBeCloseTo(1, 5)
      expect(pastelRed.g).toBeCloseTo(0.7, 5)
      expect(pastelRed.b).toBeCloseTo(0.7, 5)
    })

    it('should handle low value (dark colors)', () => {
      const darkRed = $Hsv.toSrgb($Hsv.create(0, 1, 0.5))
      expect(darkRed.r).toBeCloseTo(0.5, 5)
      expect(darkRed.g).toBeCloseTo(0, 5)
      expect(darkRed.b).toBeCloseTo(0, 5)
    })
  })

  describe('roundtrip conversion', () => {
    it('should preserve values through HSV -> RGB -> HSV', () => {
      const testCases = [
        { h: 0, s: 1, v: 1 },
        { h: 120, s: 0.8, v: 0.9 },
        { h: 240, s: 0.6, v: 0.7 },
        { h: 60, s: 0.5, v: 0.5 },
        { h: 180, s: 0.3, v: 0.6 },
        { h: 300, s: 0.9, v: 0.8 },
      ]

      for (const original of testCases) {
        const rgb = $Hsv.toSrgb(original)
        const roundtrip = $Hsv.fromSrgb(rgb)
        expect(roundtrip.h).toBeCloseTo(original.h, 5)
        expect(roundtrip.s).toBeCloseTo(original.s, 5)
        expect(roundtrip.v).toBeCloseTo(original.v, 5)
      }
    })

    it('should preserve values through RGB -> HSV -> RGB', () => {
      const testCases = [
        $Srgb.create(1, 0, 0),
        $Srgb.create(0, 1, 0),
        $Srgb.create(0, 0, 1),
        $Srgb.create(0.8, 0.4, 0.2),
        $Srgb.create(0.2, 0.6, 0.8),
        $Srgb.create(0.5, 0.5, 0.5),
      ]

      for (const original of testCases) {
        const hsv = $Hsv.fromSrgb(original)
        const roundtrip = $Hsv.toSrgb(hsv)
        expect(roundtrip.r).toBeCloseTo(original.r, 5)
        expect(roundtrip.g).toBeCloseTo(original.g, 5)
        expect(roundtrip.b).toBeCloseTo(original.b, 5)
      }
    })
  })

  describe('pureHue', () => {
    it('should return pure red for h=0', () => {
      const rgb = $Hsv.pureHue(0)
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should return pure green for h=120', () => {
      const rgb = $Hsv.pureHue(120)
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should return pure blue for h=240', () => {
      const rgb = $Hsv.pureHue(240)
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })

    it('should return yellow for h=60', () => {
      const rgb = $Hsv.pureHue(60)
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(0, 5)
    })

    it('should return cyan for h=180', () => {
      const rgb = $Hsv.pureHue(180)
      expect(rgb.r).toBeCloseTo(0, 5)
      expect(rgb.g).toBeCloseTo(1, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })

    it('should return magenta for h=300', () => {
      const rgb = $Hsv.pureHue(300)
      expect(rgb.r).toBeCloseTo(1, 5)
      expect(rgb.g).toBeCloseTo(0, 5)
      expect(rgb.b).toBeCloseTo(1, 5)
    })
  })
})
