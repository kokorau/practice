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
} from './Layer'
export {
  applyPreset,
  exportPreset,
  createPreset,
  type PresetExportPort,
  type ExportPresetOptions,
} from './Preset'
export {
  selectFilterType,
  getFilterType,
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
  type FilterType,
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
