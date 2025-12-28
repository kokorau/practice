/**
 * ObserveSiteConfigUseCase - SiteConfig の変更を監視する
 */

import type { AssetRepository, Unsubscribe } from '../../../AssetRepository/Infra/AssetRepository'
import { $Asset } from '../../../Asset'
import {
  type SiteConfig,
  $SiteConfig,
  SITE_CONFIG_ASSET_ID,
  DEFAULT_SITE_CONFIG,
} from '../../Domain/ValueObject/SiteConfig'

/** SiteConfig 変更時のコールバック */
export type SiteConfigObserver = (config: SiteConfig) => void

/** ObserveSiteConfigUseCase の戻り値 */
export interface ObserveSiteConfigResult {
  /** 購読解除関数 */
  unsubscribe: Unsubscribe
}

/**
 * SiteConfig の変更を監視する
 *
 * @param repository - AssetRepository インスタンス
 * @param observer - 変更時に呼ばれるコールバック
 * @returns 購読解除関数を含むオブジェクト
 */
export function observeSiteConfigUseCase(
  repository: AssetRepository,
  observer: SiteConfigObserver
): ObserveSiteConfigResult {
  const unsubscribe = repository.subscribe(SITE_CONFIG_ASSET_ID, async (asset) => {
    if (!asset) {
      observer(DEFAULT_SITE_CONFIG)
      return
    }

    try {
      const blob = await $Asset.toBlob(asset)
      const text = await blob.text()
      const config = $SiteConfig.fromJSON(text)
      observer(config)
    } catch {
      observer(DEFAULT_SITE_CONFIG)
    }
  })

  return { unsubscribe }
}

/**
 * SiteConfig の現在の値を取得する
 *
 * @param repository - AssetRepository インスタンス
 * @returns SiteConfig
 */
export async function getSiteConfigUseCase(
  repository: AssetRepository
): Promise<SiteConfig> {
  const asset = repository.get(SITE_CONFIG_ASSET_ID)
  if (!asset) {
    return DEFAULT_SITE_CONFIG
  }

  try {
    const blob = await $Asset.toBlob(asset)
    const text = await blob.text()
    return $SiteConfig.fromJSON(text)
  } catch {
    return DEFAULT_SITE_CONFIG
  }
}
