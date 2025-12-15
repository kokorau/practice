import { describe, it, expect } from 'vitest'
import {
  BRAND_COLOR_CONSTRAINTS,
  validateBrandColor,
  clampToBrandColor,
  isValidBrandColor,
} from './BrandColor'
import type { Oklch } from '@practice/color'

describe('BrandColor constraints', () => {
  it('has correct L constraints', () => {
    expect(BRAND_COLOR_CONSTRAINTS.L.min).toBe(0.20)
    expect(BRAND_COLOR_CONSTRAINTS.L.max).toBe(0.85)
  })

  it('has correct C constraints', () => {
    expect(BRAND_COLOR_CONSTRAINTS.C.min).toBe(0.04)
    expect(BRAND_COLOR_CONSTRAINTS.C.max).toBe(0.35)
  })
})

describe('validateBrandColor', () => {
  it('returns valid for a typical brand color', () => {
    const brand: Oklch = { L: 0.55, C: 0.18, H: 250 }
    const result = validateBrandColor(brand)
    expect(result.valid).toBe(true)
  })

  it('returns error for L too low', () => {
    const tooDark: Oklch = { L: 0.15, C: 0.1, H: 250 }
    const result = validateBrandColor(tooDark)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'L_TOO_LOW')).toBe(true)
    }
  })

  it('returns error for L too high', () => {
    const tooLight: Oklch = { L: 0.90, C: 0.1, H: 250 }
    const result = validateBrandColor(tooLight)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'L_TOO_HIGH')).toBe(true)
    }
  })

  it('returns error for C too low (nearly achromatic)', () => {
    const tooGray: Oklch = { L: 0.5, C: 0.02, H: 250 }
    const result = validateBrandColor(tooGray)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'C_TOO_LOW')).toBe(true)
    }
  })

  it('returns error for C too high', () => {
    const tooSaturated: Oklch = { L: 0.5, C: 0.40, H: 250 }
    const result = validateBrandColor(tooSaturated)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'C_TOO_HIGH')).toBe(true)
    }
  })

  it('accepts edge of valid range', () => {
    const minValid: Oklch = { L: 0.20, C: 0.04, H: 250 }
    expect(validateBrandColor(minValid).valid).toBe(true)
    // Note: high L + high C combinations may be out of P3 gamut for some hues
    // Test a conservative value that is definitely in gamut
    const safeMax: Oklch = { L: 0.70, C: 0.10, H: 250 }
    expect(validateBrandColor(safeMax).valid).toBe(true)
  })
})

describe('clampToBrandColor', () => {
  it('clamps L below minimum to minimum', () => {
    const tooDark: Oklch = { L: 0.10, C: 0.1, H: 250 }
    const clamped = clampToBrandColor(tooDark)
    expect(clamped.L).toBe(BRAND_COLOR_CONSTRAINTS.L.min)
  })

  it('clamps L above maximum to maximum', () => {
    const tooLight: Oklch = { L: 0.95, C: 0.1, H: 250 }
    const clamped = clampToBrandColor(tooLight)
    expect(clamped.L).toBe(BRAND_COLOR_CONSTRAINTS.L.max)
  })

  it('clamps C below minimum to minimum', () => {
    const tooGray: Oklch = { L: 0.5, C: 0.01, H: 250 }
    const clamped = clampToBrandColor(tooGray)
    expect(clamped.C).toBeGreaterThanOrEqual(BRAND_COLOR_CONSTRAINTS.C.min)
  })

  it('clamps C above maximum to maximum', () => {
    const tooSaturated: Oklch = { L: 0.5, C: 0.5, H: 250 }
    const clamped = clampToBrandColor(tooSaturated)
    expect(clamped.C).toBeLessThanOrEqual(BRAND_COLOR_CONSTRAINTS.C.max)
  })

  it('preserves hue', () => {
    const color: Oklch = { L: 0.5, C: 0.1, H: 180 }
    const clamped = clampToBrandColor(color)
    expect(clamped.H).toBe(180)
  })
})

describe('isValidBrandColor', () => {
  it('returns true for valid brand', () => {
    const valid: Oklch = { L: 0.55, C: 0.15, H: 250 }
    expect(isValidBrandColor(valid)).toBe(true)
  })

  it('returns false for invalid brand', () => {
    const invalid: Oklch = { L: 0.10, C: 0.01, H: 250 }
    expect(isValidBrandColor(invalid)).toBe(false)
  })
})
