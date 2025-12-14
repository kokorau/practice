import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'
import type { BrandPrimitive } from './BrandPrimitive'

/**
 * CorePalette is the essential palette with brand, accent, and neutral colors.
 */
export type CorePalette = {
  readonly brand: {
    /** Primary brand color for main UI elements */
    readonly primary: Oklch
    /** User-selected accent color */
    readonly accent: Oklch
  }
  readonly neutral: {
    /** Base neutral for surfaces */
    readonly base: Oklch
    /** Strong neutral for text-primary */
    readonly strong: Oklch
    /** Weak neutral for text-secondary */
    readonly weak: Oklch
  }
}

export const $CorePalette = {
  /**
   * Create CorePalette from brand primitives
   */
  fromBrandPrimitives: (
    brandPrimitive: BrandPrimitive,
    accentPrimitive: BrandPrimitive
  ): CorePalette => {
    // Use original colors (no normalization) to preserve user's chosen colors
    const brandPrimary = brandPrimitive.original
    const accent = accentPrimitive.original

    // Extract hue from brand for subtle neutral tinting
    const brandHue = brandPrimary.H

    return {
      brand: {
        primary: brandPrimary,
        accent: accent,
      },
      neutral: {
        // Slightly tinted neutrals based on brand hue
        base: $Oklch.create(0.25, 0.01, brandHue),     // Dark surface
        strong: $Oklch.create(0.95, 0.005, brandHue),  // Light text (on dark)
        weak: $Oklch.create(0.70, 0.01, brandHue),     // Secondary text
      },
    }
  },

  /**
   * Create CorePalette with custom neutrals
   */
  create: (
    brandPrimary: Oklch,
    accent: Oklch,
    neutralBase: Oklch
  ): CorePalette => {
    const brandHue = brandPrimary.H
    return {
      brand: {
        primary: brandPrimary,
        accent: accent,
      },
      neutral: {
        base: neutralBase,
        strong: $Oklch.create(0.95, 0.005, brandHue),
        weak: $Oklch.create(0.70, 0.01, brandHue),
      },
    }
  },
}
