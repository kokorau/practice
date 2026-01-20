/**
 * Palette - SeedColorsから生成されたパレット全体
 */
import type { SeedColors } from './SeedColors'
import type { SemanticColorPalette } from './SemanticColorPalette'
import type { PrimitivePalette } from './PrimitivePalette'

export interface Palette {
  readonly seedColors: SeedColors
  readonly semanticPalette: SemanticColorPalette
  readonly primitivePalette: PrimitivePalette
}
