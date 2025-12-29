/**
 * createDefaultAssetsUseCase - デフォルトのアセットとツリー構造を作成
 */

import type { Asset, AssetId } from '../../Asset'
import { $Asset, $AssetSource } from '../../Asset'
import type { AssetTree } from '../Domain'
import { $AssetTree, ROOT_NODE_ID } from '../Domain'

// テキストファイル (?raw)
import sampleRedSvg from './constants/files/sample-red.svg?raw'
import sampleBlueSvg from './constants/files/sample-blue.svg?raw'
import sampleGreenSvg from './constants/files/sample-green.svg?raw'
import iconHomeSvg from './constants/files/icon-home.svg?raw'
import iconMenuSvg from './constants/files/icon-menu.svg?raw'
import iconSearchSvg from './constants/files/icon-search.svg?raw'
import readmeContent from './constants/files/README.md?raw'
import configJson from './constants/files/config.json?raw'

// SiteBuilder用ファイル
import brandGuideContent from '../../SiteBuilder/Infra/MockData/brandGuide.md?raw'
import siteConfigData from '../../SiteBuilder/Infra/MockData/siteConfig.json'
import {
  BRAND_GUIDE_ASSET_ID,
  BRAND_GUIDE_FILENAME,
} from '../../SiteBuilder/Domain/constants/defaultBrandGuide'
import {
  SITE_CONFIG_ASSET_ID,
  SITE_CONFIG_FILENAME,
  $SiteConfig,
} from '../../SiteBuilder/Domain/ValueObject/SiteConfig'
import {
  FILTER_CONFIG_ASSET_ID,
  FILTER_CONFIG_FILENAME,
  DEFAULT_FILTER_CONFIG,
  $FilterConfig,
} from '../../SiteBuilder/Domain/ValueObject/FilterConfig'
import {
  SITE_CONTENTS_ASSET_ID,
  SITE_CONTENTS_FILENAME,
  $SiteContents,
  createDefaultSiteContents,
} from '../../SiteBuilder/Domain/ValueObject/SiteContents'

// バイナリファイル (URL)
import photoLandscapeUrl from './constants/files/photo-landscape.jpg'
import photoNatureUrl from './constants/files/photo-nature.jpg'
import photoAbstractUrl from './constants/files/photo-abstract.jpg'
import interRegularUrl from './constants/files/inter-regular.woff2'
import interMediumUrl from './constants/files/inter-medium.woff2'
import bbhBartleUrl from './constants/files/BBHBartle-Regular.ttf'

export type DefaultAssetsResult = {
  tree: AssetTree
  assets: Map<AssetId, Asset>
}

/** デフォルトフォルダ */
const defaultFolders = ['Config', 'Images', 'Icons', 'Documents', 'Fonts', 'Data'] as const

/** テキストファイル定義 */
type TextFileDef = {
  type: 'text'
  name: string
  content: string
  mimeType: string
  folder: string
  description: string
  tags: string[]
}

/** URLファイル定義 */
type UrlFileDef = {
  type: 'url'
  name: string
  url: string
  mimeType: string
  folder: string
  description: string
  tags: string[]
}

type SampleFileDef = TextFileDef | UrlFileDef

const sampleFiles: SampleFileDef[] = [
  // Images (samples)
  {
    type: 'text',
    name: 'sample-red.svg',
    content: sampleRedSvg,
    mimeType: 'image/svg+xml',
    folder: 'Images',
    description: 'Sample Red image',
    tags: ['sample', 'svg'],
  },
  {
    type: 'text',
    name: 'sample-blue.svg',
    content: sampleBlueSvg,
    mimeType: 'image/svg+xml',
    folder: 'Images',
    description: 'Sample Blue image',
    tags: ['sample', 'svg'],
  },
  {
    type: 'text',
    name: 'sample-green.svg',
    content: sampleGreenSvg,
    mimeType: 'image/svg+xml',
    folder: 'Images',
    description: 'Sample Green image',
    tags: ['sample', 'svg'],
  },
  // Images (photos)
  {
    type: 'url',
    name: 'photo-landscape.jpg',
    url: photoLandscapeUrl,
    mimeType: 'image/jpeg',
    folder: 'Images',
    description: 'Landscape photo from Unsplash',
    tags: ['photo', 'unsplash', 'landscape'],
  },
  {
    type: 'url',
    name: 'photo-nature.jpg',
    url: photoNatureUrl,
    mimeType: 'image/jpeg',
    folder: 'Images',
    description: 'Nature photo from Unsplash',
    tags: ['photo', 'unsplash', 'nature'],
  },
  {
    type: 'url',
    name: 'photo-abstract.jpg',
    url: photoAbstractUrl,
    mimeType: 'image/jpeg',
    folder: 'Images',
    description: 'Abstract photo from Unsplash',
    tags: ['photo', 'unsplash', 'abstract'],
  },
  // Icons
  {
    type: 'text',
    name: 'icon-home.svg',
    content: iconHomeSvg,
    mimeType: 'image/svg+xml',
    folder: 'Icons',
    description: 'Home icon (Material Icons)',
    tags: ['icon', 'material', 'home'],
  },
  {
    type: 'text',
    name: 'icon-menu.svg',
    content: iconMenuSvg,
    mimeType: 'image/svg+xml',
    folder: 'Icons',
    description: 'Menu icon (Material Icons)',
    tags: ['icon', 'material', 'menu'],
  },
  {
    type: 'text',
    name: 'icon-search.svg',
    content: iconSearchSvg,
    mimeType: 'image/svg+xml',
    folder: 'Icons',
    description: 'Search icon (Material Icons)',
    tags: ['icon', 'material', 'search'],
  },
  // Documents
  {
    type: 'text',
    name: 'README.md',
    content: readmeContent,
    mimeType: 'text/markdown',
    folder: 'Documents',
    description: 'Project readme file',
    tags: ['documentation', 'readme'],
  },
  // Fonts
  {
    type: 'url',
    name: 'inter-regular.woff2',
    url: interRegularUrl,
    mimeType: 'font/woff2',
    folder: 'Fonts',
    description: 'Inter Regular (400)',
    tags: ['font', 'inter', 'regular'],
  },
  {
    type: 'url',
    name: 'inter-medium.woff2',
    url: interMediumUrl,
    mimeType: 'font/woff2',
    folder: 'Fonts',
    description: 'Inter Medium (500)',
    tags: ['font', 'inter', 'medium'],
  },
  {
    type: 'url',
    name: 'BBHBartle-Regular.ttf',
    url: bbhBartleUrl,
    mimeType: 'font/ttf',
    folder: 'Fonts',
    description: 'BBH Bartle Regular',
    tags: ['font', 'bbh-bartle', 'display'],
  },
  // Data
  {
    type: 'text',
    name: 'config.json',
    content: configJson,
    mimeType: 'application/json',
    folder: 'Data',
    description: 'Configuration file',
    tags: ['config', 'json'],
  },
]

export const createDefaultAssetsUseCase = (): DefaultAssetsResult => {
  let tree = $AssetTree.create()
  const assetMap = new Map<AssetId, Asset>()

  // フォルダ作成
  for (const folderName of defaultFolders) {
    tree = $AssetTree.addFolder(tree, folderName, ROOT_NODE_ID)
  }

  // フォルダIDマップを作成
  const folders = $AssetTree.getChildren(tree, ROOT_NODE_ID)
  const folderMap = new Map(folders.map((f) => [f.name, f.id]))

  // サンプルファイルを追加
  for (const file of sampleFiles) {
    const folderId = folderMap.get(file.folder)
    if (!folderId) continue

    let asset: Asset

    if (file.type === 'text') {
      const blob = new Blob([file.content], { type: file.mimeType })
      asset = $Asset.create({
        name: file.name,
        source: $AssetSource.fromBlob(blob),
        meta: {
          mimeType: file.mimeType,
          size: blob.size,
          description: file.description,
          tags: file.tags,
        },
      })
    } else {
      asset = $Asset.create({
        name: file.name,
        source: $AssetSource.fromUrl(file.url),
        meta: {
          mimeType: file.mimeType,
          size: 0, // URLソースはサイズ不明
          description: file.description,
          tags: file.tags,
        },
      })
    }

    assetMap.set(asset.id, asset)
    tree = $AssetTree.addAssetRef(tree, asset.name, folderId, asset.id)
  }

  // ============================================================
  // SiteBuilder 用アセット（固定ID）
  // ============================================================
  const configFolderId = folderMap.get('Config')
  if (configFolderId) {
    // Brand Guide
    const brandGuideBlob = new Blob([brandGuideContent], { type: 'text/markdown' })
    const brandGuideAsset = $Asset.create({
      id: BRAND_GUIDE_ASSET_ID,
      name: BRAND_GUIDE_FILENAME,
      source: $AssetSource.fromBlob(brandGuideBlob),
      meta: {
        mimeType: 'text/markdown',
        size: brandGuideBlob.size,
        description: 'Brand Guide document',
        tags: ['config', 'brand', 'guide'],
      },
    })
    assetMap.set(brandGuideAsset.id, brandGuideAsset)
    tree = $AssetTree.addAssetRef(tree, brandGuideAsset.name, configFolderId, brandGuideAsset.id)

    // SiteConfig
    const siteConfigJson = $SiteConfig.toJSON(siteConfigData)
    const siteConfigBlob = new Blob([siteConfigJson], { type: 'application/json' })
    const siteConfigAsset = $Asset.create({
      id: SITE_CONFIG_ASSET_ID,
      name: SITE_CONFIG_FILENAME,
      source: $AssetSource.fromBlob(siteConfigBlob),
      meta: {
        mimeType: 'application/json',
        size: siteConfigBlob.size,
        description: 'Site configuration',
        tags: ['config', 'site'],
      },
    })
    assetMap.set(siteConfigAsset.id, siteConfigAsset)
    tree = $AssetTree.addAssetRef(tree, siteConfigAsset.name, configFolderId, siteConfigAsset.id)

    // FilterConfig
    const filterConfigJson = $FilterConfig.toJSON(DEFAULT_FILTER_CONFIG)
    const filterConfigBlob = new Blob([filterConfigJson], { type: 'application/json' })
    const filterConfigAsset = $Asset.create({
      id: FILTER_CONFIG_ASSET_ID,
      name: FILTER_CONFIG_FILENAME,
      source: $AssetSource.fromBlob(filterConfigBlob),
      meta: {
        mimeType: 'application/json',
        size: filterConfigBlob.size,
        description: 'Filter configuration',
        tags: ['config', 'filter'],
      },
    })
    assetMap.set(filterConfigAsset.id, filterConfigAsset)
    tree = $AssetTree.addAssetRef(tree, filterConfigAsset.name, configFolderId, filterConfigAsset.id)

    // SiteContents
    const siteContentsJson = $SiteContents.toJSON(createDefaultSiteContents())
    const siteContentsBlob = new Blob([siteContentsJson], { type: 'application/json' })
    const siteContentsAsset = $Asset.create({
      id: SITE_CONTENTS_ASSET_ID,
      name: SITE_CONTENTS_FILENAME,
      source: $AssetSource.fromBlob(siteContentsBlob),
      meta: {
        mimeType: 'application/json',
        size: siteContentsBlob.size,
        description: 'Site contents',
        tags: ['config', 'contents'],
      },
    })
    assetMap.set(siteContentsAsset.id, siteContentsAsset)
    tree = $AssetTree.addAssetRef(tree, siteContentsAsset.name, configFolderId, siteContentsAsset.id)
  }

  return { tree, assets: assetMap }
}
