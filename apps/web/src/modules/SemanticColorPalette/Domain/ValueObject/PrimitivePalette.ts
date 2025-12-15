import type { Oklch } from '@practice/color'

export const NEUTRAL_KEYS = ['N0', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9'] as const
export type NeutralKey = (typeof NEUTRAL_KEYS)[number]

export const BRAND_KEYS = ['B'] as const
export type BrandKey = (typeof BRAND_KEYS)[number]

export const PRIMITIVE_KEYS = [...NEUTRAL_KEYS, ...BRAND_KEYS] as const
export type PrimitiveKey = (typeof PRIMITIVE_KEYS)[number]

export type PrimitivePalette = Record<PrimitiveKey, Oklch>
