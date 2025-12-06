import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'

/**
 * BrandPrimitive represents the brand color and its variants.
 */
export type BrandPrimitive = {
  /** Original input brand color */
  readonly original: Oklch
  /** Normalized to albedo safe range */
  readonly normalized: Oklch
  /** Light/base/dark variants */
  readonly variants: {
    readonly light: Oklch
    readonly base: Oklch
    readonly dark: Oklch
  }
}

export const $BrandPrimitive = {
  fromOklch: undefined as unknown as (oklch: Oklch) => BrandPrimitive,
  fromHex: undefined as unknown as (hex: string) => BrandPrimitive,
}
