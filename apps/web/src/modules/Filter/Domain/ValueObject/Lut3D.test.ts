import { describe, it, expect } from 'vitest'
import { $Lut3D } from './Lut3D'

describe('$Lut3D', () => {
  describe('is', () => {
    it('should return true for Lut3D', () => {
      const lut = $Lut3D.identity(5)
      expect($Lut3D.is(lut)).toBe(true)
    })

    it('should return false for non-Lut3D', () => {
      expect($Lut3D.is({ type: 'lut1d' })).toBe(false)
      expect($Lut3D.is({ type: 'other' })).toBe(false)
    })
  })

  describe('identity', () => {
    it('should create identity LUT with default size', () => {
      const lut = $Lut3D.identity()
      expect(lut.type).toBe('lut3d')
      expect(lut.size).toBe(17)
      expect(lut.data.length).toBe(17 * 17 * 17 * 3)
    })

    it('should create identity LUT with custom size', () => {
      const lut = $Lut3D.identity(5)
      expect(lut.size).toBe(5)
      expect(lut.data.length).toBe(5 * 5 * 5 * 3)
    })

    it('should output same as input for identity LUT', () => {
      const lut = $Lut3D.identity(5)

      // Test corners
      expect($Lut3D.lookup(lut, 0, 0, 0)).toEqual([0, 0, 0])
      expect($Lut3D.lookup(lut, 1, 1, 1)).toEqual([1, 1, 1])
      expect($Lut3D.lookup(lut, 1, 0, 0)).toEqual([1, 0, 0])
      expect($Lut3D.lookup(lut, 0, 1, 0)).toEqual([0, 1, 0])
      expect($Lut3D.lookup(lut, 0, 0, 1)).toEqual([0, 0, 1])
    })

    it('should interpolate correctly for identity LUT', () => {
      const lut = $Lut3D.identity(5)

      const [r, g, b] = $Lut3D.lookup(lut, 0.5, 0.5, 0.5)
      expect(r).toBeCloseTo(0.5, 5)
      expect(g).toBeCloseTo(0.5, 5)
      expect(b).toBeCloseTo(0.5, 5)
    })
  })

  describe('create', () => {
    it('should create LUT from provided data', () => {
      const size = 2
      const data = new Float32Array(size * size * size * 3)
      const lut = $Lut3D.create(size, data)
      expect(lut.type).toBe('lut3d')
      expect(lut.size).toBe(size)
      expect(lut.data).toBe(data)
    })
  })

  describe('lookup', () => {
    it('should lookup exact grid points without interpolation', () => {
      const lut = $Lut3D.identity(3)

      // Grid points
      expect($Lut3D.lookup(lut, 0, 0, 0)).toEqual([0, 0, 0])
      expect($Lut3D.lookup(lut, 0.5, 0.5, 0.5)).toEqual([0.5, 0.5, 0.5])
      expect($Lut3D.lookup(lut, 1, 1, 1)).toEqual([1, 1, 1])
    })

    it('should interpolate between grid points', () => {
      const lut = $Lut3D.identity(3)

      // Between 0 and 0.5 (first and second grid points)
      const [r, g, b] = $Lut3D.lookup(lut, 0.25, 0.25, 0.25)
      expect(r).toBeCloseTo(0.25, 5)
      expect(g).toBeCloseTo(0.25, 5)
      expect(b).toBeCloseTo(0.25, 5)
    })

    it('should clamp edge values correctly', () => {
      const lut = $Lut3D.identity(3)

      // At boundaries
      expect($Lut3D.lookup(lut, 0, 0, 0)).toEqual([0, 0, 0])
      expect($Lut3D.lookup(lut, 1, 1, 1)).toEqual([1, 1, 1])
    })
  })

  describe('channelSwap', () => {
    it('should swap RGB to GBR', () => {
      const lut = $Lut3D.channelSwap(['g', 'b', 'r'], 3)

      // Red input should become green output
      const [r, g, b] = $Lut3D.lookup(lut, 1, 0, 0)
      expect(r).toBeCloseTo(0, 5) // g -> r
      expect(g).toBeCloseTo(0, 5) // b -> g
      expect(b).toBeCloseTo(1, 5) // r -> b
    })

    it('should swap RGB to BGR', () => {
      const lut = $Lut3D.channelSwap(['b', 'g', 'r'], 3)

      // Test with cyan (0, 1, 1)
      const [r, g, b] = $Lut3D.lookup(lut, 0, 1, 1)
      expect(r).toBeCloseTo(1, 5) // b -> r
      expect(g).toBeCloseTo(1, 5) // g -> g
      expect(b).toBeCloseTo(0, 5) // r -> b
    })

    it('should keep identity with RGB mapping', () => {
      const lut = $Lut3D.channelSwap(['r', 'g', 'b'], 3)

      const [r, g, b] = $Lut3D.lookup(lut, 0.5, 0.3, 0.8)
      expect(r).toBeCloseTo(0.5, 5)
      expect(g).toBeCloseTo(0.3, 5)
      expect(b).toBeCloseTo(0.8, 5)
    })
  })

  describe('saturationAdjust', () => {
    it('should desaturate to grayscale with -1', () => {
      const lut = $Lut3D.saturationAdjust(-1, 5)

      // Pure red should become gray
      const [r, g, b] = $Lut3D.lookup(lut, 1, 0, 0)
      // With -1 saturation, all colors become grayscale
      expect(r).toBeCloseTo(g, 2)
      expect(g).toBeCloseTo(b, 2)
    })

    it('should keep gray unchanged', () => {
      const lut = $Lut3D.saturationAdjust(0.5, 5)

      // Gray should remain gray
      const [r, g, b] = $Lut3D.lookup(lut, 0.5, 0.5, 0.5)
      expect(r).toBeCloseTo(0.5, 2)
      expect(g).toBeCloseTo(0.5, 2)
      expect(b).toBeCloseTo(0.5, 2)
    })
  })

  describe('contrastAdjust', () => {
    it('should keep mid-gray unchanged', () => {
      const lut = $Lut3D.contrastAdjust(1.5, 5)

      const [r, g, b] = $Lut3D.lookup(lut, 0.5, 0.5, 0.5)
      expect(r).toBeCloseTo(0.5, 5)
      expect(g).toBeCloseTo(0.5, 5)
      expect(b).toBeCloseTo(0.5, 5)
    })

    it('should increase contrast for high values', () => {
      const lut = $Lut3D.contrastAdjust(1.5, 5)

      // Values above 0.5 should go higher
      const [r] = $Lut3D.lookup(lut, 0.75, 0.5, 0.5)
      expect(r).toBeGreaterThan(0.75)
    })

    it('should increase contrast for low values', () => {
      const lut = $Lut3D.contrastAdjust(1.5, 5)

      // Values below 0.5 should go lower
      const [r] = $Lut3D.lookup(lut, 0.25, 0.5, 0.5)
      expect(r).toBeLessThan(0.25)
    })

    it('should clamp to valid range', () => {
      const lut = $Lut3D.contrastAdjust(3, 5)

      const [r, g, b] = $Lut3D.lookup(lut, 1, 1, 1)
      expect(r).toBeLessThanOrEqual(1)
      expect(g).toBeLessThanOrEqual(1)
      expect(b).toBeLessThanOrEqual(1)

      const [r2, g2, b2] = $Lut3D.lookup(lut, 0, 0, 0)
      expect(r2).toBeGreaterThanOrEqual(0)
      expect(g2).toBeGreaterThanOrEqual(0)
      expect(b2).toBeGreaterThanOrEqual(0)
    })
  })

  describe('colorTemperature', () => {
    it('should warm colors with negative shift', () => {
      const lut = $Lut3D.colorTemperature(-50, 5)

      // White should become warmer (more red, less blue)
      const [r, , b] = $Lut3D.lookup(lut, 1, 1, 1)
      expect(r).toBeGreaterThan(b)
    })

    it('should cool colors with positive shift', () => {
      const lut = $Lut3D.colorTemperature(50, 5)

      // White should become cooler (less red, more blue)
      const [r, , b] = $Lut3D.lookup(lut, 1, 1, 1)
      expect(b).toBeGreaterThan(r)
    })

    it('should keep black unchanged', () => {
      const lut = $Lut3D.colorTemperature(50, 5)

      const [r, g, b] = $Lut3D.lookup(lut, 0, 0, 0)
      expect(r).toBe(0)
      expect(g).toBe(0)
      expect(b).toBe(0)
    })
  })

  describe('duotone', () => {
    it('should map black to shadow color', () => {
      const shadow = { r: 0.1, g: 0.2, b: 0.3 }
      const highlight = { r: 0.9, g: 0.8, b: 0.7 }
      const lut = $Lut3D.duotone(shadow, highlight, 1, 5)

      const [r, g, b] = $Lut3D.lookup(lut, 0, 0, 0)
      expect(r).toBeCloseTo(shadow.r, 2)
      expect(g).toBeCloseTo(shadow.g, 2)
      expect(b).toBeCloseTo(shadow.b, 2)
    })

    it('should map white to highlight color', () => {
      const shadow = { r: 0.1, g: 0.2, b: 0.3 }
      const highlight = { r: 0.9, g: 0.8, b: 0.7 }
      const lut = $Lut3D.duotone(shadow, highlight, 1, 5)

      const [r, g, b] = $Lut3D.lookup(lut, 1, 1, 1)
      expect(r).toBeCloseTo(highlight.r, 2)
      expect(g).toBeCloseTo(highlight.g, 2)
      expect(b).toBeCloseTo(highlight.b, 2)
    })

    it('should interpolate mid-tones', () => {
      const shadow = { r: 0, g: 0, b: 0 }
      const highlight = { r: 1, g: 1, b: 1 }
      const lut = $Lut3D.duotone(shadow, highlight, 1, 5)

      // Mid-gray should remain mid-gray
      const [r, g, b] = $Lut3D.lookup(lut, 0.5, 0.5, 0.5)
      expect(r).toBeCloseTo(0.5, 1)
      expect(g).toBeCloseTo(0.5, 1)
      expect(b).toBeCloseTo(0.5, 1)
    })
  })

  describe('gameBoy', () => {
    it('should produce 4 base colors at grid points', () => {
      const lut = $Lut3D.gameBoy(17)

      // Check that at grid points (exact luminance levels), we get 4 distinct colors
      const gridColors = new Set<string>()

      // Sample at exact grid points only (no interpolation)
      for (let i = 0; i < 17; i++) {
        // Use same value for all channels (grayscale input at grid points)
        const idx = (i + i * 17 + i * 17 * 17) * 3
        const r = lut.data[idx]!
        const g = lut.data[idx + 1]!
        const b = lut.data[idx + 2]!
        gridColors.add(`${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`)
      }

      expect(gridColors.size).toBe(4)
    })

    it('should use green-tinted colors', () => {
      const lut = $Lut3D.gameBoy(5)

      // All colors should have green as the brightest or equal channel
      const [r, g, b] = $Lut3D.lookup(lut, 0.5, 0.5, 0.5)
      expect(g).toBeGreaterThanOrEqual(r)
      expect(g).toBeGreaterThanOrEqual(b)
    })
  })

  describe('toTexture2D', () => {
    it('should produce correct texture dimensions', () => {
      const lut = $Lut3D.identity(5)
      const tex = $Lut3D.toTexture2D(lut)

      expect(tex.width).toBe(5)
      expect(tex.height).toBe(25) // 5 * 5
      expect(tex.data.length).toBe(5 * 25 * 4) // RGBA
    })

    it('should include alpha channel as 255', () => {
      const lut = $Lut3D.identity(3)
      const tex = $Lut3D.toTexture2D(lut)

      // Check all alpha values are 255
      for (let i = 3; i < tex.data.length; i += 4) {
        expect(tex.data[i]).toBe(255)
      }
    })

    it('should convert 0-1 to 0-255 correctly', () => {
      const lut = $Lut3D.identity(2)
      const tex = $Lut3D.toTexture2D(lut)

      // First pixel should be (0, 0, 0, 255)
      expect(tex.data[0]).toBe(0)
      expect(tex.data[1]).toBe(0)
      expect(tex.data[2]).toBe(0)
      expect(tex.data[3]).toBe(255)
    })
  })

  describe('colorMatrix', () => {
    it('should apply identity matrix unchanged', () => {
      const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1]
      const lut = $Lut3D.colorMatrix(identity, 5)

      const [r, g, b] = $Lut3D.lookup(lut, 0.5, 0.3, 0.8)
      expect(r).toBeCloseTo(0.5, 5)
      expect(g).toBeCloseTo(0.3, 5)
      expect(b).toBeCloseTo(0.8, 5)
    })

    it('should swap channels with permutation matrix', () => {
      // Swap R and B
      const swap = [0, 0, 1, 0, 1, 0, 1, 0, 0]
      const lut = $Lut3D.colorMatrix(swap, 5)

      const [r, g, b] = $Lut3D.lookup(lut, 1, 0, 0)
      expect(r).toBeCloseTo(0, 5)
      expect(g).toBeCloseTo(0, 5)
      expect(b).toBeCloseTo(1, 5)
    })

    it('should clamp output to valid range', () => {
      // Matrix that produces out-of-range values
      const boost = [2, 0, 0, 0, 2, 0, 0, 0, 2]
      const lut = $Lut3D.colorMatrix(boost, 5)

      const [r, g, b] = $Lut3D.lookup(lut, 1, 1, 1)
      expect(r).toBeLessThanOrEqual(1)
      expect(g).toBeLessThanOrEqual(1)
      expect(b).toBeLessThanOrEqual(1)
    })
  })
})
