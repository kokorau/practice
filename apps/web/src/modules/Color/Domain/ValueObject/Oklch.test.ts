import { describe, it, expect } from 'vitest'
import { $Oklch } from './Oklch'
import { $Srgb } from './Srgb'

describe('Oklch', () => {
  it('should convert to sRGB correctly', () => {
    // Pure red-ish color
    const oklch = $Oklch.create(0.5, 0.15, 25)
    const srgb = $Oklch.toSrgb(oklch)

    console.log('OKLCH:', oklch)
    console.log('sRGB:', srgb)

    expect(srgb.r).toBeGreaterThanOrEqual(0)
    expect(srgb.r).toBeLessThanOrEqual(255)
    expect(srgb.g).toBeGreaterThanOrEqual(0)
    expect(srgb.g).toBeLessThanOrEqual(255)
    expect(srgb.b).toBeGreaterThanOrEqual(0)
    expect(srgb.b).toBeLessThanOrEqual(255)
  })

  it('should round-trip sRGB -> OKLCH -> sRGB', () => {
    const original = $Srgb.create(128, 64, 192)
    const oklch = $Oklch.fromSrgb(original)
    const back = $Oklch.toSrgb(oklch)

    console.log('Original:', original)
    console.log('OKLCH:', oklch)
    console.log('Back:', back)

    expect(back.r).toBeCloseTo(original.r, 0)
    expect(back.g).toBeCloseTo(original.g, 0)
    expect(back.b).toBeCloseTo(original.b, 0)
  })

  it('should generate palette colors correctly', () => {
    // Test the exact values used in PhotoColorPalette
    const testCases = [
      { L: 0.97, C: 0.018, H: 25, name: 'red-50' },  // Reduced chroma at high L
      { L: 0.58, C: 0.18, H: 25, name: 'red-500' },
      { L: 0.18, C: 0.072, H: 25, name: 'red-900' }, // Reduced chroma at low L
      { L: 0.58, C: 0.0, H: 0, name: 'gray-500' },   // Neutral gray
    ]

    for (const tc of testCases) {
      const oklch = $Oklch.create(tc.L, tc.C, tc.H)
      const srgb = $Oklch.toSrgb(oklch)
      console.log(`${tc.name}: OKLCH(${tc.L}, ${tc.C}, ${tc.H}) -> RGB(${srgb.r}, ${srgb.g}, ${srgb.b})`)

      expect(srgb.r).toBeGreaterThanOrEqual(0)
      expect(srgb.r).toBeLessThanOrEqual(255)
    }
  })
})
