/**
 * FilterConfig - フィルター設定
 *
 * Filter 状態、強度、適用中のプリセットIDを管理
 */

import type { AssetId } from '../../../Asset'
import type { Filter } from '../../../Filter/Domain'
import { $Filter } from '../../../Filter/Domain'

/** フィルター設定 */
export type FilterConfig = {
  /** フィルター状態 */
  readonly filter: Filter
  /** フィルター強度 (0.0〜1.0) */
  readonly intensity: number
  /** 適用中のプリセットID (null = カスタム) */
  readonly presetId: string | null
}

/** FilterConfig の固定 AssetId */
export const FILTER_CONFIG_ASSET_ID = 'filter-config' as AssetId

/** FilterConfig のファイル名 */
export const FILTER_CONFIG_FILENAME = 'filter-config.json'

/** デフォルトの FilterConfig */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  filter: $Filter.identity(),
  intensity: 1.0,
  presetId: null,
}

export const $FilterConfig = {
  /** FilterConfig を作成 */
  create: (partial?: Partial<FilterConfig>): FilterConfig => ({
    ...DEFAULT_FILTER_CONFIG,
    ...partial,
  }),

  /** JSON 文字列からパース */
  fromJSON: (json: string): FilterConfig => {
    try {
      const parsed = JSON.parse(json)
      return $FilterConfig.create(parsed)
    } catch {
      return DEFAULT_FILTER_CONFIG
    }
  },

  /** JSON 文字列にシリアライズ */
  toJSON: (config: FilterConfig): string => {
    return JSON.stringify(config, null, 2)
  },

  /** filter を更新 */
  updateFilter: (config: FilterConfig, filter: Filter): FilterConfig => ({
    ...config,
    filter,
    // フィルターを変更したらカスタム扱いにする
    presetId: null,
  }),

  /** intensity を更新 */
  updateIntensity: (config: FilterConfig, intensity: number): FilterConfig => ({
    ...config,
    intensity: Math.max(0, Math.min(1, intensity)),
  }),

  /** presetId を更新 */
  updatePresetId: (config: FilterConfig, presetId: string | null): FilterConfig => ({
    ...config,
    presetId,
  }),

  /** プリセットを適用 */
  applyPreset: (config: FilterConfig, filter: Filter, presetId: string): FilterConfig => ({
    ...config,
    filter,
    presetId,
  }),

  /** リセット */
  reset: (): FilterConfig => DEFAULT_FILTER_CONFIG,
}
