import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'

/**
 * PrimitiveColor is a named color in OKLCH space.
 */
export type PrimitiveColor = {
  readonly name: string
  readonly oklch: Oklch
}

/**
 * PrimitivePalette is the base 40 colors.
 */
export type PrimitivePalette = {
  readonly baseColors: ReadonlyArray<PrimitiveColor>
}

export const $PrimitivePalette = {
  generateDefault: undefined as unknown as () => PrimitivePalette,
}
