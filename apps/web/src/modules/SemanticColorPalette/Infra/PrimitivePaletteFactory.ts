import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'
import type { NeutralKey, FoundationKey, BrandKey, PrimitivePalette } from '../Domain/ValueObject/PrimitivePalette'
import { NEUTRAL_KEYS, FOUNDATION_KEYS } from '../Domain/ValueObject/PrimitivePalette'

// Light theme: N0/F0 = lightest (0.985), N9/F9 = darkest (0.12)
export const NEUTRAL_L_LIGHT: readonly number[] = [
  0.985, 0.955, 0.915, 0.86, 0.78, 0.68, 0.56, 0.42, 0.28, 0.12,
]

// Dark theme: N0/F0 = darkest (0.10), N9/F9 = lightest (0.94)
export const NEUTRAL_L_DARK: readonly number[] = [
  0.10, 0.16, 0.24, 0.34, 0.46, 0.58, 0.70, 0.80, 0.88, 0.94,
]

export const DEFAULT_CHROMA_RATIO = 0.03
export const DEFAULT_MAX_CHROMA = 0.02

// Foundation ramp uses foundation color's chroma directly (already constrained)
export const DEFAULT_FOUNDATION_CHROMA_RATIO = 0.5

// ============================================
// Brand Derivative Parameters (OKLCH-based)
// ============================================

// Bt (Brand Tint) - light surface
export const BRAND_TINT_CONFIG = {
  chromaRatio: 0.18,
  chromaMax: 0.06,
  lightnessOffset: 0.30,
  lightnessMin: 0.78,
  lightnessMax: 0.96,
} as const

// Bs (Brand Shade) - dark surface
export const BRAND_SHADE_CONFIG = {
  chromaRatio: 0.45,
  chromaMax: 0.14,
  lightnessOffset: -0.35,
  lightnessMin: 0.12,
  lightnessMax: 0.32,
} as const

// Bf (Brand Fill) - strong surface (buttons, badges)
export const BRAND_FILL_CONFIG = {
  chromaRatio: 0.85,
  chromaMin: 0.06,
  chromaMax: 0.30,
  lightnessOffset: 0,
  lightnessMin: 0.20,
  lightnessMax: 0.85,
} as const

export type NeutralRampParams = {
  brand: Oklch
  lightnessSteps?: readonly number[]
  chromaRatio?: number
  maxChroma?: number
}

export type FoundationRampParams = {
  foundation: Oklch
  lightnessSteps?: readonly number[]
  chromaRatio?: number
}

export type PrimitivePaletteParams = {
  brand: Oklch
  foundation?: Oklch
  lightnessSteps?: readonly number[]
  chromaRatio?: number
  maxChroma?: number
  foundationChromaRatio?: number
}

export const generateNeutralRamp = (params: NeutralRampParams): Record<NeutralKey, Oklch> => {
  const {
    brand,
    lightnessSteps = NEUTRAL_L_LIGHT,
    chromaRatio = DEFAULT_CHROMA_RATIO,
    maxChroma = DEFAULT_MAX_CHROMA,
  } = params

  const neutralChroma = Math.min(brand.C * chromaRatio, maxChroma)
  const neutralHue = brand.H

  const entries = NEUTRAL_KEYS.map((key, index) => [
    key,
    { L: lightnessSteps[index] ?? 0.5, C: neutralChroma, H: neutralHue },
  ])

  return Object.fromEntries(entries) as Record<NeutralKey, Oklch>
}

export const generateFoundationRamp = (params: FoundationRampParams): Record<FoundationKey, Oklch> => {
  const {
    foundation,
    lightnessSteps = NEUTRAL_L_LIGHT,
    chromaRatio = DEFAULT_FOUNDATION_CHROMA_RATIO,
  } = params

  // Foundation color already has constrained chroma (max 0.03)
  // Apply ratio to make ramp slightly more subtle than the foundation itself
  const foundationChroma = foundation.C * chromaRatio
  const foundationHue = foundation.H

  const entries = FOUNDATION_KEYS.map((key, index) => [
    key,
    { L: lightnessSteps[index] ?? 0.5, C: foundationChroma, H: foundationHue },
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
export const generateBrandDerivatives = (brand: Oklch): Record<Exclude<BrandKey, 'B'>, Oklch> => {
  const { L: Lb, C: Cb, H: Hb } = brand

  // Bt (Brand Tint) - light surface
  const btRaw: Oklch = {
    L: clamp(Lb + BRAND_TINT_CONFIG.lightnessOffset, BRAND_TINT_CONFIG.lightnessMin, BRAND_TINT_CONFIG.lightnessMax),
    C: Math.min(Cb * BRAND_TINT_CONFIG.chromaRatio, BRAND_TINT_CONFIG.chromaMax),
    H: Hb,
  }

  // Bs (Brand Shade) - dark surface
  const bsRaw: Oklch = {
    L: clamp(Lb + BRAND_SHADE_CONFIG.lightnessOffset, BRAND_SHADE_CONFIG.lightnessMin, BRAND_SHADE_CONFIG.lightnessMax),
    C: Math.min(Cb * BRAND_SHADE_CONFIG.chromaRatio, BRAND_SHADE_CONFIG.chromaMax),
    H: Hb,
  }

  // Bf (Brand Fill) - strong surface
  const bfRaw: Oklch = {
    L: clamp(Lb + BRAND_FILL_CONFIG.lightnessOffset, BRAND_FILL_CONFIG.lightnessMin, BRAND_FILL_CONFIG.lightnessMax),
    C: clamp(Cb * BRAND_FILL_CONFIG.chromaRatio, BRAND_FILL_CONFIG.chromaMin, BRAND_FILL_CONFIG.chromaMax),
    H: Hb,
  }

  // Clamp to P3 gamut (reduce chroma if out of gamut)
  return {
    Bt: $Oklch.clampToP3Gamut(btRaw),
    Bs: $Oklch.clampToP3Gamut(bsRaw),
    Bf: $Oklch.clampToP3Gamut(bfRaw),
  }
}

export const createPrimitivePalette = (params: PrimitivePaletteParams): PrimitivePalette => {
  const {
    brand,
    foundation,
    lightnessSteps,
    chromaRatio,
    maxChroma,
    foundationChromaRatio,
  } = params

  const neutralRamp = generateNeutralRamp({
    brand,
    lightnessSteps,
    chromaRatio,
    maxChroma,
  })

  // If foundation is provided, generate foundation ramp from it
  // Otherwise, derive from brand (fallback for backwards compatibility)
  const foundationRamp = generateFoundationRamp({
    foundation: foundation ?? { L: 0.97, C: 0, H: brand.H },
    lightnessSteps,
    chromaRatio: foundationChromaRatio,
  })

  // Generate brand derivative colors (Bt, Bs, Bf)
  const brandDerivatives = generateBrandDerivatives(brand)

  return { ...neutralRamp, ...foundationRamp, B: brand, ...brandDerivatives }
}
