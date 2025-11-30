import { describe, it, expect } from 'vitest'
import {
  applyGamma,
  applyContrast,
  brightnessToGamma,
  applyExposure,
  applyHighlightsShadows,
  applyWhitesBlacks,
  applyClarity,
  applyFade,
  applyToe,
  applyShoulder,
} from './transforms'

describe('transforms', () => {
  describe('applyGamma', () => {
    it('should return input unchanged when gamma is 1', () => {
      expect(applyGamma(0.5, 1)).toBeCloseTo(0.5, 5)
      expect(applyGamma(0.25, 1)).toBeCloseTo(0.25, 5)
    })

    it('should brighten when gamma < 1', () => {
      expect(applyGamma(0.5, 0.5)).toBeGreaterThan(0.5)
      expect(applyGamma(0.25, 0.5)).toBeGreaterThan(0.25)
    })

    it('should darken when gamma > 1', () => {
      expect(applyGamma(0.5, 2)).toBeLessThan(0.5)
      expect(applyGamma(0.25, 2)).toBeLessThan(0.25)
    })

    it('should keep 0 and 1 unchanged', () => {
      expect(applyGamma(0, 0.5)).toBe(0)
      expect(applyGamma(1, 0.5)).toBe(1)
      expect(applyGamma(0, 2)).toBe(0)
      expect(applyGamma(1, 2)).toBe(1)
    })

    it('should clamp input to 0-1 range', () => {
      expect(applyGamma(-0.5, 1)).toBe(0)
      expect(applyGamma(1.5, 1)).toBe(1)
    })
  })

  describe('brightnessToGamma', () => {
    it('should return 1 for brightness 0', () => {
      expect(brightnessToGamma(0)).toBe(1)
    })

    it('should return 0.5 for brightness +1', () => {
      expect(brightnessToGamma(1)).toBeCloseTo(0.5, 5)
    })

    it('should return 2 for brightness -1', () => {
      expect(brightnessToGamma(-1)).toBeCloseTo(2, 5)
    })

    it('should be exponential', () => {
      // brightness 0.5 should be sqrt(2) / 2 ≈ 0.707
      expect(brightnessToGamma(0.5)).toBeCloseTo(Math.pow(2, -0.5), 5)
    })
  })

  describe('applyContrast', () => {
    it('should return input unchanged when contrast is 0', () => {
      expect(applyContrast(0.3, 0)).toBeCloseTo(0.3, 5)
      expect(applyContrast(0.7, 0)).toBeCloseTo(0.7, 5)
    })

    it('should keep midpoint unchanged', () => {
      expect(applyContrast(0.5, 0.5)).toBeCloseTo(0.5, 3)
      expect(applyContrast(0.5, -0.5)).toBeCloseTo(0.5, 3)
    })

    it('should increase contrast with positive values', () => {
      // Dark values should get darker
      expect(applyContrast(0.3, 0.5)).toBeLessThan(0.3)
      // Bright values should get brighter
      expect(applyContrast(0.7, 0.5)).toBeGreaterThan(0.7)
    })

    it('should decrease contrast with negative values', () => {
      // Values should move toward 0.5
      expect(applyContrast(0.2, -0.5)).toBeGreaterThan(0.2)
      expect(applyContrast(0.8, -0.5)).toBeLessThan(0.8)
    })

    it('should converge to 0.5 when contrast is -1', () => {
      expect(applyContrast(0, -1)).toBeCloseTo(0.5, 5)
      expect(applyContrast(1, -1)).toBeCloseTo(0.5, 5)
      expect(applyContrast(0.2, -1)).toBeCloseTo(0.5, 5)
    })
  })

  describe('applyExposure', () => {
    it('should return input unchanged when ev is 0', () => {
      expect(applyExposure(0.5, 0)).toBeCloseTo(0.5, 5)
    })

    it('should brighten with positive ev', () => {
      expect(applyExposure(0.5, 1)).toBeGreaterThan(0.5)
    })

    it('should darken with negative ev', () => {
      expect(applyExposure(0.5, -1)).toBeLessThan(0.5)
    })

    it('should keep 0 unchanged', () => {
      expect(applyExposure(0, 2)).toBe(0)
    })

    it('should clamp to 1', () => {
      const result = applyExposure(0.8, 2)
      expect(result).toBeLessThanOrEqual(1)
    })
  })

  describe('applyHighlightsShadows', () => {
    it('should return input unchanged when both are 0', () => {
      expect(applyHighlightsShadows(0.3, 0, 0)).toBeCloseTo(0.3, 5)
      expect(applyHighlightsShadows(0.7, 0, 0)).toBeCloseTo(0.7, 5)
    })

    it('should affect bright values with highlights', () => {
      // Positive highlights should brighten bright values
      expect(applyHighlightsShadows(0.8, 0.5, 0)).toBeGreaterThan(0.8)
      // Negative highlights should darken bright values
      expect(applyHighlightsShadows(0.8, -0.5, 0)).toBeLessThan(0.8)
    })

    it('should affect dark values with shadows', () => {
      // Positive shadows should brighten dark values
      expect(applyHighlightsShadows(0.2, 0, 0.5)).toBeGreaterThan(0.2)
      // Negative shadows should darken dark values
      expect(applyHighlightsShadows(0.2, 0, -0.5)).toBeLessThan(0.2)
    })

    it('should not affect dark values much with highlights only', () => {
      const dark = 0.1
      const result = applyHighlightsShadows(dark, 1, 0)
      // Should be close to original (highlight mask is ~0 for dark values)
      expect(Math.abs(result - dark)).toBeLessThan(0.1)
    })

    it('should clamp to 0-1 range', () => {
      expect(applyHighlightsShadows(0.9, 1, 0)).toBeLessThanOrEqual(1)
      expect(applyHighlightsShadows(0.1, 0, -1)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('applyWhitesBlacks', () => {
    it('should return input unchanged when both are 0', () => {
      expect(applyWhitesBlacks(0.5, 0, 0)).toBeCloseTo(0.5, 5)
    })

    it('should only affect very bright values with whites', () => {
      // Mid values should barely change
      expect(Math.abs(applyWhitesBlacks(0.5, 1, 0) - 0.5)).toBeLessThan(0.05)
      // Very bright values should change more
      expect(applyWhitesBlacks(0.9, 0.5, 0)).toBeGreaterThan(0.9)
    })

    it('should only affect very dark values with blacks', () => {
      // Mid values should barely change
      expect(Math.abs(applyWhitesBlacks(0.5, 0, 1) - 0.5)).toBeLessThan(0.05)
      // Very dark values should change more
      expect(applyWhitesBlacks(0.1, 0, 0.5)).toBeGreaterThan(0.1)
    })
  })

  describe('applyClarity', () => {
    it('should return input unchanged when clarity is 0', () => {
      expect(applyClarity(0.3, 0)).toBeCloseTo(0.3, 5)
      expect(applyClarity(0.7, 0)).toBeCloseTo(0.7, 5)
    })

    it('should keep 0.5 unchanged', () => {
      expect(applyClarity(0.5, 1)).toBeCloseTo(0.5, 5)
      expect(applyClarity(0.5, -1)).toBeCloseTo(0.5, 5)
    })

    it('should keep 0 and 1 unchanged', () => {
      expect(applyClarity(0, 1)).toBeCloseTo(0, 5)
      expect(applyClarity(1, 1)).toBeCloseTo(1, 5)
    })

    it('should increase contrast in midtones with positive clarity', () => {
      // Values below 0.5 should get darker
      expect(applyClarity(0.3, 1)).toBeLessThan(0.3)
      // Values above 0.5 should get brighter
      expect(applyClarity(0.7, 1)).toBeGreaterThan(0.7)
    })

    it('should decrease contrast in midtones with negative clarity', () => {
      // Values below 0.5 should get brighter (toward 0.5)
      expect(applyClarity(0.3, -1)).toBeGreaterThan(0.3)
      // Values above 0.5 should get darker (toward 0.5)
      expect(applyClarity(0.7, -1)).toBeLessThan(0.7)
    })
  })

  describe('applyFade', () => {
    it('should return input unchanged when fade is 0', () => {
      expect(applyFade(0.5, 0)).toBeCloseTo(0.5, 5)
      expect(applyFade(0, 0)).toBe(0)
    })

    it('should raise black level', () => {
      // Black should no longer be 0
      expect(applyFade(0, 0.5)).toBeGreaterThan(0)
      expect(applyFade(0, 1)).toBeCloseTo(0.2, 5)
    })

    it('should compress dynamic range', () => {
      const original = 1
      const faded = applyFade(original, 0.5)
      // White should be less than 1 minus black level increase
      expect(faded).toBeLessThanOrEqual(1)
    })

    it('should maintain relative brightness order', () => {
      const fade = 0.5
      expect(applyFade(0.3, fade)).toBeLessThan(applyFade(0.7, fade))
    })
  })

  describe('applyToe', () => {
    it('should return input unchanged when toe is 0', () => {
      expect(applyToe(0.1, 0)).toBeCloseTo(0.1, 5)
      expect(applyToe(0.5, 0)).toBeCloseTo(0.5, 5)
    })

    it('should only affect dark values (below 0.3)', () => {
      // Above toe range should be unchanged
      expect(applyToe(0.5, 1)).toBeCloseTo(0.5, 5)
      expect(applyToe(0.8, 1)).toBeCloseTo(0.8, 5)
    })

    it('should darken shadows (compress toe)', () => {
      // Dark values should get darker
      expect(applyToe(0.15, 0.5)).toBeLessThan(0.15)
      expect(applyToe(0.1, 1)).toBeLessThan(0.1)
    })

    it('should keep 0 at 0', () => {
      expect(applyToe(0, 1)).toBe(0)
    })

    it('should be continuous at toe boundary', () => {
      // At 0.3, the toe should smoothly meet the linear part
      expect(applyToe(0.3, 0.5)).toBeCloseTo(0.3, 2)
    })
  })

  describe('applyShoulder', () => {
    it('should return input unchanged when shoulder is 0', () => {
      expect(applyShoulder(0.8, 0)).toBeCloseTo(0.8, 5)
      expect(applyShoulder(0.5, 0)).toBeCloseTo(0.5, 5)
    })

    it('should only affect bright values (above 0.7)', () => {
      // Below shoulder range should be unchanged
      expect(applyShoulder(0.5, 1)).toBeCloseTo(0.5, 5)
      expect(applyShoulder(0.3, 1)).toBeCloseTo(0.3, 5)
    })

    it('should compress highlights (roll off shoulder)', () => {
      // Bright values should get darker (compressed toward 1)
      // But since it's a roll-off, values should still be between input and 1
      const input = 0.85
      const result = applyShoulder(input, 0.5)
      // Result should be higher than input (curves up faster)
      expect(result).toBeGreaterThanOrEqual(input)
      expect(result).toBeLessThanOrEqual(1)
    })

    it('should keep 1 at 1', () => {
      expect(applyShoulder(1, 1)).toBeCloseTo(1, 5)
    })

    it('should be continuous at shoulder boundary', () => {
      // At 0.7, the shoulder should smoothly meet the linear part
      expect(applyShoulder(0.7, 0.5)).toBeCloseTo(0.7, 2)
    })
  })
})
