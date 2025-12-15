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
  NEUTRAL_L_LIGHT,
  NEUTRAL_L_DARK,
  DEFAULT_CHROMA_RATIO,
  DEFAULT_MAX_CHROMA,
  DEFAULT_FOUNDATION_CHROMA_RATIO,
  generateNeutralRamp,
  generateFoundationRamp,
  createPrimitivePalette,
  type NeutralRampParams,
  type FoundationRampParams,
  type PrimitivePaletteParams,
} from './PrimitivePaletteFactory'
