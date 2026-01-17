/**
 * HeroScene UseCases
 */

export { getHeroView, setHeroView, subscribeHeroView } from './HeroView'
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
// Filter usecase exports - types only
// NOTE: Legacy repository-based functions removed, use composables instead
export type { FilterType } from './Filter'
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
