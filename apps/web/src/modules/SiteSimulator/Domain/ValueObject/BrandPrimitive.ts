import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'
import { $Srgb } from '@practice/color'

// Albedo-safe constraints
const ALBEDO_L_MIN = 0.25
const ALBEDO_L_MAX = 0.90
const ALBEDO_C_MAX = 0.25

/**
 * BrandPrimitive represents the brand color and its variants.
 */
export type BrandPrimitive = {
  /** Original input brand color */
  readonly original: Oklch
  /** Normalized to albedo safe range */
  readonly normalized: Oklch
  /** Light/base/dark variants */
  readonly variants: {
    readonly light: Oklch
    readonly base: Oklch
    readonly dark: Oklch
  }
}

/**
 * Normalize an OKLCH color to albedo-safe range
 */
const normalizeToAlbedo = (oklch: Oklch): Oklch => {
  const L = Math.max(ALBEDO_L_MIN, Math.min(ALBEDO_L_MAX, oklch.L))
  const C = Math.min(ALBEDO_C_MAX, oklch.C)
  return $Oklch.create(L, C, oklch.H)
}

/**
 * Generate light/base/dark variants from normalized color
 */
const generateVariants = (normalized: Oklch): BrandPrimitive['variants'] => {
  const { C, H } = normalized

  return {
    light: $Oklch.create(0.80, C * 0.7, H),  // Lighter, less saturated
    base: normalized,                         // Base is the normalized color
    dark: $Oklch.create(0.40, C * 0.9, H),   // Darker, slightly less saturated
  }
}

export const $BrandPrimitive = {
  fromOklch: (oklch: Oklch): BrandPrimitive => {
    const normalized = normalizeToAlbedo(oklch)
    return {
      original: oklch,
      normalized,
      variants: generateVariants(normalized),
    }
  },

  fromHex: (hex: string): BrandPrimitive => {
    const srgb = $Srgb.fromHex(hex)
    if (!srgb) {
      // Fallback to neutral blue if hex is invalid
      return $BrandPrimitive.fromOklch($Oklch.create(0.55, 0.15, 250))
    }
    const oklch = $Oklch.fromSrgb(srgb)
    return $BrandPrimitive.fromOklch(oklch)
  },
}
