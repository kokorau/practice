import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'
import type { NeutralKey, FoundationKey, AccentRampKey, BrandKey, AccentKey, FoundationDerivedKey, PrimitivePalette, PaletteTheme } from '../Domain/ValueObject/PrimitivePalette'
import { NEUTRAL_KEYS, FOUNDATION_KEYS, ACCENT_RAMP_KEYS } from '../Domain/ValueObject/PrimitivePalette'

// ============================================
// Primitive Palette Configuration
// ============================================
// All tuning parameters are centralized here for easy adjustment

export const PRIMITIVE_PALETTE_CONFIG = {
  // Theme detection threshold (L > threshold = light theme)
  themeLightnessThreshold: 0.5,

  // Lightness ramps for neutral/foundation scales (10 steps: BN0-BN9 / F0-F9)
  // Consistent semantic: 0 = lightest (white), 9 = darkest (black)
  // Both themes use the same ordering for predictable primitive key references
  lightnessRamp: {
    // Light theme: BN0/F0 = lightest (0.985), BN9/F9 = darkest (0.12)
    light: [0.985, 0.955, 0.915, 0.86, 0.78, 0.68, 0.56, 0.42, 0.28, 0.12] as const,
    // Dark theme: BN0/F0 = lightest (0.94), BN9/F9 = darkest (0.10)
    dark: [0.94, 0.88, 0.80, 0.70, 0.58, 0.46, 0.34, 0.24, 0.16, 0.10] as const,
  },

  // Neutral ramp (BN0-BN9): subtle brand-tinted grays
  neutral: {
    chromaRatio: 0.25,  // Chroma = brand.C * ratio
    chromaMax: 0.15,    // Clamp chroma to this max
  },

  // Foundation ramp (F0-F9): accent-tinted grays
  foundation: {
    chromaRatio: 0.5,   // Foundation color already constrained, apply ratio for subtlety
  },

  // Accent ramp (AN0-AN9): accent-tinted grays (similar to neutral but from accent)
  accentRamp: {
    chromaRatio: 0.25,  // Slightly more chroma than neutral for accent character
    chromaMax: 0.15,    // Clamp chroma to this max
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

  // Accent derivatives (same structure as brand)
  accent: {
    // At (Accent Tint) - light surface for hover/selected states
    tint: {
      chromaRatio: 0.18,
      chromaMax: 0.06,
      lightnessOffset: 0.30,
      lightnessMin: 0.78,
      lightnessMax: 0.96,
    },
    // As (Accent Shade) - dark surface for pressed states
    shade: {
      chromaRatio: 0.45,
      chromaMax: 0.14,
      lightnessOffset: -0.35,
      lightnessMin: 0.12,
      lightnessMax: 0.32,
    },
    // Af (Accent Fill) - strong surface for buttons, badges
    fill: {
      chromaRatio: 0.85,
      chromaMin: 0.06,
      chromaMax: 0.30,
      lightnessOffset: 0,
      lightnessMin: 0.20,
      lightnessMax: 0.85,
    },
  },

  // Foundation derivatives (same structure as brand/accent)
  foundationDerived: {
    // Ft (Foundation Tint) - light surface for hover/selected states
    tint: {
      chromaRatio: 0.18,
      chromaMax: 0.06,
      lightnessOffset: 0.30,
      lightnessMin: 0.78,
      lightnessMax: 0.96,
    },
    // Fs (Foundation Shade) - dark surface for pressed states
    shade: {
      chromaRatio: 0.45,
      chromaMax: 0.14,
      lightnessOffset: -0.35,
      lightnessMin: 0.12,
      lightnessMax: 0.32,
    },
    // Ff (Foundation Fill) - strong surface
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

// 10-element tuple type matching NEUTRAL_KEYS/FOUNDATION_KEYS length
type LightnessRamp = readonly [number, number, number, number, number, number, number, number, number, number]

type NeutralConfig = typeof PRIMITIVE_PALETTE_CONFIG.neutral
type FoundationConfig = typeof PRIMITIVE_PALETTE_CONFIG.foundation
type AccentRampConfig = typeof PRIMITIVE_PALETTE_CONFIG.accentRamp
type BrandConfig = typeof PRIMITIVE_PALETTE_CONFIG.brand
type AccentConfig = typeof PRIMITIVE_PALETTE_CONFIG.accent
type FoundationDerivedConfig = typeof PRIMITIVE_PALETTE_CONFIG.foundationDerived

export type PrimitivePaletteParams = {
  brand: Oklch
  foundation: Oklch
  accent?: Oklch
}

// Helper: clamp value between min and max
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const generateNeutralRamp = (
  brand: Oklch,
  lightnessSteps: LightnessRamp,
  config: NeutralConfig,
): Record<NeutralKey, Oklch> => {
  const chroma = Math.min(brand.C * config.chromaRatio, config.chromaMax)
  const hue = brand.H

  const entries = lightnessSteps.map((L, index) => [
    NEUTRAL_KEYS[index],
    $Oklch.create(L, chroma, hue),
  ])

  return Object.fromEntries(entries) as Record<NeutralKey, Oklch>
}

const generateFoundationRamp = (
  foundation: Oklch,
  lightnessSteps: LightnessRamp,
  config: FoundationConfig,
): Record<FoundationKey, Oklch> => {
  const chroma = foundation.C * config.chromaRatio
  const hue = foundation.H

  const entries = lightnessSteps.map((L, index) => [
    FOUNDATION_KEYS[index],
    $Oklch.create(L, chroma, hue),
  ])

  return Object.fromEntries(entries) as Record<FoundationKey, Oklch>
}

const generateAccentRamp = (
  accent: Oklch,
  lightnessSteps: LightnessRamp,
  config: AccentRampConfig,
): Record<AccentRampKey, Oklch> => {
  const chroma = Math.min(accent.C * config.chromaRatio, config.chromaMax)
  const hue = accent.H

  const entries = lightnessSteps.map((L, index) => [
    ACCENT_RAMP_KEYS[index],
    $Oklch.create(L, chroma, hue),
  ])

  return Object.fromEntries(entries) as Record<AccentRampKey, Oklch>
}

/**
 * Generate brand derivative colors (Bt, Bs, Bf) from brand color
 * All derivatives preserve hue, adjust L and C, then clamp to P3 gamut
 */
const generateBrandDerivatives = (brand: Oklch, config: BrandConfig): Record<Exclude<BrandKey, 'B'>, Oklch> => {
  const { L, C, H } = brand
  const { tint, shade, fill } = config

  // Bt (Brand Tint) - light surface
  const btRaw = $Oklch.create(
    clamp(L + tint.lightnessOffset, tint.lightnessMin, tint.lightnessMax),
    Math.min(C * tint.chromaRatio, tint.chromaMax),
    H,
  )

  // Bs (Brand Shade) - dark surface
  const bsRaw = $Oklch.create(
    clamp(L + shade.lightnessOffset, shade.lightnessMin, shade.lightnessMax),
    Math.min(C * shade.chromaRatio, shade.chromaMax),
    H,
  )

  // Bf (Brand Fill) - strong surface
  const bfRaw = $Oklch.create(
    clamp(L + fill.lightnessOffset, fill.lightnessMin, fill.lightnessMax),
    clamp(C * fill.chromaRatio, fill.chromaMin, fill.chromaMax),
    H,
  )

  // Clamp to P3 gamut (reduce chroma if out of gamut)
  return {
    Bt: $Oklch.clampToP3Gamut(btRaw),
    Bs: $Oklch.clampToP3Gamut(bsRaw),
    Bf: $Oklch.clampToP3Gamut(bfRaw),
  }
}

/**
 * Generate accent derivative colors (At, As, Af) from accent color
 * All derivatives preserve hue, adjust L and C, then clamp to P3 gamut
 */
const generateAccentDerivatives = (accent: Oklch, config: AccentConfig): Record<Exclude<AccentKey, 'A'>, Oklch> => {
  const { L, C, H } = accent
  const { tint, shade, fill } = config

  // At (Accent Tint) - light surface
  const atRaw = $Oklch.create(
    clamp(L + tint.lightnessOffset, tint.lightnessMin, tint.lightnessMax),
    Math.min(C * tint.chromaRatio, tint.chromaMax),
    H,
  )

  // As (Accent Shade) - dark surface
  const asRaw = $Oklch.create(
    clamp(L + shade.lightnessOffset, shade.lightnessMin, shade.lightnessMax),
    Math.min(C * shade.chromaRatio, shade.chromaMax),
    H,
  )

  // Af (Accent Fill) - strong surface
  const afRaw = $Oklch.create(
    clamp(L + fill.lightnessOffset, fill.lightnessMin, fill.lightnessMax),
    clamp(C * fill.chromaRatio, fill.chromaMin, fill.chromaMax),
    H,
  )

  // Clamp to P3 gamut (reduce chroma if out of gamut)
  return {
    At: $Oklch.clampToP3Gamut(atRaw),
    As: $Oklch.clampToP3Gamut(asRaw),
    Af: $Oklch.clampToP3Gamut(afRaw),
  }
}

/**
 * Generate foundation derivative colors (Ft, Fs, Ff) from foundation color
 * All derivatives preserve hue, adjust L and C, then clamp to P3 gamut
 */
const generateFoundationDerivatives = (foundation: Oklch, config: FoundationDerivedConfig): Record<Exclude<FoundationDerivedKey, 'F'>, Oklch> => {
  const { L, C, H } = foundation
  const { tint, shade, fill } = config

  // Ft (Foundation Tint) - light surface
  const ftRaw = $Oklch.create(
    clamp(L + tint.lightnessOffset, tint.lightnessMin, tint.lightnessMax),
    Math.min(C * tint.chromaRatio, tint.chromaMax),
    H,
  )

  // Fs (Foundation Shade) - dark surface
  const fsRaw = $Oklch.create(
    clamp(L + shade.lightnessOffset, shade.lightnessMin, shade.lightnessMax),
    Math.min(C * shade.chromaRatio, shade.chromaMax),
    H,
  )

  // Ff (Foundation Fill) - strong surface
  const ffRaw = $Oklch.create(
    clamp(L + fill.lightnessOffset, fill.lightnessMin, fill.lightnessMax),
    clamp(C * fill.chromaRatio, fill.chromaMin, fill.chromaMax),
    H,
  )

  // Clamp to P3 gamut (reduce chroma if out of gamut)
  return {
    Ft: $Oklch.clampToP3Gamut(ftRaw),
    Fs: $Oklch.clampToP3Gamut(fsRaw),
    Ff: $Oklch.clampToP3Gamut(ffRaw),
  }
}

export const createPrimitivePalette = (
  params: PrimitivePaletteParams,
  config: PrimitivePaletteConfig = PRIMITIVE_PALETTE_CONFIG,
): PrimitivePalette => {
  const { brand, foundation, accent } = params

  // Determine theme based on foundation lightness
  const theme: PaletteTheme = foundation.L > config.themeLightnessThreshold ? 'light' : 'dark'
  const lightnessSteps = theme === 'light' ? config.lightnessRamp.light : config.lightnessRamp.dark

  const neutralRamp = generateNeutralRamp(brand, lightnessSteps, config.neutral)
  const foundationRamp = generateFoundationRamp(foundation, lightnessSteps, config.foundation)
  const brandDerivatives = generateBrandDerivatives(brand, config.brand)
  const foundationDerivatives = generateFoundationDerivatives(foundation, config.foundationDerived)

  // Use accent if provided, otherwise fall back to brand
  const accentColor = accent ?? brand
  const accentRamp = generateAccentRamp(accentColor, lightnessSteps, config.accentRamp)
  const accentDerivatives = generateAccentDerivatives(accentColor, config.accent)

  return { ...neutralRamp, ...foundationRamp, ...accentRamp, B: brand, ...brandDerivatives, A: accentColor, ...accentDerivatives, F: foundation, ...foundationDerivatives, theme }
}
