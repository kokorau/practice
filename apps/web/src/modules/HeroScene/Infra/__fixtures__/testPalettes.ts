import { $Oklch, type Oklch } from '@practice/color'
import { createPrimitivePalette } from '../../../SemanticColorPalette/Infra'
import type { PrimitivePalette } from '../../../SemanticColorPalette/Domain'

/**
 * Default test colors (blue brand, orange accent, light foundation)
 */
export const DEFAULT_TEST_COLORS = {
  brand: $Oklch.create(0.55, 0.15, 220),      // Blue
  accent: $Oklch.create(0.60, 0.18, 30),       // Orange
  foundation: $Oklch.create(0.97, 0.005, 0),   // Near white
} as const

/**
 * Dark theme test colors
 */
export const DARK_TEST_COLORS = {
  brand: $Oklch.create(0.55, 0.15, 220),
  accent: $Oklch.create(0.60, 0.18, 30),
  foundation: $Oklch.create(0.15, 0.01, 260),  // Near black
} as const

/**
 * Create a test palette with default colors
 */
export function createTestPalette(colors = DEFAULT_TEST_COLORS): PrimitivePalette {
  return createPrimitivePalette({
    brand: colors.brand,
    accent: colors.accent,
    foundation: colors.foundation,
  })
}

/**
 * Create a dark theme test palette
 */
export function createDarkTestPalette(): PrimitivePalette {
  return createTestPalette(DARK_TEST_COLORS)
}

/**
 * Create custom palette from HSV values (matching preset format)
 */
export function createPaletteFromHsv(params: {
  brand: { hue: number; saturation: number; value: number }
  accent: { hue: number; saturation: number; value: number }
  foundation: { hue: number; saturation: number; value: number }
}): PrimitivePalette {
  const hsvToOklch = (hsv: { hue: number; saturation: number; value: number }): Oklch => {
    // Simplified HSV to Oklch conversion for testing
    // Use approximate mappings
    const L = hsv.value / 100
    const C = (hsv.saturation / 100) * 0.3  // Scale chroma
    const H = hsv.hue
    return $Oklch.create(L, C, H)
  }

  return createPrimitivePalette({
    brand: hsvToOklch(params.brand),
    accent: hsvToOklch(params.accent),
    foundation: hsvToOklch(params.foundation),
  })
}
