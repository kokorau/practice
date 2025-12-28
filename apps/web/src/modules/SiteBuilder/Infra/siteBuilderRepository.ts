/**
 * SiteBuilder 用の AssetRepository インスタンス
 *
 * シングルトンとして管理し、アプリケーション全体で共有する
 */

import { createAssetRepository, type AssetRepository } from '../../AssetRepository/Infra/AssetRepository'

/** SiteBuilder 用の AssetRepository インスタンス */
let repository: AssetRepository | null = null

/**
 * SiteBuilder 用の AssetRepository を取得する
 *
 * 初回呼び出し時にインスタンスを作成し、以降は同じインスタンスを返す
 */
export function getSiteBuilderRepository(): AssetRepository {
  if (!repository) {
    repository = createAssetRepository()
  }
  return repository
}

/**
 * SiteBuilder 用の AssetRepository をリセットする
 *
 * テスト用途など、新しいインスタンスが必要な場合に使用
 */
export function resetSiteBuilderRepository(): void {
  repository = null
}
