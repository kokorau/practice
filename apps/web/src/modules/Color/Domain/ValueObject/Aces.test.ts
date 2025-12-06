import { describe, it, expect } from 'vitest'
import { $AcesAp0, $AcesAp1 } from './Aces'
import type { Srgb } from './Srgb'

describe('AcesAp0', () => {
  describe('fromSrgb', () => {
    it('should convert black correctly', () => {
      const srgb: Srgb = { r: 0, g: 0, b: 0 }
      const aces = $AcesAp0.fromSrgb(srgb)

      expect(aces.r).toBeCloseTo(0, 5)
      expect(aces.g).toBeCloseTo(0, 5)
      expect(aces.b).toBeCloseTo(0, 5)
    })

    it('should convert white correctly', () => {
      const srgb: Srgb = { r: 1, g: 1, b: 1 }
      const aces = $AcesAp0.fromSrgb(srgb)

      // White should map to approximately equal RGB in ACES
      // Due to chromatic adaptation, values may differ slightly
      expect(aces.r).toBeGreaterThan(0.9)
      expect(aces.g).toBeGreaterThan(0.9)
      expect(aces.b).toBeGreaterThan(0.9)
    })

    it('should convert primary red', () => {
      const srgb: Srgb = { r: 1, g: 0, b: 0 }
      const aces = $AcesAp0.fromSrgb(srgb)

      // sRGB red should have positive r in AP0
      expect(aces.r).toBeGreaterThan(0)
      // sRGB primaries are inside AP0 gamut, so g might be negative
    })

    it('should convert primary green', () => {
      const srgb: Srgb = { r: 0, g: 1, b: 0 }
      const aces = $AcesAp0.fromSrgb(srgb)

      expect(aces.g).toBeGreaterThan(0)
    })

    it('should convert primary blue', () => {
      const srgb: Srgb = { r: 0, g: 0, b: 1 }
      const aces = $AcesAp0.fromSrgb(srgb)

      expect(aces.b).toBeGreaterThan(0)
    })

    it('should convert mid-gray correctly', () => {
      const srgb: Srgb = { r: 0.5, g: 0.5, b: 0.5 }
      const aces = $AcesAp0.fromSrgb(srgb)

      // Gray should have similar values in all channels
      expect(Math.abs(aces.r - aces.g)).toBeLessThan(0.1)
      expect(Math.abs(aces.g - aces.b)).toBeLessThan(0.1)
    })
  })

  describe('toSrgb', () => {
    it('should round-trip black correctly', () => {
      const original: Srgb = { r: 0, g: 0, b: 0 }
      const aces = $AcesAp0.fromSrgb(original)
      const result = $AcesAp0.toSrgb(aces)

      expect(result.r).toBeCloseTo(original.r, 3)
      expect(result.g).toBeCloseTo(original.g, 3)
      expect(result.b).toBeCloseTo(original.b, 3)
    })

    it('should round-trip white correctly', () => {
      const original: Srgb = { r: 1, g: 1, b: 1 }
      const aces = $AcesAp0.fromSrgb(original)
      const result = $AcesAp0.toSrgb(aces)

      expect(result.r).toBeCloseTo(original.r, 2)
      expect(result.g).toBeCloseTo(original.g, 2)
      expect(result.b).toBeCloseTo(original.b, 2)
    })

    it('should round-trip mid-tone colors', () => {
      const original: Srgb = { r: 0.5, g: 0.3, b: 0.7 }
      const aces = $AcesAp0.fromSrgb(original)
      const result = $AcesAp0.toSrgb(aces)

      expect(result.r).toBeCloseTo(original.r, 2)
      expect(result.g).toBeCloseTo(original.g, 2)
      expect(result.b).toBeCloseTo(original.b, 2)
    })
  })

  describe('toAp1', () => {
    it('should convert AP0 to AP1', () => {
      const srgb: Srgb = { r: 0.5, g: 0.5, b: 0.5 }
      const ap0 = $AcesAp0.fromSrgb(srgb)
      const ap1 = $AcesAp0.toAp1(ap0)

      // Gray should remain gray after conversion
      expect(Math.abs(ap1.r - ap1.g)).toBeLessThan(0.1)
      expect(Math.abs(ap1.g - ap1.b)).toBeLessThan(0.1)
    })
  })
})

describe('AcesAp1', () => {
  describe('fromSrgb', () => {
    it('should convert black correctly', () => {
      const srgb: Srgb = { r: 0, g: 0, b: 0 }
      const aces = $AcesAp1.fromSrgb(srgb)

      expect(aces.r).toBeCloseTo(0, 5)
      expect(aces.g).toBeCloseTo(0, 5)
      expect(aces.b).toBeCloseTo(0, 5)
    })

    it('should convert white correctly', () => {
      const srgb: Srgb = { r: 1, g: 1, b: 1 }
      const aces = $AcesAp1.fromSrgb(srgb)

      expect(aces.r).toBeGreaterThan(0.9)
      expect(aces.g).toBeGreaterThan(0.9)
      expect(aces.b).toBeGreaterThan(0.9)
    })

    it('should convert colors within AP1 gamut', () => {
      const srgb: Srgb = { r: 0.8, g: 0.2, b: 0.3 }
      const aces = $AcesAp1.fromSrgb(srgb)

      // sRGB colors should be within AP1 gamut
      expect($AcesAp1.isInGamut(aces)).toBe(true)
    })
  })

  describe('toSrgb', () => {
    it('should round-trip colors correctly', () => {
      const original: Srgb = { r: 0.3, g: 0.6, b: 0.4 }
      const aces = $AcesAp1.fromSrgb(original)
      const result = $AcesAp1.toSrgb(aces)

      expect(result.r).toBeCloseTo(original.r, 2)
      expect(result.g).toBeCloseTo(original.g, 2)
      expect(result.b).toBeCloseTo(original.b, 2)
    })
  })

  describe('toAp0', () => {
    it('should convert AP1 to AP0', () => {
      const srgb: Srgb = { r: 0.5, g: 0.5, b: 0.5 }
      const ap1 = $AcesAp1.fromSrgb(srgb)
      const ap0 = $AcesAp1.toAp0(ap1)

      // Should match direct conversion
      const directAp0 = $AcesAp0.fromSrgb(srgb)

      expect(ap0.r).toBeCloseTo(directAp0.r, 3)
      expect(ap0.g).toBeCloseTo(directAp0.g, 3)
      expect(ap0.b).toBeCloseTo(directAp0.b, 3)
    })
  })

  describe('isInGamut', () => {
    it('should return true for valid colors', () => {
      const aces = $AcesAp1.create(0.5, 0.5, 0.5)
      expect($AcesAp1.isInGamut(aces)).toBe(true)
    })

    it('should return false for out-of-gamut colors', () => {
      const aces = $AcesAp1.create(-0.1, 0.5, 0.5)
      expect($AcesAp1.isInGamut(aces)).toBe(false)
    })
  })
})

describe('AP0 <-> AP1 consistency', () => {
  it('should maintain consistency when converting between AP0 and AP1', () => {
    const srgb: Srgb = { r: 0.7, g: 0.3, b: 0.5 }

    // Path 1: sRGB -> AP0 -> AP1
    const ap0 = $AcesAp0.fromSrgb(srgb)
    const ap1FromAp0 = $AcesAp0.toAp1(ap0)

    // Path 2: sRGB -> AP1
    const ap1Direct = $AcesAp1.fromSrgb(srgb)

    expect(ap1FromAp0.r).toBeCloseTo(ap1Direct.r, 3)
    expect(ap1FromAp0.g).toBeCloseTo(ap1Direct.g, 3)
    expect(ap1FromAp0.b).toBeCloseTo(ap1Direct.b, 3)
  })

  it('should maintain consistency when converting back', () => {
    const srgb: Srgb = { r: 0.4, g: 0.8, b: 0.2 }

    // Path 1: sRGB -> AP1 -> AP0 -> sRGB
    const ap1 = $AcesAp1.fromSrgb(srgb)
    const ap0 = $AcesAp1.toAp0(ap1)
    const result = $AcesAp0.toSrgb(ap0)

    expect(result.r).toBeCloseTo(srgb.r, 2)
    expect(result.g).toBeCloseTo(srgb.g, 2)
    expect(result.b).toBeCloseTo(srgb.b, 2)
  })
})
