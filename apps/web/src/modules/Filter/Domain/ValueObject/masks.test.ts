import { describe, it, expect } from 'vitest'
import {
  smoothstep,
  highlightMask,
  shadowMask,
  whiteMask,
  blackMask,
  clarityMask,
} from './masks'

describe('masks', () => {
  describe('smoothstep', () => {
    it('should return 0 below edge0', () => {
      expect(smoothstep(0.25, 0.75, 0)).toBe(0)
      expect(smoothstep(0.25, 0.75, 0.1)).toBe(0)
      expect(smoothstep(0.25, 0.75, 0.25)).toBe(0)
    })

    it('should return 1 above edge1', () => {
      expect(smoothstep(0.25, 0.75, 0.75)).toBe(1)
      expect(smoothstep(0.25, 0.75, 0.9)).toBe(1)
      expect(smoothstep(0.25, 0.75, 1)).toBe(1)
    })

    it('should return 0.5 at midpoint', () => {
      expect(smoothstep(0.25, 0.75, 0.5)).toBe(0.5)
    })

    it('should be smooth (no abrupt changes)', () => {
      const values: number[] = []
      for (let x = 0; x <= 1; x += 0.1) {
        values.push(smoothstep(0.25, 0.75, x))
      }

      // Check monotonically increasing
      for (let i = 1; i < values.length; i++) {
        expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]!)
      }
    })

    it('should handle custom edge values', () => {
      expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5)
      expect(smoothstep(0.5, 0.6, 0.55)).toBeCloseTo(0.5, 5)
    })
  })

  describe('highlightMask', () => {
    it('should return 0 for dark values', () => {
      expect(highlightMask(0)).toBe(0)
      expect(highlightMask(0.25)).toBe(0)
    })

    it('should return 1 for bright values', () => {
      expect(highlightMask(0.75)).toBe(1)
      expect(highlightMask(1)).toBe(1)
    })

    it('should return 0.5 at midpoint', () => {
      expect(highlightMask(0.5)).toBe(0.5)
    })

    it('should increase with brightness', () => {
      expect(highlightMask(0.3)).toBeLessThan(highlightMask(0.5))
      expect(highlightMask(0.5)).toBeLessThan(highlightMask(0.7))
    })
  })

  describe('shadowMask', () => {
    it('should return 1 for dark values', () => {
      expect(shadowMask(0)).toBe(1)
      expect(shadowMask(0.25)).toBe(1)
    })

    it('should return 0 for bright values', () => {
      expect(shadowMask(0.75)).toBe(0)
      expect(shadowMask(1)).toBe(0)
    })

    it('should return 0.5 at midpoint', () => {
      expect(shadowMask(0.5)).toBe(0.5)
    })

    it('should decrease with brightness', () => {
      expect(shadowMask(0.3)).toBeGreaterThan(shadowMask(0.5))
      expect(shadowMask(0.5)).toBeGreaterThan(shadowMask(0.7))
    })

    it('should be inverse of highlightMask', () => {
      for (let x = 0; x <= 1; x += 0.1) {
        expect(shadowMask(x) + highlightMask(x)).toBeCloseTo(1, 5)
      }
    })
  })

  describe('whiteMask', () => {
    it('should return 0 for values below 0.75', () => {
      expect(whiteMask(0)).toBe(0)
      expect(whiteMask(0.5)).toBe(0)
      expect(whiteMask(0.75)).toBe(0)
    })

    it('should return 1 for maximum brightness', () => {
      expect(whiteMask(1)).toBe(1)
    })

    it('should increase in the 0.75-1.0 range', () => {
      expect(whiteMask(0.8)).toBeGreaterThan(0)
      expect(whiteMask(0.8)).toBeLessThan(whiteMask(0.9))
      expect(whiteMask(0.9)).toBeLessThan(whiteMask(1.0))
    })

    it('should be narrower than highlightMask', () => {
      // whiteMask only activates above 0.75, highlightMask activates above 0.25
      expect(whiteMask(0.5)).toBe(0)
      expect(highlightMask(0.5)).toBe(0.5)
    })
  })

  describe('blackMask', () => {
    it('should return 1 for minimum brightness', () => {
      expect(blackMask(0)).toBe(1)
    })

    it('should return 0 for values above 0.25', () => {
      expect(blackMask(0.25)).toBe(0)
      expect(blackMask(0.5)).toBe(0)
      expect(blackMask(1)).toBe(0)
    })

    it('should decrease in the 0.0-0.25 range', () => {
      expect(blackMask(0.1)).toBeLessThan(blackMask(0))
      expect(blackMask(0.2)).toBeLessThan(blackMask(0.1))
    })

    it('should be narrower than shadowMask', () => {
      // blackMask only activates below 0.25, shadowMask activates below 0.75
      expect(blackMask(0.5)).toBe(0)
      expect(shadowMask(0.5)).toBe(0.5)
    })
  })

  describe('clarityMask', () => {
    it('should return 0 at edges', () => {
      expect(clarityMask(0)).toBe(0)
      expect(clarityMask(1)).toBe(0)
    })

    it('should return 1 at midpoint', () => {
      expect(clarityMask(0.5)).toBe(1)
    })

    it('should be symmetric around 0.5', () => {
      expect(clarityMask(0.25)).toBeCloseTo(clarityMask(0.75), 5)
      expect(clarityMask(0.1)).toBeCloseTo(clarityMask(0.9), 5)
      expect(clarityMask(0.3)).toBeCloseTo(clarityMask(0.7), 5)
    })

    it('should form a bell curve', () => {
      // Increasing from 0 to 0.5
      expect(clarityMask(0.1)).toBeLessThan(clarityMask(0.3))
      expect(clarityMask(0.3)).toBeLessThan(clarityMask(0.5))

      // Decreasing from 0.5 to 1
      expect(clarityMask(0.5)).toBeGreaterThan(clarityMask(0.7))
      expect(clarityMask(0.7)).toBeGreaterThan(clarityMask(0.9))
    })

    it('should be positive for all values in (0, 1)', () => {
      for (let x = 0.01; x < 1; x += 0.05) {
        expect(clarityMask(x)).toBeGreaterThan(0)
      }
    })
  })
})
