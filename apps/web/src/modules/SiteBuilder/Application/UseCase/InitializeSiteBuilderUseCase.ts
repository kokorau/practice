/**
 * InitializeSiteBuilderUseCase - SiteBuilder の初期化
 *
 * AssetRepository にデフォルトアセットを登録する
 */

import type { AssetRepository } from '../../../AssetManager/Infra/AssetRepository'
import type { Asset, AssetId } from '../../../Asset'
import { $Asset, $AssetSource } from '../../../Asset'
import {
  DEFAULT_BRAND_GUIDE_CONTENT,
  BRAND_GUIDE_FILENAME,
  BRAND_GUIDE_ASSET_ID,
} from '../../Domain/constants/defaultBrandGuide'

/** 初期化オプション */
export interface InitializeSiteBuilderOptions {
  /** 既存の Brand Guide を上書きするか（デフォルト: false） */
  overwrite?: boolean
}

/** Brand Guide アセットを作成 */
const createBrandGuideAsset = (content: string): Asset => {
  const blob = new Blob([content], { type: 'text/markdown' })
  return $Asset.create({
    id: BRAND_GUIDE_ASSET_ID,
    name: BRAND_GUIDE_FILENAME,
    source: $AssetSource.fromBlob(blob),
    meta: {
      mimeType: 'text/markdown',
      size: blob.size,
    },
  })
}

/**
 * SiteBuilder を初期化する
 *
 * @param repository - AssetRepository インスタンス
 * @param options - 初期化オプション
 */
export function initializeSiteBuilderUseCase(
  repository: AssetRepository,
  options: InitializeSiteBuilderOptions = {}
): void {
  const { overwrite = false } = options

  // Brand Guide が存在しない、または上書きする場合
  const existing = repository.get(BRAND_GUIDE_ASSET_ID)
  if (!existing || overwrite) {
    const brandGuideAsset = createBrandGuideAsset(DEFAULT_BRAND_GUIDE_CONTENT)
    repository.set(BRAND_GUIDE_ASSET_ID, brandGuideAsset)
  }
}
