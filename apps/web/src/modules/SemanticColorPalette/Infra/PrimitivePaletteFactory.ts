import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'
import type { NeutralKey, FoundationKey, BrandKey, PrimitivePalette, PaletteTheme } from '../Domain/ValueObject/PrimitivePalette'
import { NEUTRAL_KEYS, FOUNDATION_KEYS } from '../Domain/ValueObject/PrimitivePalette'

// ============================================
// Primitive Palette Configuration
// ============================================
// All tuning parameters are centralized here for easy adjustment

export const PRIMITIVE_PALETTE_CONFIG = {
  // Theme detection threshold (L > threshold = light theme)
  themeLightnessThreshold: 0.5,

  // Lightness ramps for neutral/foundation scales
  lightnessRamp: {
    // Light theme: N0/F0 = lightest (0.985), N9/F9 = darkest (0.12)
    light: [0.985, 0.955, 0.915, 0.86, 0.78, 0.68, 0.56, 0.42, 0.28, 0.12] as readonly number[],
    // Dark theme: N0/F0 = darkest (0.10), N9/F9 = lightest (0.94)
    dark: [0.10, 0.16, 0.24, 0.34, 0.46, 0.58, 0.70, 0.80, 0.88, 0.94] as readonly number[],
  },

  // Neutral ramp (N0-N9): subtle brand-tinted grays
  neutral: {
    chromaRatio: 0.03,  // Chroma = brand.C * ratio
    chromaMax: 0.02,    // Clamp chroma to this max
  },

  // Foundation ramp (F0-F9): accent-tinted grays
  foundation: {
    chromaRatio: 0.5,   // Foundation color already constrained, apply ratio for subtlety
  },

  // Brand derivatives
  brand: {
    // Bt (Brand Tint) - light surface for hover/selected states
    tint: {
      chromaRatio: 0.18,
      chromaMax: 0.06,
      lightnessOffset: 0.30,
      lightnessMin: 0.78,
      lightnessMax: 0.96,
    },
    // Bs (Brand Shade) - dark surface for pressed states
    shade: {
      chromaRatio: 0.45,
      chromaMax: 0.14,
      lightnessOffset: -0.35,
      lightnessMin: 0.12,
      lightnessMax: 0.32,
    },
    // Bf (Brand Fill) - strong surface for buttons, badges
    fill: {
      chromaRatio: 0.85,
      chromaMin: 0.06,
      chromaMax: 0.30,
      lightnessOffset: 0,
      lightnessMin: 0.20,
      lightnessMax: 0.85,
    },
  },
} as const

export type PrimitivePaletteConfig = typeof PRIMITIVE_PALETTE_CONFIG

// Shorthand aliases for config access
const cfg = PRIMITIVE_PALETTE_CONFIG

export type PrimitivePaletteParams = {
  brand: Oklch
  foundation: Oklch
}

const generateNeutralRamp = (brand: Oklch, lightnessSteps: readonly number[]): Record<NeutralKey, Oklch> => {
  const chroma = Math.min(brand.C * cfg.neutral.chromaRatio, cfg.neutral.chromaMax)
  const hue = brand.H

  const entries = NEUTRAL_KEYS.map((key, index) => [
    key,
    { L: lightnessSteps[index], C: chroma, H: hue },
  ])

  return Object.fromEntries(entries) as Record<NeutralKey, Oklch>
}

const generateFoundationRamp = (foundation: Oklch, lightnessSteps: readonly number[]): Record<FoundationKey, Oklch> => {
  const chroma = foundation.C * cfg.foundation.chromaRatio
  const hue = foundation.H

  const entries = FOUNDATION_KEYS.map((key, index) => [
    key,
    { L: lightnessSteps[index], C: chroma, H: hue },
  ])

  return Object.fromEntries(entries) as Record<FoundationKey, Oklch>
}

// Helper: clamp value between min and max
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/**
 * Generate brand derivative colors (Bt, Bs, Bf) from brand color
 * All derivatives preserve hue, adjust L and C, then clamp to P3 gamut
 */
const generateBrandDerivatives = (brand: Oklch): Record<Exclude<BrandKey, 'B'>, Oklch> => {
  const { L, C, H } = brand
  const { tint, shade, fill } = cfg.brand

  // Bt (Brand Tint) - light surface
  const btRaw: Oklch = {
    L: clamp(L + tint.lightnessOffset, tint.lightnessMin, tint.lightnessMax),
    C: Math.min(C * tint.chromaRatio, tint.chromaMax),
    H,
  }

  // Bs (Brand Shade) - dark surface
  const bsRaw: Oklch = {
    L: clamp(L + shade.lightnessOffset, shade.lightnessMin, shade.lightnessMax),
    C: Math.min(C * shade.chromaRatio, shade.chromaMax),
    H,
  }

  // Bf (Brand Fill) - strong surface
  const bfRaw: Oklch = {
    L: clamp(L + fill.lightnessOffset, fill.lightnessMin, fill.lightnessMax),
    C: clamp(C * fill.chromaRatio, fill.chromaMin, fill.chromaMax),
    H,
  }

  // Clamp to P3 gamut (reduce chroma if out of gamut)
  return {
    Bt: $Oklch.clampToP3Gamut(btRaw),
    Bs: $Oklch.clampToP3Gamut(bsRaw),
    Bf: $Oklch.clampToP3Gamut(bfRaw),
  }
}

export const createPrimitivePalette = (params: PrimitivePaletteParams): PrimitivePalette => {
  const { brand, foundation } = params

  // Determine theme based on foundation lightness
  const theme: PaletteTheme = foundation.L > cfg.themeLightnessThreshold ? 'light' : 'dark'
  const lightnessSteps = theme === 'light' ? cfg.lightnessRamp.light : cfg.lightnessRamp.dark

  const neutralRamp = generateNeutralRamp(brand, lightnessSteps)
  const foundationRamp = generateFoundationRamp(foundation, lightnessSteps)
  const brandDerivatives = generateBrandDerivatives(brand)

  return { ...neutralRamp, ...foundationRamp, B: brand, ...brandDerivatives, theme }
}
