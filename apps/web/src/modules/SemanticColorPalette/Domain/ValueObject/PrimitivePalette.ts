import type { Oklch } from '@practice/color'

// Theme type: determined by foundation lightness
export type PaletteTheme = 'light' | 'dark'

// Neutral ramp (ink-derived): N0 = lightest, N9 = darkest
export const NEUTRAL_KEYS = ['N0', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9'] as const
export type NeutralKey = (typeof NEUTRAL_KEYS)[number]

// Foundation ramp (foundation-derived): F0 = lightest, F9 = darkest
export const FOUNDATION_KEYS = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'] as const
export type FoundationKey = (typeof FOUNDATION_KEYS)[number]

// Brand-derived keys:
// B: Brand (input color)
// Bt: Brand Tint (light surface)
// Bs: Brand Shade (dark surface)
// Bf: Brand Fill (strong surface for buttons/badges)
export const BRAND_KEYS = ['B', 'Bt', 'Bs', 'Bf'] as const
export type BrandKey = (typeof BRAND_KEYS)[number]

export const PRIMITIVE_KEYS = [...NEUTRAL_KEYS, ...FOUNDATION_KEYS, ...BRAND_KEYS] as const
export type PrimitiveKey = (typeof PRIMITIVE_KEYS)[number]

export type PrimitivePalette = Record<PrimitiveKey, Oklch> & {
  /** Theme determined by foundation lightness (L > 0.5 = light, otherwise dark) */
  theme: PaletteTheme
}
