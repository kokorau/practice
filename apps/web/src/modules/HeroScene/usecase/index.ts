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
