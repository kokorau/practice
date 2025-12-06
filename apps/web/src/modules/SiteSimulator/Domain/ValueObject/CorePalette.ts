import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'

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
  create: undefined as unknown as (
    brandPrimary: Oklch,
    accent: Oklch,
    neutralBase: Oklch
  ) => CorePalette,
}
