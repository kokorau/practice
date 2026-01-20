export {
  collectCSSVariableEntries,
  toCSSVariables,
  toCSSText,
} from './CSSVariables'

export { collectCSSRuleSets, toCSSRuleSetsText } from './CSSRuleSets'

export {
  createDefaultLightPalette,
  createDefaultDarkPalette,
  getPaletteEntries,
  type PaletteEntry,
} from './DefaultPalettes'

export {
  PRIMITIVE_PALETTE_CONFIG,
  createPrimitivePalette,
  type PrimitivePaletteConfig,
  type PrimitivePaletteParams,
} from './PrimitivePaletteFactory'

export {
  createSemanticFromPrimitive,
  createPrimitiveRefMap,
  selectInkForSurface,
  selectInkForSurfaceWithBgY,
  selectAllInksForSurface,
  type PrimitiveRef,
  type InkRefs,
  type BaseTokenRefs,
  type StatefulSurfaceRefs,
  type StatefulInkRefs,
  type StatefulTokenRefs,
  type PrimitiveRefMap,
} from './SemanticPaletteFromPrimitive'

// Re-export InkRole from Domain (used by selectInkForSurface)
export type { InkRole } from '../Domain/NeutralSelection'

export { COLOR_PRESETS } from './ColorPresets'

// Repository
export {
  createPaletteInMemoryRepository,
  type CreatePaletteInMemoryRepositoryOptions,
} from './PaletteInMemoryRepository'
