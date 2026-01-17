/**
 * HeroScene UseCases
 */

export { getHeroView, setHeroView, subscribeHeroView } from './HeroView'
export {
  updateBrandColor,
  updateAccentColor,
  updateFoundationColor,
  applyColorPreset,
  type UpdateBrandColorParams,
  type UpdateAccentColorParams,
  type UpdateFoundationColorParams,
} from './Color'
export {
  toggleExpand,
  toggleVisibility,
  addLayer,
  removeLayer,
  updateLayer,
  wrapLayerInGroup,
  wrapLayerWithMask,
  moveLayer,
} from './Layer'
export {
  applyPreset,
  exportPreset,
  createPreset,
  type PresetExportPort,
  type ExportPresetOptions,
} from './Preset'
export {
  // New generic functions
  selectFilterType,
  getFilterType,
  updateEffectParams,
  getEffectParams,
  // Legacy aliases (deprecated)
  updateVignetteParams,
  updateChromaticAberrationParams,
  updateDotHalftoneParams,
  updateLineHalftoneParams,
  updateBlurParams,
  getVignetteParams,
  getChromaticAberrationParams,
  getDotHalftoneParams,
  getLineHalftoneParams,
  getBlurParams,
} from './Filter'
export {
  updateTextLayerText,
  updateTextLayerFont,
  updateTextLayerColor,
  updateTextLayerPosition,
  updateTextLayerRotation,
  type UpdateTextLayerFontParams,
  type UpdateTextLayerPositionParams,
  type TextAnchor,
} from './TextLayer'
