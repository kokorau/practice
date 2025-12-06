import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'

/**
 * SemanticPalette assigns meaning to colors for UI usage.
 */
export type SemanticPalette = {
  readonly surface: {
    /** Page background */
    readonly base: Oklch
    /** Card, modal background */
    readonly elevated: Oklch
    /** Border color */
    readonly border: Oklch
  }
  readonly text: {
    readonly primary: Oklch
    readonly secondary: Oklch
    readonly muted: Oklch
    /** Text color on brand-primary background */
    readonly onBrandPrimary: Oklch
  }
  readonly brand: {
    /** Primary brand UI elements (buttons, etc.) */
    readonly primary: Oklch
    readonly hover: Oklch
    readonly active: Oklch
  }
  readonly accent: {
    readonly base: Oklch
    readonly hover: Oklch
  }
}

/**
 * SemanticColorToken is a string representation of SemanticPalette keys.
 * Used in data-* attributes to reference semantic colors.
 */
export type SemanticColorToken =
  | `surface.${keyof SemanticPalette['surface']}`
  | `text.${keyof SemanticPalette['text']}`
  | `brand.${keyof SemanticPalette['brand']}`
  | `accent.${keyof SemanticPalette['accent']}`

export const $SemanticPalette = {
  fromCorePalette: undefined as unknown as (core: import('./CorePalette').CorePalette) => SemanticPalette,
  getColor: undefined as unknown as (palette: SemanticPalette, token: SemanticColorToken) => Oklch,
}
