import { describe, it, expect } from 'vitest'
import {
  BASE_COLOR_CONSTRAINTS,
  validateBaseColor,
  clampToBaseColor,
  isValidBaseColor,
} from './BaseColor'
import type { Oklch } from '@practice/color'

describe('BaseColor constraints', () => {
  it('has correct L constraints', () => {
    expect(BASE_COLOR_CONSTRAINTS.L.min).toBe(0.08)
    expect(BASE_COLOR_CONSTRAINTS.L.max).toBe(0.98)
  })

  it('has correct C constraints', () => {
    expect(BASE_COLOR_CONSTRAINTS.C.min).toBe(0.00)
    expect(BASE_COLOR_CONSTRAINTS.C.max).toBe(0.03)
  })
})

describe('validateBaseColor', () => {
  it('returns valid for a typical light base', () => {
    const lightBase: Oklch = { L: 0.97, C: 0.005, H: 260 }
    const result = validateBaseColor(lightBase)
    expect(result.valid).toBe(true)
  })

  it('returns valid for a typical dark base', () => {
    const darkBase: Oklch = { L: 0.12, C: 0.01, H: 260 }
    const result = validateBaseColor(darkBase)
    expect(result.valid).toBe(true)
  })

  it('returns error for L too low', () => {
    const tooBlack: Oklch = { L: 0.05, C: 0.005, H: 260 }
    const result = validateBaseColor(tooBlack)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'L_TOO_LOW')).toBe(true)
    }
  })

  it('returns error for L too high', () => {
    const tooWhite: Oklch = { L: 0.99, C: 0.005, H: 260 }
    const result = validateBaseColor(tooWhite)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'L_TOO_HIGH')).toBe(true)
    }
  })

  it('returns error for C too high', () => {
    const tooColorful: Oklch = { L: 0.5, C: 0.1, H: 260 }
    const result = validateBaseColor(tooColorful)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.some((e) => e.type === 'C_TOO_HIGH')).toBe(true)
    }
  })

  it('allows C = 0 (pure achromatic)', () => {
    const achromatic: Oklch = { L: 0.5, C: 0, H: 0 }
    const result = validateBaseColor(achromatic)
    expect(result.valid).toBe(true)
  })
})

describe('clampToBaseColor', () => {
  it('clamps L below minimum to minimum', () => {
    const tooBlack: Oklch = { L: 0.02, C: 0.01, H: 260 }
    const clamped = clampToBaseColor(tooBlack)
    expect(clamped.L).toBe(BASE_COLOR_CONSTRAINTS.L.min)
  })

  it('clamps L above maximum to maximum', () => {
    const tooWhite: Oklch = { L: 1.0, C: 0.01, H: 260 }
    const clamped = clampToBaseColor(tooWhite)
    expect(clamped.L).toBe(BASE_COLOR_CONSTRAINTS.L.max)
  })

  it('clamps C above maximum to maximum', () => {
    const tooColorful: Oklch = { L: 0.5, C: 0.2, H: 260 }
    const clamped = clampToBaseColor(tooColorful)
    expect(clamped.C).toBeLessThanOrEqual(BASE_COLOR_CONSTRAINTS.C.max)
  })

  it('preserves hue', () => {
    const color: Oklch = { L: 0.5, C: 0.01, H: 180 }
    const clamped = clampToBaseColor(color)
    expect(clamped.H).toBe(180)
  })

  it('returns valid base color', () => {
    const invalid: Oklch = { L: 0.02, C: 0.2, H: 260 }
    const clamped = clampToBaseColor(invalid)
    expect(isValidBaseColor(clamped)).toBe(true)
  })
})

describe('isValidBaseColor', () => {
  it('returns true for valid base', () => {
    const valid: Oklch = { L: 0.9, C: 0.01, H: 260 }
    expect(isValidBaseColor(valid)).toBe(true)
  })

  it('returns false for invalid base', () => {
    const invalid: Oklch = { L: 0.99, C: 0.1, H: 260 }
    expect(isValidBaseColor(invalid)).toBe(false)
  })
})
