import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import type { CorePalette } from './CorePalette'

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
  /**
   * Create SemanticPalette from CorePalette
   */
  fromCorePalette: (core: CorePalette): SemanticPalette => {
    const { brand, neutral } = core
    const brandHue = brand.primary.H

    return {
      surface: {
        base: neutral.base,
        elevated: $Oklch.create(neutral.base.L + 0.05, 0.015, brandHue),
        border: $Oklch.create(0.40, 0.02, brandHue),
      },
      text: {
        primary: neutral.strong,
        secondary: neutral.weak,
        muted: $Oklch.create(0.55, 0.01, brandHue),
        onBrandPrimary: $Oklch.create(0.98, 0.005, brandHue),
      },
      brand: {
        primary: brand.primary,
        hover: $Oklch.create(
          brand.primary.L + 0.08,
          brand.primary.C * 1.1,
          brand.primary.H
        ),
        active: $Oklch.create(
          brand.primary.L - 0.05,
          brand.primary.C * 0.95,
          brand.primary.H
        ),
      },
      accent: {
        base: brand.accent,
        hover: $Oklch.create(
          brand.accent.L + 0.08,
          brand.accent.C * 1.1,
          brand.accent.H
        ),
      },
    }
  },

  /**
   * Get color from SemanticPalette by token
   */
  getColor: (palette: SemanticPalette, token: SemanticColorToken): Oklch => {
    const [category, key] = token.split('.') as [
      keyof SemanticPalette,
      string
    ]
    const group = palette[category] as Record<string, Oklch>
    const color = group[key]
    if (!color) {
      // Fallback to neutral gray
      return $Oklch.create(0.5, 0, 0)
    }
    return color
  },
}
