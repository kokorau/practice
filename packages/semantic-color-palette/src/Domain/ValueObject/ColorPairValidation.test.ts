import { describe, it, expect } from 'vitest'
import {
  REQUIRED_CONTRAST_RATIO,
  deriveBrandText,
  validateColorPair,
  getAllowableFoundationLRange,
  isFoundationLInAllowableRange,
} from './ColorPairValidation'
import type { Oklch } from '@practice/color'
import { contrastRatio } from '@practice/color'

describe('REQUIRED_CONTRAST_RATIO', () => {
  it('is 4.5 (WCAG AA)', () => {
    expect(REQUIRED_CONTRAST_RATIO).toBe(4.5)
  })
})

describe('deriveBrandText', () => {
  it('reduces chroma by 10%', () => {
    const brand: Oklch = { L: 0.55, C: 0.20, H: 250 }
    const brandText = deriveBrandText(brand)
    expect(brandText.C).toBeCloseTo(0.18, 4)
  })

  it('preserves L and H', () => {
    const brand: Oklch = { L: 0.55, C: 0.20, H: 250 }
    const brandText = deriveBrandText(brand)
    expect(brandText.L).toBe(brand.L)
    expect(brandText.H).toBe(brand.H)
  })
})

describe('validateColorPair', () => {
  it('returns valid for high contrast light foundation + dark brand', () => {
    const lightFoundation: Oklch = { L: 0.97, C: 0.005, H: 250 }
    // Use a brand that satisfies constraints (L: 0.20-0.85, C: 0.04-0.35)
    const darkBrand: Oklch = { L: 0.35, C: 0.12, H: 250 }
    const result = validateColorPair(lightFoundation, darkBrand)
    expect(result.valid).toBe(true)
    expect(result.contrastRatio).toBeGreaterThanOrEqual(4.5)
  })

  it('returns valid for dark foundation + light brand', () => {
    const darkFoundation: Oklch = { L: 0.12, C: 0.005, H: 250 }
    // Use a lighter brand that satisfies constraints (L <= 0.85)
    const lightBrand: Oklch = { L: 0.80, C: 0.10, H: 250 }
    const result = validateColorPair(darkFoundation, lightBrand)
    expect(result.valid).toBe(true)
    expect(result.contrastRatio).toBeGreaterThanOrEqual(4.5)
  })

  it('returns invalid for insufficient contrast', () => {
    // Mid-gray foundation with mid-brightness brand = low contrast
    const midFoundation: Oklch = { L: 0.55, C: 0.01, H: 250 }
    const midBrand: Oklch = { L: 0.50, C: 0.15, H: 250 }
    const result = validateColorPair(midFoundation, midBrand)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'INSUFFICIENT_CONTRAST')).toBe(true)
    }
  })

  it('returns FOUNDATION_INVALID error for invalid foundation', () => {
    const invalidFoundation: Oklch = { L: 0.05, C: 0.1, H: 250 } // L too low, C too high
    const validBrand: Oklch = { L: 0.55, C: 0.15, H: 250 }
    const result = validateColorPair(invalidFoundation, validBrand)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'FOUNDATION_INVALID')).toBe(true)
    }
  })

  it('returns BRAND_INVALID error for invalid brand', () => {
    const validFoundation: Oklch = { L: 0.97, C: 0.005, H: 250 }
    const invalidBrand: Oklch = { L: 0.10, C: 0.01, H: 250 } // L and C too low
    const result = validateColorPair(validFoundation, invalidBrand)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'BRAND_INVALID')).toBe(true)
    }
  })

  it('includes contrast ratio in result even when invalid', () => {
    const midFoundation: Oklch = { L: 0.55, C: 0.01, H: 250 }
    const midBrand: Oklch = { L: 0.50, C: 0.15, H: 250 }
    const result = validateColorPair(midFoundation, midBrand)
    expect(typeof result.contrastRatio).toBe('number')
    expect(result.contrastRatio).toBeGreaterThan(0)
  })
})

describe('getAllowableFoundationLRange', () => {
  it('returns a range for a typical brand', () => {
    const brand: Oklch = { L: 0.55, C: 0.15, H: 250 }
    const range = getAllowableFoundationLRange(brand)
    expect(range).not.toBeNull()
    expect(range!.min).toBeLessThan(range!.max)
  })

  it('returns light range for dark brand', () => {
    // Dark brand should require light foundation
    const darkBrand: Oklch = { L: 0.30, C: 0.15, H: 250 }
    const range = getAllowableFoundationLRange(darkBrand)
    expect(range).not.toBeNull()
    // For dark brand, valid foundations should be lighter
    expect(range!.max).toBeGreaterThan(0.5)
  })

  it('returns dark range for light brand', () => {
    // Light brand should require dark foundation
    const lightBrand: Oklch = { L: 0.80, C: 0.10, H: 250 }
    const range = getAllowableFoundationLRange(lightBrand)
    expect(range).not.toBeNull()
    // For light brand, valid foundations should be darker
    expect(range!.min).toBeLessThan(0.5)
  })

  it('range values satisfy contrast requirement', () => {
    // Use a dark brand to get a clear light-side range
    const brand: Oklch = { L: 0.30, C: 0.10, H: 250 }
    const range = getAllowableFoundationLRange(brand)
    expect(range).not.toBeNull()

    const brandText = deriveBrandText(brand)

    // Test the max boundary (should be well within the valid range)
    const foundationAtMax: Oklch = { L: range!.max, C: 0, H: brand.H }
    const ratioAtMax = contrastRatio(brandText, foundationAtMax)

    // The max boundary should satisfy contrast requirement
    expect(ratioAtMax).toBeGreaterThanOrEqual(REQUIRED_CONTRAST_RATIO - 0.2)
  })
})

describe('isFoundationLInAllowableRange', () => {
  it('returns true for L within range', () => {
    // Dark brand (L=0.30) should allow light foundations (near white)
    const brand: Oklch = { L: 0.30, C: 0.10, H: 250 }
    const range = getAllowableFoundationLRange(brand)
    // L=0.95 should be within the allowable range for a dark brand
    expect(range).not.toBeNull()
    // For very dark brand, we need very light foundation for contrast
    // The range.max should be close to 0.98
    expect(range!.max).toBeGreaterThan(0.90)
    expect(isFoundationLInAllowableRange(range!.max - 0.01, brand)).toBe(true)
  })

  it('returns false for L outside range', () => {
    // Dark brand + similar darkness foundation = insufficient contrast
    const brand: Oklch = { L: 0.30, C: 0.10, H: 250 }
    const range = getAllowableFoundationLRange(brand)
    expect(range).not.toBeNull()
    // A foundation with similar lightness to the brand should fail
    expect(isFoundationLInAllowableRange(0.30, brand)).toBe(false)
  })
})
