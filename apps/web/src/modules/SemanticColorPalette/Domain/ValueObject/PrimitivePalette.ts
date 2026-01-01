import type { Oklch } from '@practice/color'

// Theme type: determined by foundation lightness
export type PaletteTheme = 'light' | 'dark'

// Neutral ramp (ink-derived): N0 = lightest, N9 = darkest
export const NEUTRAL_KEYS = ['N0', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9'] as const
export type NeutralKey = (typeof NEUTRAL_KEYS)[number]

// Foundation ramp (foundation-derived): F0 = lightest, F9 = darkest
export const FOUNDATION_KEYS = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'] as const
export type FoundationKey = (typeof FOUNDATION_KEYS)[number]

// Accent ramp (accent-derived): A0 = lightest, A9 = darkest
export const ACCENT_RAMP_KEYS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'] as const
export type AccentRampKey = (typeof ACCENT_RAMP_KEYS)[number]

// Brand-derived keys:
// B: Brand (input color)
// Bt: Brand Tint (light surface)
// Bs: Brand Shade (dark surface)
// Bf: Brand Fill (strong surface for buttons/badges)
export const BRAND_KEYS = ['B', 'Bt', 'Bs', 'Bf'] as const
export type BrandKey = (typeof BRAND_KEYS)[number]

// Accent-derived keys:
// A: Accent (input color)
// At: Accent Tint (light surface)
// As: Accent Shade (dark surface)
// Af: Accent Fill (strong surface for buttons/badges)
export const ACCENT_KEYS = ['A', 'At', 'As', 'Af'] as const
export type AccentKey = (typeof ACCENT_KEYS)[number]

export const PRIMITIVE_KEYS = [...NEUTRAL_KEYS, ...FOUNDATION_KEYS, ...ACCENT_RAMP_KEYS, ...BRAND_KEYS, ...ACCENT_KEYS] as const
export type PrimitiveKey = (typeof PRIMITIVE_KEYS)[number]

export type PrimitivePalette = Record<PrimitiveKey, Oklch> & {
  /** Theme determined by foundation lightness (L > 0.5 = light, otherwise dark) */
  theme: PaletteTheme
}
