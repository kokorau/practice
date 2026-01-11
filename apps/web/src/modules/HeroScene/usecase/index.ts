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
  moveLayer,
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
  updateTextLayerText,
  updateTextLayerFont,
  updateTextLayerColor,
  updateTextLayerPosition,
  updateTextLayerRotation,
  type UpdateTextLayerFontParams,
  type UpdateTextLayerPositionParams,
  type TextAnchor,
} from './TextLayer'
