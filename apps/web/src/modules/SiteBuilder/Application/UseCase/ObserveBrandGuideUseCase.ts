/**
 * ObserveBrandGuideUseCase - Brand Guide の変更を監視する
 */

import type { AssetRepository, Unsubscribe } from '../../../AssetRepository/Infra/AssetRepository'
import { $Asset } from '../../../Asset'
import { BRAND_GUIDE_ASSET_ID } from '../../Domain/constants/defaultBrandGuide'
import { DEFAULT_BRAND_GUIDE_CONTENT } from '../../Infra/MockData'

/** Brand Guide 変更時のコールバック */
export type BrandGuideObserver = (content: string) => void

/** ObserveBrandGuideUseCase の戻り値 */
export interface ObserveBrandGuideResult {
  /** 購読解除関数 */
  unsubscribe: Unsubscribe
}

/**
 * Brand Guide の変更を監視する
 *
 * @param repository - AssetRepository インスタンス
 * @param observer - 変更時に呼ばれるコールバック（content を受け取る）
 * @returns 購読解除関数を含むオブジェクト
 */
export function observeBrandGuideUseCase(
  repository: AssetRepository,
  observer: BrandGuideObserver
): ObserveBrandGuideResult {
  const unsubscribe = repository.subscribe(BRAND_GUIDE_ASSET_ID, async (asset) => {
    if (!asset) {
      observer(DEFAULT_BRAND_GUIDE_CONTENT)
      return
    }

    try {
      const blob = await $Asset.toBlob(asset)
      const text = await blob.text()
      observer(text)
    } catch {
      observer(DEFAULT_BRAND_GUIDE_CONTENT)
    }
  })

  return { unsubscribe }
}

/**
 * Brand Guide の現在の内容を取得する
 *
 * @param repository - AssetRepository インスタンス
 * @returns Brand Guide の Markdown コンテンツ
 */
export async function getBrandGuideContentUseCase(
  repository: AssetRepository
): Promise<string> {
  const asset = repository.get(BRAND_GUIDE_ASSET_ID)
  if (!asset) {
    return DEFAULT_BRAND_GUIDE_CONTENT
  }

  try {
    const blob = await $Asset.toBlob(asset)
    return blob.text()
  } catch {
    return DEFAULT_BRAND_GUIDE_CONTENT
  }
}
