/**
 * resolveColors tests
 */

import { describe, it, expect } from 'vitest'
import type { Oklch } from '@practice/color'
import type { PrimitivePalette, PrimitiveKey } from '@practice/semantic-color-palette/Domain'
import {
  oklchToRgba,
  oklchToCss,
  getCanvasSurfaceKey,
  getSurfaceKeyForContext,
  resolveKeyToOklch,
  resolveKeyToRgba,
  resolveKeyToCss,
  resolveAutoMaskPrimaryColor,
  resolveSurfaceColorKey,
} from './resolveColors'

// ============================================================
// Test Fixtures
// ============================================================

function createTestPalette(): PrimitivePalette {
  const white: Oklch = { L: 0.99, C: 0, H: 0 }
  const black: Oklch = { L: 0.01, C: 0, H: 0 }
  const brand: Oklch = { L: 0.6, C: 0.15, H: 250 }

  return {
    BN0: black, BN1: { L: 0.1, C: 0, H: 0 }, BN2: { L: 0.2, C: 0, H: 0 },
    BN3: { L: 0.3, C: 0, H: 0 }, BN4: { L: 0.4, C: 0, H: 0 }, BN5: { L: 0.5, C: 0, H: 0 },
    BN6: { L: 0.6, C: 0, H: 0 }, BN7: { L: 0.7, C: 0, H: 0 }, BN8: { L: 0.8, C: 0, H: 0 },
    BN9: white,
    F0: black, F1: { L: 0.95, C: 0, H: 0 }, F2: { L: 0.9, C: 0, H: 0 },
    F3: { L: 0.85, C: 0, H: 0 }, F4: { L: 0.8, C: 0, H: 0 }, F5: { L: 0.5, C: 0, H: 0 },
    F6: { L: 0.2, C: 0, H: 0 }, F7: { L: 0.15, C: 0, H: 0 }, F8: { L: 0.1, C: 0, H: 0 },
    F9: black,
    AN0: black, AN1: { L: 0.1, C: 0, H: 0 }, AN2: { L: 0.2, C: 0, H: 0 },
    AN3: { L: 0.3, C: 0, H: 0 }, AN4: { L: 0.4, C: 0, H: 0 }, AN5: { L: 0.5, C: 0, H: 0 },
    AN6: { L: 0.6, C: 0, H: 0 }, AN7: { L: 0.7, C: 0, H: 0 }, AN8: { L: 0.8, C: 0, H: 0 },
    AN9: white,
    B: brand, Bt: { L: 0.8, C: 0.1, H: 250 }, Bs: { L: 0.3, C: 0.1, H: 250 }, Bf: { L: 0.4, C: 0.2, H: 250 },
    A: { L: 0.7, C: 0.2, H: 30 }, At: { L: 0.9, C: 0.1, H: 30 }, As: { L: 0.4, C: 0.15, H: 30 }, Af: { L: 0.5, C: 0.25, H: 30 },
  } as PrimitivePalette
}

// ============================================================
// oklchToRgba
// ============================================================

describe('oklchToRgba', () => {
  it('should convert white to [1,1,1,1]', () => {
    const white: Oklch = { L: 1, C: 0, H: 0 }
    const rgba = oklchToRgba(white)
    expect(rgba[0]).toBeCloseTo(1, 1)
    expect(rgba[1]).toBeCloseTo(1, 1)
    expect(rgba[2]).toBeCloseTo(1, 1)
    expect(rgba[3]).toBe(1)
  })

  it('should convert black to [0,0,0,1]', () => {
    const black: Oklch = { L: 0, C: 0, H: 0 }
    const rgba = oklchToRgba(black)
    expect(rgba[0]).toBeCloseTo(0, 1)
    expect(rgba[1]).toBeCloseTo(0, 1)
    expect(rgba[2]).toBeCloseTo(0, 1)
    expect(rgba[3]).toBe(1)
  })

  it('should apply alpha value', () => {
    const color: Oklch = { L: 0.5, C: 0, H: 0 }
    const rgba = oklchToRgba(color, 0.5)
    expect(rgba[3]).toBe(0.5)
  })

  it('should clamp RGB values to [0,1]', () => {
    // Use a very saturated color that might produce out-of-gamut values
    const saturated: Oklch = { L: 0.7, C: 0.35, H: 150 }
    const rgba = oklchToRgba(saturated)
    expect(rgba[0]).toBeGreaterThanOrEqual(0)
    expect(rgba[0]).toBeLessThanOrEqual(1)
    expect(rgba[1]).toBeGreaterThanOrEqual(0)
    expect(rgba[1]).toBeLessThanOrEqual(1)
    expect(rgba[2]).toBeGreaterThanOrEqual(0)
    expect(rgba[2]).toBeLessThanOrEqual(1)
  })
})

// ============================================================
// oklchToCss
// ============================================================

describe('oklchToCss', () => {
  it('should return CSS oklch string', () => {
    const color: Oklch = { L: 0.5, C: 0.1, H: 180 }
    const css = oklchToCss(color)
    expect(css).toMatch(/oklch/)
  })
})

// ============================================================
// getCanvasSurfaceKey
// ============================================================

describe('getCanvasSurfaceKey', () => {
  it('should return F1 for light mode', () => {
    expect(getCanvasSurfaceKey(false)).toBe('F1')
  })

  it('should return F8 for dark mode', () => {
    expect(getCanvasSurfaceKey(true)).toBe('F8')
  })
})

// ============================================================
// getSurfaceKeyForContext
// ============================================================

describe('getSurfaceKeyForContext', () => {
  describe('light mode', () => {
    it('should return F1 for canvas', () => {
      expect(getSurfaceKeyForContext('canvas', false)).toBe('F1')
    })

    it('should return F2 for sectionNeutral', () => {
      expect(getSurfaceKeyForContext('sectionNeutral', false)).toBe('F2')
    })

    it('should return Bt for sectionTint', () => {
      expect(getSurfaceKeyForContext('sectionTint', false)).toBe('Bt')
    })

    it('should return Bf for sectionContrast', () => {
      expect(getSurfaceKeyForContext('sectionContrast', false)).toBe('Bf')
    })
  })

  describe('dark mode', () => {
    it('should return F8 for canvas', () => {
      expect(getSurfaceKeyForContext('canvas', true)).toBe('F8')
    })

    it('should return F7 for sectionNeutral', () => {
      expect(getSurfaceKeyForContext('sectionNeutral', true)).toBe('F7')
    })

    it('should return Bs for sectionTint', () => {
      expect(getSurfaceKeyForContext('sectionTint', true)).toBe('Bs')
    })

    it('should return Bf for sectionContrast', () => {
      expect(getSurfaceKeyForContext('sectionContrast', true)).toBe('Bf')
    })
  })
})

// ============================================================
// resolveKeyToOklch
// ============================================================

describe('resolveKeyToOklch', () => {
  it('should resolve palette key to Oklch', () => {
    const palette = createTestPalette()
    const color = resolveKeyToOklch(palette, 'B')
    expect(color).toBeDefined()
    expect(color?.L).toBe(0.6)
    expect(color?.C).toBe(0.15)
    expect(color?.H).toBe(250)
  })

  it('should return undefined for invalid key', () => {
    const palette = createTestPalette()
    const color = resolveKeyToOklch(palette, 'INVALID' as PrimitiveKey)
    expect(color).toBeUndefined()
  })
})

// ============================================================
// resolveKeyToRgba
// ============================================================

describe('resolveKeyToRgba', () => {
  it('should resolve palette key to RGBA', () => {
    const palette = createTestPalette()
    const rgba = resolveKeyToRgba(palette, 'BN9') // white
    expect(rgba).toHaveLength(4)
    expect(rgba[0]).toBeCloseTo(1, 1)
    expect(rgba[1]).toBeCloseTo(1, 1)
    expect(rgba[2]).toBeCloseTo(1, 1)
    expect(rgba[3]).toBe(1)
  })

  it('should return fallback gray for invalid key', () => {
    const palette = createTestPalette()
    const rgba = resolveKeyToRgba(palette, 'INVALID' as PrimitiveKey)
    expect(rgba).toEqual([0.5, 0.5, 0.5, 1])
  })

  it('should apply custom alpha', () => {
    const palette = createTestPalette()
    const rgba = resolveKeyToRgba(palette, 'B', 0.5)
    expect(rgba[3]).toBe(0.5)
  })
})

// ============================================================
// resolveKeyToCss
// ============================================================

describe('resolveKeyToCss', () => {
  it('should resolve palette key to CSS string', () => {
    const palette = createTestPalette()
    const css = resolveKeyToCss(palette, 'B')
    expect(css).toMatch(/oklch/)
  })

  it('should return fallback gray for invalid key', () => {
    const palette = createTestPalette()
    const css = resolveKeyToCss(palette, 'INVALID' as PrimitiveKey)
    expect(css).toBe('oklch(0.5 0 0)')
  })
})

// ============================================================
// resolveAutoMaskPrimaryColor
// ============================================================

describe('resolveAutoMaskPrimaryColor', () => {
  it('should apply positive deltaL in dark mode', () => {
    const palette = createTestPalette()
    const color = resolveAutoMaskPrimaryColor(palette, 'F8', true)
    // F8 has L: 0.1, dark mode adds 0.12
    expect(color.L).toBeCloseTo(0.22, 2)
  })

  it('should apply negative deltaL in light mode', () => {
    const palette = createTestPalette()
    const color = resolveAutoMaskPrimaryColor(palette, 'F1', false)
    // F1 has L: 0.95, light mode subtracts 0.12
    expect(color.L).toBeCloseTo(0.83, 2)
  })

  it('should preserve chroma and hue', () => {
    const palette = createTestPalette()
    const color = resolveAutoMaskPrimaryColor(palette, 'Bt', false)
    // Bt has C: 0.1, H: 250
    expect(color.C).toBe(0.1)
    expect(color.H).toBe(250)
  })
})

// ============================================================
// resolveSurfaceColorKey
// ============================================================

describe('resolveSurfaceColorKey', () => {
  it('should resolve explicit key to RGBA', () => {
    const palette = createTestPalette()
    const rgba = resolveSurfaceColorKey(palette, 'B', 'F1', false, true)
    expect(rgba).toHaveLength(4)
    // B is the brand color, not white
    expect(rgba[3]).toBe(1)
  })

  it('should resolve auto primary with deltaL adjustment', () => {
    const palette = createTestPalette()
    const rgba = resolveSurfaceColorKey(palette, 'auto', 'F1', false, true)
    expect(rgba).toHaveLength(4)
    // Should have deltaL applied
  })

  it('should resolve auto secondary to fallback key directly', () => {
    const palette = createTestPalette()
    const rgba = resolveSurfaceColorKey(palette, 'auto', 'F1', false, false)
    // F1 has L: 0.95 (near white)
    expect(rgba[0]).toBeCloseTo(0.95, 1)
    expect(rgba[1]).toBeCloseTo(0.95, 1)
    expect(rgba[2]).toBeCloseTo(0.95, 1)
  })
})
