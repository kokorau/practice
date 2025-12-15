import type { Oklch } from '@practice/color'
import type { NeutralKey, PrimitivePalette } from '../Domain/ValueObject/PrimitivePalette'
import { NEUTRAL_KEYS } from '../Domain/ValueObject/PrimitivePalette'

// Light theme: N0 = lightest (0.985), N9 = darkest (0.12)
export const NEUTRAL_L_LIGHT: readonly number[] = [
  0.985, 0.955, 0.915, 0.86, 0.78, 0.68, 0.56, 0.42, 0.28, 0.12,
]

// Dark theme: N0 = darkest (0.10), N9 = lightest (0.94)
export const NEUTRAL_L_DARK: readonly number[] = [
  0.10, 0.16, 0.24, 0.34, 0.46, 0.58, 0.70, 0.80, 0.88, 0.94,
]

export const DEFAULT_CHROMA_RATIO = 0.03
export const DEFAULT_MAX_CHROMA = 0.02

export type NeutralRampParams = {
  brand: Oklch
  lightnessSteps?: readonly number[]
  chromaRatio?: number
  maxChroma?: number
}

export type PrimitivePaletteParams = {
  brand: Oklch
  lightnessSteps?: readonly number[]
  chromaRatio?: number
  maxChroma?: number
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

export const createPrimitivePalette = (params: PrimitivePaletteParams): PrimitivePalette => {
  const neutralRamp = generateNeutralRamp(params)
  return { ...neutralRamp, B: params.brand }
}
