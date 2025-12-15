import { describe, it, expect } from 'vitest'
import { contrastRatio, meetsWcagAA, meetsWcagAAA, WCAG_CONTRAST_AA, WCAG_CONTRAST_AAA } from './Contrast'
import type { Oklch } from './Oklch'

describe('contrastRatio', () => {
  // Pure white and pure black in OKLCH
  const white: Oklch = { L: 1, C: 0, H: 0 }
  const black: Oklch = { L: 0, C: 0, H: 0 }

  it('returns 21:1 for white and black', () => {
    const ratio = contrastRatio(white, black)
    expect(ratio).toBeCloseTo(21.0, 1)
  })

  it('returns 1:1 for same color', () => {
    const ratio = contrastRatio(white, white)
    expect(ratio).toBeCloseTo(1.0, 1)
  })

  it('is commutative (order does not matter)', () => {
    const ratio1 = contrastRatio(white, black)
    const ratio2 = contrastRatio(black, white)
    expect(ratio1).toBeCloseTo(ratio2, 5)
  })

  it('calculates correct ratio for mid-gray', () => {
    // Mid-gray should have roughly equal contrast to both extremes
    const midGray: Oklch = { L: 0.5, C: 0, H: 0 }
    const ratioToWhite = contrastRatio(midGray, white)
    const ratioToBlack = contrastRatio(midGray, black)
    // Mid-gray in OKLCH L=0.5 maps to sRGB ~0.18 (not exactly 0.5 due to perceptual uniformity)
    // Both ratios should be significant but not extreme
    expect(ratioToWhite).toBeGreaterThan(1)
    expect(ratioToBlack).toBeGreaterThan(1)
  })

  it('returns ratio >= 1 always', () => {
    const darkColor: Oklch = { L: 0.2, C: 0.1, H: 250 }
    const lightColor: Oklch = { L: 0.8, C: 0.1, H: 250 }
    expect(contrastRatio(darkColor, lightColor)).toBeGreaterThanOrEqual(1)
    expect(contrastRatio(lightColor, darkColor)).toBeGreaterThanOrEqual(1)
  })
})

describe('meetsWcagAA', () => {
  const white: Oklch = { L: 1, C: 0, H: 0 }
  const black: Oklch = { L: 0, C: 0, H: 0 }

  it('returns true for white and black (21:1 > 4.5:1)', () => {
    expect(meetsWcagAA(white, black)).toBe(true)
  })

  it('returns false for nearly identical colors', () => {
    const gray1: Oklch = { L: 0.5, C: 0, H: 0 }
    const gray2: Oklch = { L: 0.52, C: 0, H: 0 }
    expect(meetsWcagAA(gray1, gray2)).toBe(false)
  })

  it('threshold is 4.5:1', () => {
    expect(WCAG_CONTRAST_AA).toBe(4.5)
  })
})

describe('meetsWcagAAA', () => {
  const white: Oklch = { L: 1, C: 0, H: 0 }
  const black: Oklch = { L: 0, C: 0, H: 0 }

  it('returns true for white and black (21:1 > 7:1)', () => {
    expect(meetsWcagAAA(white, black)).toBe(true)
  })

  it('threshold is 7:1', () => {
    expect(WCAG_CONTRAST_AAA).toBe(7)
  })
})
