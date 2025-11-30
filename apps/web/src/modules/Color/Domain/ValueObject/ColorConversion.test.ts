import { describe, it, expect } from 'vitest'
import { $Hsv } from './Hsv'
import { $Hsl } from './Hsl'
import { $Srgb } from './Srgb'

describe('Color conversions after 0-1 normalization fix', () => {
  it('HSV to RGB and back should maintain values', () => {
    const hsv = { h: 180, s: 0.5, v: 0.8 }
    const rgb = $Hsv.toSrgb(hsv)

    // RGB should be in 0-1 range
    expect(rgb.r).toBeGreaterThanOrEqual(0)
    expect(rgb.r).toBeLessThanOrEqual(1)
    expect(rgb.g).toBeGreaterThanOrEqual(0)
    expect(rgb.g).toBeLessThanOrEqual(1)
    expect(rgb.b).toBeGreaterThanOrEqual(0)
    expect(rgb.b).toBeLessThanOrEqual(1)

    const hsvBack = $Hsv.fromSrgb(rgb)
    expect(hsvBack.h).toBeCloseTo(hsv.h, 0)
    expect(hsvBack.s).toBeCloseTo(hsv.s, 2)
    expect(hsvBack.v).toBeCloseTo(hsv.v, 2)
  })

  it('HSL to RGB and back should maintain values', () => {
    const hsl = { h: 240, s: 0.6, l: 0.5 }
    const rgb = $Hsl.toSrgb(hsl)

    // RGB should be in 0-1 range
    expect(rgb.r).toBeGreaterThanOrEqual(0)
    expect(rgb.r).toBeLessThanOrEqual(1)
    expect(rgb.g).toBeGreaterThanOrEqual(0)
    expect(rgb.g).toBeLessThanOrEqual(1)
    expect(rgb.b).toBeGreaterThanOrEqual(0)
    expect(rgb.b).toBeLessThanOrEqual(1)

    const hslBack = $Hsl.fromSrgb(rgb)
    expect(hslBack.h).toBeCloseTo(hsl.h, 0)
    expect(hslBack.s).toBeCloseTo(hsl.s, 2)
    expect(hslBack.l).toBeCloseTo(hsl.l, 2)
  })

  it('CSS color generation should work correctly', () => {
    const rgb = $Srgb.create(0.5, 0.25, 0.75)

    const css = $Srgb.toCssRgb(rgb)
    expect(css).toBe('rgb(128, 64, 191)')

    const hex = $Srgb.toHex(rgb)
    expect(hex).toBe('#8040bf')

    const rgb255 = $Srgb.to255(rgb)
    expect(rgb255.r).toBe(128)
    expect(rgb255.g).toBe(64)
    expect(rgb255.b).toBe(191)
  })

  it('Srgb validation should clamp out-of-range values', () => {
    const invalid = $Srgb.create(1.5, -0.2, 0.5)
    expect(invalid.r).toBe(1)
    expect(invalid.g).toBe(0)
    expect(invalid.b).toBe(0.5)
  })
})