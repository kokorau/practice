/**
 * InitializeSiteBuilderUseCase - SiteBuilder の初期化
 *
 * AssetRepository にデフォルトアセットを登録する
 */

import type { AssetRepository } from '../../../AssetRepository/Infra/AssetRepository'
import type { Asset } from '../../../Asset'
import { $Asset, $AssetSource } from '../../../Asset'
import { BRAND_GUIDE_FILENAME, BRAND_GUIDE_ASSET_ID } from '../../Domain/constants/defaultBrandGuide'
import {
  type SiteConfig,
  $SiteConfig,
  SITE_CONFIG_ASSET_ID,
  SITE_CONFIG_FILENAME,
} from '../../Domain/ValueObject/SiteConfig'
import {
  type FilterConfig,
  $FilterConfig,
  FILTER_CONFIG_ASSET_ID,
  FILTER_CONFIG_FILENAME,
} from '../../Domain/ValueObject/FilterConfig'
import {
  type SiteContents,
  $SiteContents,
  SITE_CONTENTS_ASSET_ID,
  SITE_CONTENTS_FILENAME,
  createDefaultSiteContents,
} from '../../Domain/ValueObject/SiteContents'
import { DEFAULT_BRAND_GUIDE_CONTENT, DEFAULT_SITE_CONFIG } from '../../Infra/MockData'

/** 初期化オプション */
export interface InitializeSiteBuilderOptions {
  /** 既存のアセットを上書きするか（デフォルト: false） */
  overwrite?: boolean
  /** 初期 SiteConfig（指定しない場合はデフォルト値） */
  initialSiteConfig?: Partial<SiteConfig>
  /** 初期 FilterConfig（指定しない場合はデフォルト値） */
  initialFilterConfig?: Partial<FilterConfig>
  /** 初期 SiteContents（指定しない場合はデフォルト値） */
  initialSiteContents?: SiteContents
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

/** SiteConfig アセットを作成 */
const createSiteConfigAsset = (config: SiteConfig): Asset => {
  const json = $SiteConfig.toJSON(config)
  const blob = new Blob([json], { type: 'application/json' })
  return $Asset.create({
    id: SITE_CONFIG_ASSET_ID,
    name: SITE_CONFIG_FILENAME,
    source: $AssetSource.fromBlob(blob),
    meta: {
      mimeType: 'application/json',
      size: blob.size,
    },
  })
}

/** FilterConfig アセットを作成 */
const createFilterConfigAsset = (config: FilterConfig): Asset => {
  const json = $FilterConfig.toJSON(config)
  const blob = new Blob([json], { type: 'application/json' })
  return $Asset.create({
    id: FILTER_CONFIG_ASSET_ID,
    name: FILTER_CONFIG_FILENAME,
    source: $AssetSource.fromBlob(blob),
    meta: {
      mimeType: 'application/json',
      size: blob.size,
    },
  })
}

/** SiteContents アセットを作成 */
const createSiteContentsAsset = (contents: SiteContents): Asset => {
  const json = $SiteContents.toJSON(contents)
  const blob = new Blob([json], { type: 'application/json' })
  return $Asset.create({
    id: SITE_CONTENTS_ASSET_ID,
    name: SITE_CONTENTS_FILENAME,
    source: $AssetSource.fromBlob(blob),
    meta: {
      mimeType: 'application/json',
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
  const { overwrite = false, initialSiteConfig, initialFilterConfig, initialSiteContents } = options

  // Brand Guide の初期化
  const existingBrandGuide = repository.get(BRAND_GUIDE_ASSET_ID)
  if (!existingBrandGuide || overwrite) {
    const brandGuideAsset = createBrandGuideAsset(DEFAULT_BRAND_GUIDE_CONTENT)
    repository.set(BRAND_GUIDE_ASSET_ID, brandGuideAsset)
  }

  // SiteConfig の初期化
  const existingSiteConfig = repository.get(SITE_CONFIG_ASSET_ID)
  if (!existingSiteConfig || overwrite) {
    const config = $SiteConfig.create(DEFAULT_SITE_CONFIG, initialSiteConfig)
    const siteConfigAsset = createSiteConfigAsset(config)
    repository.set(SITE_CONFIG_ASSET_ID, siteConfigAsset)
  }

  // FilterConfig の初期化
  const existingFilterConfig = repository.get(FILTER_CONFIG_ASSET_ID)
  if (!existingFilterConfig || overwrite) {
    const config = $FilterConfig.create(initialFilterConfig)
    const filterConfigAsset = createFilterConfigAsset(config)
    repository.set(FILTER_CONFIG_ASSET_ID, filterConfigAsset)
  }

  // SiteContents の初期化
  const existingSiteContents = repository.get(SITE_CONTENTS_ASSET_ID)
  if (!existingSiteContents || overwrite) {
    const contents = initialSiteContents ?? createDefaultSiteContents()
    const siteContentsAsset = createSiteContentsAsset(contents)
    repository.set(SITE_CONTENTS_ASSET_ID, siteContentsAsset)
  }
}
