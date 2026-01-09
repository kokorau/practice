import type { Oklch } from '@practice/color'

// Theme type: determined by foundation lightness
export type PaletteTheme = 'light' | 'dark'

// Brand Neutral ramp (brand ink-derived): BN0 = lightest, BN9 = darkest
export const NEUTRAL_KEYS = ['BN0', 'BN1', 'BN2', 'BN3', 'BN4', 'BN5', 'BN6', 'BN7', 'BN8', 'BN9'] as const
export type NeutralKey = (typeof NEUTRAL_KEYS)[number]

// Foundation ramp (foundation-derived): F0 = lightest, F9 = darkest
export const FOUNDATION_KEYS = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'] as const
export type FoundationKey = (typeof FOUNDATION_KEYS)[number]

// Accent Neutral ramp (accent-derived): AN0 = lightest, AN9 = darkest
export const ACCENT_RAMP_KEYS = ['AN0', 'AN1', 'AN2', 'AN3', 'AN4', 'AN5', 'AN6', 'AN7', 'AN8', 'AN9'] as const
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

// Foundation-derived keys:
// F: Foundation (input color)
// Ft: Foundation Tint (light surface)
// Fs: Foundation Shade (dark surface)
// Ff: Foundation Fill (strong surface)
export const FOUNDATION_DERIVED_KEYS = ['F', 'Ft', 'Fs', 'Ff'] as const
export type FoundationDerivedKey = (typeof FOUNDATION_DERIVED_KEYS)[number]

export const PRIMITIVE_KEYS = [...NEUTRAL_KEYS, ...FOUNDATION_KEYS, ...ACCENT_RAMP_KEYS, ...BRAND_KEYS, ...ACCENT_KEYS, ...FOUNDATION_DERIVED_KEYS] as const
export type PrimitiveKey = (typeof PRIMITIVE_KEYS)[number]

export type PrimitivePalette = Record<PrimitiveKey, Oklch> & {
  /** Theme determined by foundation lightness (L > 0.5 = light, otherwise dark) */
  theme: PaletteTheme
}
