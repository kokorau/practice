/**
 * UpdateFilterConfigUseCase - FilterConfig を更新する
 */

import type { AssetRepository } from '../../../AssetRepository/Infra/AssetRepository'
import { $Asset } from '../../../Asset'
import {
  type FilterConfig,
  $FilterConfig,
  FILTER_CONFIG_ASSET_ID,
} from '../../Domain/ValueObject/FilterConfig'

/**
 * FilterConfig を更新する
 *
 * @param repository - AssetRepository インスタンス
 * @param config - 新しい FilterConfig
 */
export function updateFilterConfigUseCase(
  repository: AssetRepository,
  config: FilterConfig
): void {
  const existing = repository.get(FILTER_CONFIG_ASSET_ID)
  if (!existing) {
    return
  }

  const json = $FilterConfig.toJSON(config)
  const blob = new Blob([json], { type: 'application/json' })
  const updated = $Asset.updateSource(existing, blob)
  repository.set(FILTER_CONFIG_ASSET_ID, updated)
}
