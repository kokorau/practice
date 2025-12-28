/**
 * UpdateBrandGuideUseCase - Brand Guide を更新する
 */

import type { AssetRepository } from '../../../AssetManager/Infra/AssetRepository'
import { $Asset } from '../../../Asset'
import { BRAND_GUIDE_ASSET_ID } from '../../Domain/constants/defaultBrandGuide'

/**
 * Brand Guide の内容を更新する
 *
 * @param repository - AssetRepository インスタンス
 * @param content - 新しい Markdown コンテンツ
 */
export function updateBrandGuideUseCase(
  repository: AssetRepository,
  content: string
): void {
  const existing = repository.get(BRAND_GUIDE_ASSET_ID)
  if (!existing) {
    return
  }

  const blob = new Blob([content], { type: 'text/markdown' })
  const updated = $Asset.updateSource(existing, blob)
  repository.set(BRAND_GUIDE_ASSET_ID, updated)
}
