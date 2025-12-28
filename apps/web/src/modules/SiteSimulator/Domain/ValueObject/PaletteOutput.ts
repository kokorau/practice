import type { BrandPrimitive } from './BrandPrimitive'
import type { CorePalette } from './CorePalette'
import type { PrimitivePalette } from './PrimitivePalette'
import type { SemanticPalette } from './SemanticPalette'

/**
 * PaletteOutput is the complete palette structure.
 */
export type PaletteOutput = {
  readonly primitive: PrimitivePalette
  readonly brand: BrandPrimitive
  readonly core: CorePalette
  readonly semantic: SemanticPalette
}

/**
 * ColorSystemResult is the final output including CSS variables.
 */
export type ColorSystemResult = {
  readonly input: {
    readonly brandColor: string
    readonly filterId?: string
    readonly lightSourceId?: string
  }
  readonly palette: PaletteOutput
  readonly cssVariables: Record<string, string>
}

export const $PaletteOutput = {
  create: undefined as unknown as (
    primitive: PrimitivePalette,
    brand: BrandPrimitive,
    core: CorePalette,
    semantic: SemanticPalette
  ) => PaletteOutput,
}

export const $ColorSystemResult = {
  create: undefined as unknown as (
    input: ColorSystemResult['input'],
    palette: PaletteOutput
  ) => ColorSystemResult,
  toCssVariables: undefined as unknown as (result: ColorSystemResult) => string,
}
