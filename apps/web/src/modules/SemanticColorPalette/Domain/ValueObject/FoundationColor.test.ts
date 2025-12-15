import { describe, it, expect } from 'vitest'
import {
  FOUNDATION_COLOR_CONSTRAINTS,
  validateFoundationColor,
  clampToFoundationColor,
  isValidFoundationColor,
} from './FoundationColor'
import type { Oklch } from '@practice/color'

describe('FoundationColor constraints', () => {
  it('has correct L constraints', () => {
    expect(FOUNDATION_COLOR_CONSTRAINTS.L.min).toBe(0.08)
    expect(FOUNDATION_COLOR_CONSTRAINTS.L.max).toBe(0.98)
  })

  it('has correct C constraints', () => {
    expect(FOUNDATION_COLOR_CONSTRAINTS.C.min).toBe(0.00)
    expect(FOUNDATION_COLOR_CONSTRAINTS.C.max).toBe(0.03)
  })
})

describe('validateFoundationColor', () => {
  it('returns valid for a typical light foundation', () => {
    const lightFoundation: Oklch = { L: 0.97, C: 0.005, H: 260 }
    const result = validateFoundationColor(lightFoundation)
    expect(result.valid).toBe(true)
  })

  it('returns valid for a typical dark foundation', () => {
    const darkFoundation: Oklch = { L: 0.12, C: 0.01, H: 260 }
    const result = validateFoundationColor(darkFoundation)
    expect(result.valid).toBe(true)
  })

  it('returns error for L too low', () => {
    const tooBlack: Oklch = { L: 0.05, C: 0.005, H: 260 }
    const result = validateFoundationColor(tooBlack)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'L_TOO_LOW')).toBe(true)
    }
  })

  it('returns error for L too high', () => {
    const tooWhite: Oklch = { L: 0.99, C: 0.005, H: 260 }
    const result = validateFoundationColor(tooWhite)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'L_TOO_HIGH')).toBe(true)
    }
  })

  it('returns error for C too high', () => {
    const tooColorful: Oklch = { L: 0.5, C: 0.1, H: 260 }
    const result = validateFoundationColor(tooColorful)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'C_TOO_HIGH')).toBe(true)
    }
  })

  it('allows C = 0 (pure achromatic)', () => {
    const achromatic: Oklch = { L: 0.5, C: 0, H: 0 }
    const result = validateFoundationColor(achromatic)
    expect(result.valid).toBe(true)
  })
})

describe('clampToFoundationColor', () => {
  it('clamps L below minimum to minimum', () => {
    const tooBlack: Oklch = { L: 0.02, C: 0.01, H: 260 }
    const clamped = clampToFoundationColor(tooBlack)
    expect(clamped.L).toBe(FOUNDATION_COLOR_CONSTRAINTS.L.min)
  })

  it('clamps L above maximum to maximum', () => {
    const tooWhite: Oklch = { L: 1.0, C: 0.01, H: 260 }
    const clamped = clampToFoundationColor(tooWhite)
    expect(clamped.L).toBe(FOUNDATION_COLOR_CONSTRAINTS.L.max)
  })

  it('clamps C above maximum to maximum', () => {
    const tooColorful: Oklch = { L: 0.5, C: 0.2, H: 260 }
    const clamped = clampToFoundationColor(tooColorful)
    expect(clamped.C).toBeLessThanOrEqual(FOUNDATION_COLOR_CONSTRAINTS.C.max)
  })

  it('preserves hue', () => {
    const color: Oklch = { L: 0.5, C: 0.01, H: 180 }
    const clamped = clampToFoundationColor(color)
    expect(clamped.H).toBe(180)
  })

  it('returns valid foundation color', () => {
    const invalid: Oklch = { L: 0.02, C: 0.2, H: 260 }
    const clamped = clampToFoundationColor(invalid)
    expect(isValidFoundationColor(clamped)).toBe(true)
  })
})

describe('isValidFoundationColor', () => {
  it('returns true for valid foundation', () => {
    const valid: Oklch = { L: 0.9, C: 0.01, H: 260 }
    expect(isValidFoundationColor(valid)).toBe(true)
  })

  it('returns false for invalid foundation', () => {
    const invalid: Oklch = { L: 0.99, C: 0.1, H: 260 }
    expect(isValidFoundationColor(invalid)).toBe(false)
  })
})
