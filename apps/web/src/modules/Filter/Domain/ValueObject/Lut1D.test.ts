import { describe, it, expect } from 'vitest'
import { $Lut1D } from './Lut1D'

describe('$Lut1D', () => {
  describe('is', () => {
    it('should return true for Lut1D', () => {
      const lut = $Lut1D.identity()
      expect($Lut1D.is(lut)).toBe(true)
    })

    it('should return false for non-Lut1D', () => {
      expect($Lut1D.is({ type: 'lut3d' })).toBe(false)
      expect($Lut1D.is({ type: 'other' })).toBe(false)
    })
  })

  describe('identity', () => {
    it('should create identity LUT with 256 entries per channel', () => {
      const lut = $Lut1D.identity()
      expect(lut.type).toBe('lut1d')
      expect(lut.r.length).toBe(256)
      expect(lut.g.length).toBe(256)
      expect(lut.b.length).toBe(256)
    })

    it('should map input to same output (normalized)', () => {
      const lut = $Lut1D.identity()
      expect(lut.r[0]).toBe(0)
      expect(lut.r[255]).toBe(1)
      expect(lut.r[128]).toBeCloseTo(128 / 255, 5)
    })

    it('should have independent channel arrays', () => {
      const lut = $Lut1D.identity()
      lut.r[0] = 0.5
      expect(lut.g[0]).toBe(0)
      expect(lut.b[0]).toBe(0)
    })
  })

  describe('create', () => {
    it('should create LUT from provided arrays', () => {
      const r = new Float32Array(256).fill(0.5)
      const g = new Float32Array(256).fill(0.3)
      const b = new Float32Array(256).fill(0.8)

      const lut = $Lut1D.create(r, g, b)

      expect(lut.type).toBe('lut1d')
      expect(lut.r).toBe(r)
      expect(lut.g).toBe(g)
      expect(lut.b).toBe(b)
    })
  })

  describe('fromMaster', () => {
    it('should create LUT with same values for all channels', () => {
      const master = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        master[i] = Math.pow(i / 255, 2.2) // gamma curve
      }

      const lut = $Lut1D.fromMaster(master)

      expect(lut.r[128]).toBe(lut.g[128])
      expect(lut.g[128]).toBe(lut.b[128])
    })

    it('should create independent copies', () => {
      const master = new Float32Array(256).fill(0.5)
      const lut = $Lut1D.fromMaster(master)

      master[0] = 0.9
      expect(lut.r[0]).toBe(0.5) // not affected
    })
  })

  describe('compose', () => {
    it('should return identity for empty input', () => {
      const result = $Lut1D.compose()
      expect(result.r[0]).toBe(0)
      expect(result.r[255]).toBe(1)
    })

    it('should return same LUT for single input', () => {
      const lut = $Lut1D.identity()
      lut.r[128] = 0.7

      const result = $Lut1D.compose(lut)
      expect(result.r[128]).toBeCloseTo(0.7, 5)
    })

    it('should compose two identity LUTs to identity', () => {
      const identity1 = $Lut1D.identity()
      const identity2 = $Lut1D.identity()

      const result = $Lut1D.compose(identity1, identity2)

      expect(result.r[0]).toBeCloseTo(0, 5)
      expect(result.r[128]).toBeCloseTo(128 / 255, 5)
      expect(result.r[255]).toBeCloseTo(1, 5)
    })

    it('should compose inversion twice to identity', () => {
      // Create inversion LUT (1 - x)
      const invert = $Lut1D.identity()
      for (let i = 0; i < 256; i++) {
        invert.r[i] = 1 - i / 255
        invert.g[i] = 1 - i / 255
        invert.b[i] = 1 - i / 255
      }

      const result = $Lut1D.compose(invert, invert)

      expect(result.r[0]).toBeCloseTo(0, 3)
      expect(result.r[128]).toBeCloseTo(128 / 255, 3)
      expect(result.r[255]).toBeCloseTo(1, 3)
    })

    it('should compose brightness adjustments', () => {
      // First: multiply by 0.5
      const darken = $Lut1D.identity()
      for (let i = 0; i < 256; i++) {
        darken.r[i] = (i / 255) * 0.5
        darken.g[i] = (i / 255) * 0.5
        darken.b[i] = (i / 255) * 0.5
      }

      // Second: multiply by 2 (clipped)
      const brighten = $Lut1D.identity()
      for (let i = 0; i < 256; i++) {
        brighten.r[i] = Math.min(1, (i / 255) * 2)
        brighten.g[i] = Math.min(1, (i / 255) * 2)
        brighten.b[i] = Math.min(1, (i / 255) * 2)
      }

      const result = $Lut1D.compose(darken, brighten)

      // 0.5 * 2 = 1 (for mid-range)
      expect(result.r[128]).toBeCloseTo(128 / 255, 2) // ~0.5
    })
  })

  describe('composeChannel', () => {
    it('should compose two channel LUTs', () => {
      const first = new Float32Array(256)
      const second = new Float32Array(256)

      // First: identity
      for (let i = 0; i < 256; i++) {
        first[i] = i / 255
      }
      // Second: square (gamma 2)
      for (let i = 0; i < 256; i++) {
        second[i] = Math.pow(i / 255, 2)
      }

      const result = $Lut1D.composeChannel(first, second)

      // identity then square = square
      expect(result[0]).toBeCloseTo(0, 5)
      expect(result[128]).toBeCloseTo(Math.pow(128 / 255, 2), 3)
      expect(result[255]).toBeCloseTo(1, 5)
    })
  })

  describe('blend', () => {
    it('should return same LUT when intensity is 1.0', () => {
      const lut = $Lut1D.identity()
      lut.r[128] = 0.8

      const result = $Lut1D.blend(lut, 1.0)

      expect(result.r[128]).toBeCloseTo(0.8, 5)
    })

    it('should return identity LUT when intensity is 0.0', () => {
      const lut = $Lut1D.identity()
      lut.r[128] = 0.8

      const result = $Lut1D.blend(lut, 0.0)

      expect(result.r[128]).toBeCloseTo(128 / 255, 5)
    })

    it('should blend with identity at 50% intensity', () => {
      const lut = $Lut1D.identity()
      // Make all channels output 1.0 (full white)
      for (let i = 0; i < 256; i++) {
        lut.r[i] = 1.0
        lut.g[i] = 1.0
        lut.b[i] = 1.0
      }

      const result = $Lut1D.blend(lut, 0.5)

      // At 50%: (i/255) * 0.5 + 1.0 * 0.5
      expect(result.r[0]).toBeCloseTo(0.5, 5)    // 0 * 0.5 + 1 * 0.5 = 0.5
      expect(result.r[128]).toBeCloseTo((128 / 255) * 0.5 + 0.5, 5)
      expect(result.r[255]).toBeCloseTo(1.0, 5)  // 1 * 0.5 + 1 * 0.5 = 1.0
    })

    it('should interpolate linearly', () => {
      const lut = $Lut1D.identity()
      // Invert: output = 1 - input
      for (let i = 0; i < 256; i++) {
        lut.r[i] = 1 - i / 255
        lut.g[i] = 1 - i / 255
        lut.b[i] = 1 - i / 255
      }

      const result25 = $Lut1D.blend(lut, 0.25)
      const result75 = $Lut1D.blend(lut, 0.75)

      // At i=128: identity = 0.502, inverted = 0.498
      const identity128 = 128 / 255
      const inverted128 = 1 - 128 / 255
      expect(result25.r[128]).toBeCloseTo(identity128 * 0.75 + inverted128 * 0.25, 4)
      expect(result75.r[128]).toBeCloseTo(identity128 * 0.25 + inverted128 * 0.75, 4)
    })
  })

  // Note: apply, applyInPlace, and applyWithEffects tests require ImageData
  // which is only available in browser environment. These are tested in Infra layer.
})
