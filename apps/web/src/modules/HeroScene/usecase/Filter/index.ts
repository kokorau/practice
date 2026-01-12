/**
 * Filter UseCase
 *
 * フィルター/エフェクト操作のユースケース
 */

export { selectFilterType, getFilterType } from './selectFilterType'
export {
  // New generic functions
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
} from './updateFilterParams'
