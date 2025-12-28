/**
 * UpdateSiteContentsUseCase - SiteContents を更新する
 */

import type { AssetRepository } from '../../../AssetManager/Infra/AssetRepository'
import { $Asset } from '../../../Asset'
import {
  type SiteContents,
  $SiteContents,
  SITE_CONTENTS_ASSET_ID,
} from '../../Domain/ValueObject/SiteContents'

/**
 * SiteContents を更新する
 *
 * @param repository - AssetRepository インスタンス
 * @param contents - 新しい SiteContents
 */
export function updateSiteContentsUseCase(
  repository: AssetRepository,
  contents: SiteContents
): void {
  const existing = repository.get(SITE_CONTENTS_ASSET_ID)
  if (!existing) {
    return
  }

  const json = $SiteContents.toJSON(contents)
  const blob = new Blob([json], { type: 'application/json' })
  const updated = $Asset.updateSource(existing, blob)
  repository.set(SITE_CONTENTS_ASSET_ID, updated)
}
