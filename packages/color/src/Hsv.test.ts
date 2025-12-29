import { describe, it, expect } from 'vitest'
import { $Hsv, type Hsv } from './Hsv'

describe('$Hsv', () => {
  describe('toSrgb', () => {
    describe('primary colors', () => {
      it('red (H=0, S=1, V=1) → { r: 1, g: 0, b: 0 }', () => {
        const result = $Hsv.toSrgb({ h: 0, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(1, 5)
        expect(result.g).toBeCloseTo(0, 5)
        expect(result.b).toBeCloseTo(0, 5)
      })

      it('green (H=120, S=1, V=1) → { r: 0, g: 1, b: 0 }', () => {
        const result = $Hsv.toSrgb({ h: 120, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(0, 5)
        expect(result.g).toBeCloseTo(1, 5)
        expect(result.b).toBeCloseTo(0, 5)
      })

      it('blue (H=240, S=1, V=1) → { r: 0, g: 0, b: 1 }', () => {
        const result = $Hsv.toSrgb({ h: 240, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(0, 5)
        expect(result.g).toBeCloseTo(0, 5)
        expect(result.b).toBeCloseTo(1, 5)
      })
    })

    describe('secondary colors', () => {
      it('yellow (H=60, S=1, V=1) → { r: 1, g: 1, b: 0 }', () => {
        const result = $Hsv.toSrgb({ h: 60, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(1, 5)
        expect(result.g).toBeCloseTo(1, 5)
        expect(result.b).toBeCloseTo(0, 5)
      })

      it('cyan (H=180, S=1, V=1) → { r: 0, g: 1, b: 1 }', () => {
        const result = $Hsv.toSrgb({ h: 180, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(0, 5)
        expect(result.g).toBeCloseTo(1, 5)
        expect(result.b).toBeCloseTo(1, 5)
      })

      it('magenta (H=300, S=1, V=1) → { r: 1, g: 0, b: 1 }', () => {
        const result = $Hsv.toSrgb({ h: 300, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(1, 5)
        expect(result.g).toBeCloseTo(0, 5)
        expect(result.b).toBeCloseTo(1, 5)
      })
    })

    describe('grayscale', () => {
      it('white (S=0, V=1) → { r: 1, g: 1, b: 1 }', () => {
        const result = $Hsv.toSrgb({ h: 0, s: 0, v: 1 })
        expect(result.r).toBeCloseTo(1, 5)
        expect(result.g).toBeCloseTo(1, 5)
        expect(result.b).toBeCloseTo(1, 5)
      })

      it('black (V=0) → { r: 0, g: 0, b: 0 }', () => {
        const result = $Hsv.toSrgb({ h: 0, s: 0, v: 0 })
        expect(result.r).toBeCloseTo(0, 5)
        expect(result.g).toBeCloseTo(0, 5)
        expect(result.b).toBeCloseTo(0, 5)
      })

      it('gray 50% (S=0, V=0.5) → { r: 0.5, g: 0.5, b: 0.5 }', () => {
        const result = $Hsv.toSrgb({ h: 0, s: 0, v: 0.5 })
        expect(result.r).toBeCloseTo(0.5, 5)
        expect(result.g).toBeCloseTo(0.5, 5)
        expect(result.b).toBeCloseTo(0.5, 5)
      })
    })

    describe('hue at each 60-degree sector', () => {
      it('H=30 (orange)', () => {
        const result = $Hsv.toSrgb({ h: 30, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(1, 5)
        expect(result.g).toBeCloseTo(0.5, 5)
        expect(result.b).toBeCloseTo(0, 5)
      })

      it('H=90 (chartreuse)', () => {
        const result = $Hsv.toSrgb({ h: 90, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(0.5, 5)
        expect(result.g).toBeCloseTo(1, 5)
        expect(result.b).toBeCloseTo(0, 5)
      })

      it('H=150 (spring green)', () => {
        const result = $Hsv.toSrgb({ h: 150, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(0, 5)
        expect(result.g).toBeCloseTo(1, 5)
        expect(result.b).toBeCloseTo(0.5, 5)
      })

      it('H=210 (azure)', () => {
        const result = $Hsv.toSrgb({ h: 210, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(0, 5)
        expect(result.g).toBeCloseTo(0.5, 5)
        expect(result.b).toBeCloseTo(1, 5)
      })

      it('H=270 (violet)', () => {
        const result = $Hsv.toSrgb({ h: 270, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(0.5, 5)
        expect(result.g).toBeCloseTo(0, 5)
        expect(result.b).toBeCloseTo(1, 5)
      })

      it('H=330 (rose)', () => {
        const result = $Hsv.toSrgb({ h: 330, s: 1, v: 1 })
        expect(result.r).toBeCloseTo(1, 5)
        expect(result.g).toBeCloseTo(0, 5)
        expect(result.b).toBeCloseTo(0.5, 5)
      })
    })
  })

  describe('fromSrgb', () => {
    describe('primary colors', () => {
      it('red { r: 1, g: 0, b: 0 } → H=0, S=1, V=1', () => {
        const result = $Hsv.fromSrgb({ r: 1, g: 0, b: 0 })
        expect(result.h).toBeCloseTo(0, 5)
        expect(result.s).toBeCloseTo(1, 5)
        expect(result.v).toBeCloseTo(1, 5)
      })

      it('green { r: 0, g: 1, b: 0 } → H=120, S=1, V=1', () => {
        const result = $Hsv.fromSrgb({ r: 0, g: 1, b: 0 })
        expect(result.h).toBeCloseTo(120, 5)
        expect(result.s).toBeCloseTo(1, 5)
        expect(result.v).toBeCloseTo(1, 5)
      })

      it('blue { r: 0, g: 0, b: 1 } → H=240, S=1, V=1', () => {
        const result = $Hsv.fromSrgb({ r: 0, g: 0, b: 1 })
        expect(result.h).toBeCloseTo(240, 5)
        expect(result.s).toBeCloseTo(1, 5)
        expect(result.v).toBeCloseTo(1, 5)
      })
    })

    describe('grayscale', () => {
      it('white → S=0, V=1', () => {
        const result = $Hsv.fromSrgb({ r: 1, g: 1, b: 1 })
        expect(result.s).toBeCloseTo(0, 5)
        expect(result.v).toBeCloseTo(1, 5)
      })

      it('black → S=0, V=0', () => {
        const result = $Hsv.fromSrgb({ r: 0, g: 0, b: 0 })
        expect(result.s).toBeCloseTo(0, 5)
        expect(result.v).toBeCloseTo(0, 5)
      })

      it('gray → S=0', () => {
        const result = $Hsv.fromSrgb({ r: 0.5, g: 0.5, b: 0.5 })
        expect(result.s).toBeCloseTo(0, 5)
        expect(result.v).toBeCloseTo(0.5, 5)
      })
    })
  })

  describe('roundtrip', () => {
    const testCases: Hsv[] = [
      { h: 0, s: 1, v: 1 },     // red
      { h: 120, s: 1, v: 1 },   // green
      { h: 240, s: 1, v: 1 },   // blue
      { h: 60, s: 1, v: 1 },    // yellow
      { h: 180, s: 1, v: 1 },   // cyan
      { h: 300, s: 1, v: 1 },   // magenta
      { h: 0, s: 0, v: 1 },     // white
      { h: 0, s: 0, v: 0 },     // black
      { h: 30, s: 0.5, v: 0.8 }, // muted orange
      { h: 210, s: 0.7, v: 0.6 }, // muted blue
    ]

    testCases.forEach(({ h, s, v }) => {
      it(`HSV(${h}, ${s}, ${v}) → RGB → HSV preserves values`, () => {
        const rgb = $Hsv.toSrgb({ h, s, v })
        const result = $Hsv.fromSrgb(rgb)

        // For grayscale (s=0), hue is undefined, so only check s and v
        if (s === 0) {
          expect(result.s).toBeCloseTo(0, 5)
          expect(result.v).toBeCloseTo(v, 5)
        } else {
          expect(result.h).toBeCloseTo(h, 3)
          expect(result.s).toBeCloseTo(s, 5)
          expect(result.v).toBeCloseTo(v, 5)
        }
      })
    })
  })

  describe('pureHue', () => {
    it('returns fully saturated color at given hue', () => {
      const result = $Hsv.pureHue(0)
      expect(result.r).toBeCloseTo(1, 5)
      expect(result.g).toBeCloseTo(0, 5)
      expect(result.b).toBeCloseTo(0, 5)
    })

    it('works for all primary hues', () => {
      const red = $Hsv.pureHue(0)
      const green = $Hsv.pureHue(120)
      const blue = $Hsv.pureHue(240)

      expect(red.r).toBeCloseTo(1, 5)
      expect(green.g).toBeCloseTo(1, 5)
      expect(blue.b).toBeCloseTo(1, 5)
    })
  })
})
