/**
 * ObserveFilterConfigUseCase - FilterConfig の変更を監視する
 */

import type { AssetRepository, Unsubscribe } from '../../../AssetRepository/Infra/AssetRepository'
import { $Asset } from '../../../Asset'
import {
  type FilterConfig,
  $FilterConfig,
  FILTER_CONFIG_ASSET_ID,
  DEFAULT_FILTER_CONFIG,
} from '../../Domain/ValueObject/FilterConfig'

/** FilterConfig 変更時のコールバック */
export type FilterConfigObserver = (config: FilterConfig) => void

/** ObserveFilterConfigUseCase の戻り値 */
export interface ObserveFilterConfigResult {
  /** 購読解除関数 */
  unsubscribe: Unsubscribe
}

/**
 * FilterConfig の変更を監視する
 *
 * @param repository - AssetRepository インスタンス
 * @param observer - 変更時に呼ばれるコールバック
 * @returns 購読解除関数を含むオブジェクト
 */
export function observeFilterConfigUseCase(
  repository: AssetRepository,
  observer: FilterConfigObserver
): ObserveFilterConfigResult {
  const unsubscribe = repository.subscribe(FILTER_CONFIG_ASSET_ID, async (asset) => {
    if (!asset) {
      observer(DEFAULT_FILTER_CONFIG)
      return
    }

    try {
      const blob = await $Asset.toBlob(asset)
      const text = await blob.text()
      const config = $FilterConfig.fromJSON(text)
      observer(config)
    } catch {
      observer(DEFAULT_FILTER_CONFIG)
    }
  })

  return { unsubscribe }
}

/**
 * FilterConfig の現在の値を取得する
 *
 * @param repository - AssetRepository インスタンス
 * @returns FilterConfig
 */
export async function getFilterConfigUseCase(
  repository: AssetRepository
): Promise<FilterConfig> {
  const asset = repository.get(FILTER_CONFIG_ASSET_ID)
  if (!asset) {
    return DEFAULT_FILTER_CONFIG
  }

  try {
    const blob = await $Asset.toBlob(asset)
    const text = await blob.text()
    return $FilterConfig.fromJSON(text)
  } catch {
    return DEFAULT_FILTER_CONFIG
  }
}
