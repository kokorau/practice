import type { Oklch } from '@practice/color'
import type { NeutralKey, FoundationKey, PrimitivePalette } from '../Domain/ValueObject/PrimitivePalette'
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

  return { ...neutralRamp, ...foundationRamp, B: brand }
}
