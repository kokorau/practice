/**
 * ObserveSiteContentsUseCase - SiteContents の変更を監視する
 */

import type { AssetRepository, Unsubscribe } from '../../../AssetManager/Infra/AssetRepository'
import { $Asset } from '../../../Asset'
import {
  type SiteContents,
  $SiteContents,
  SITE_CONTENTS_ASSET_ID,
  createDefaultSiteContents,
} from '../../Domain/ValueObject/SiteContents'

/** SiteContents 変更時のコールバック */
export type SiteContentsObserver = (contents: SiteContents) => void

/** ObserveSiteContentsUseCase の戻り値 */
export interface ObserveSiteContentsResult {
  /** 購読解除関数 */
  unsubscribe: Unsubscribe
}

/**
 * SiteContents の変更を監視する
 *
 * @param repository - AssetRepository インスタンス
 * @param observer - 変更時に呼ばれるコールバック
 * @returns 購読解除関数を含むオブジェクト
 */
export function observeSiteContentsUseCase(
  repository: AssetRepository,
  observer: SiteContentsObserver
): ObserveSiteContentsResult {
  const unsubscribe = repository.subscribe(SITE_CONTENTS_ASSET_ID, async (asset) => {
    if (!asset) {
      observer(createDefaultSiteContents())
      return
    }

    try {
      const blob = await $Asset.toBlob(asset)
      const text = await blob.text()
      const contents = $SiteContents.fromJSON(text)
      observer(contents)
    } catch {
      observer(createDefaultSiteContents())
    }
  })

  return { unsubscribe }
}

/**
 * SiteContents の現在の値を取得する
 *
 * @param repository - AssetRepository インスタンス
 * @returns SiteContents
 */
export async function getSiteContentsUseCase(
  repository: AssetRepository
): Promise<SiteContents> {
  const asset = repository.get(SITE_CONTENTS_ASSET_ID)
  if (!asset) {
    return createDefaultSiteContents()
  }

  try {
    const blob = await $Asset.toBlob(asset)
    const text = await blob.text()
    return $SiteContents.fromJSON(text)
  } catch {
    return createDefaultSiteContents()
  }
}
