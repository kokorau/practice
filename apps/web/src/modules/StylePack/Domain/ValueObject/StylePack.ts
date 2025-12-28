/**
 * StylePack - Controls visual styling parameters for section templates
 *
 * These values are applied across all sections to maintain visual consistency.
 * Color and shadow are handled separately (ColorPalette and Lighting modules).
 */

export type RoundedSize = 'none' | 'sm' | 'md' | 'lg' | 'full'

export type SpacingSize = 'tight' | 'normal' | 'relaxed'

export type FontConfig = {
  /** Font family for headings (h1, h2, etc.) */
  heading: string
  /** Font family for body text */
  body: string
}

export type StylePack = {
  /** Border radius for cards, buttons, inputs, etc. */
  rounded: RoundedSize
  /** Font families */
  font: FontConfig
  /** Line height for text */
  leading: SpacingSize
  /** Gap between elements (grid gap, flex gap) */
  gap: SpacingSize
  /** Padding for sections and containers */
  padding: SpacingSize
}

/** Default StylePack values */
export const defaultStylePack: StylePack = {
  rounded: 'md',
  font: {
    heading: 'inherit',
    body: 'inherit',
  },
  leading: 'normal',
  gap: 'normal',
  padding: 'normal',
}

/** Maps RoundedSize to CSS border-radius values */
export const roundedToCss: Record<RoundedSize, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem',
  full: '9999px',
}

/** Maps SpacingSize to line-height values */
export const leadingToCss: Record<SpacingSize, string> = {
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.75',
}

/** Maps SpacingSize to gap multipliers (base unit: 1rem) */
export const gapToMultiplier: Record<SpacingSize, number> = {
  tight: 0.75,
  normal: 1,
  relaxed: 1.5,
}

/** Maps SpacingSize to padding multipliers (base unit: 1rem) */
export const paddingToMultiplier: Record<SpacingSize, number> = {
  tight: 0.75,
  normal: 1,
  relaxed: 1.25,
}
