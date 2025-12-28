/**
 * UpdateSiteConfigUseCase - SiteConfig を更新する
 */

import type { AssetRepository } from '../../../AssetManager/Infra/AssetRepository'
import { $Asset } from '../../../Asset'
import {
  type SiteConfig,
  $SiteConfig,
  SITE_CONFIG_ASSET_ID,
} from '../../Domain/ValueObject/SiteConfig'

/**
 * SiteConfig を更新する
 *
 * @param repository - AssetRepository インスタンス
 * @param config - 新しい SiteConfig
 */
export function updateSiteConfigUseCase(
  repository: AssetRepository,
  config: SiteConfig
): void {
  const existing = repository.get(SITE_CONFIG_ASSET_ID)
  if (!existing) {
    return
  }

  const json = $SiteConfig.toJSON(config)
  const blob = new Blob([json], { type: 'application/json' })
  const updated = $Asset.updateSource(existing, blob)
  repository.set(SITE_CONFIG_ASSET_ID, updated)
}
