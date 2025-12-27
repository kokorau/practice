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

// バイナリファイル (URL)
import photoLandscapeUrl from './constants/files/photo-landscape.jpg'
import photoNatureUrl from './constants/files/photo-nature.jpg'
import photoAbstractUrl from './constants/files/photo-abstract.jpg'
import interRegularUrl from './constants/files/inter-regular.woff2'
import interMediumUrl from './constants/files/inter-medium.woff2'

export type DefaultAssetsResult = {
  tree: AssetTree
  assets: Map<AssetId, Asset>
}

/** デフォルトフォルダ */
const defaultFolders = ['Images', 'Icons', 'Documents', 'Fonts', 'Data'] as const

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

  return { tree, assets: assetMap }
}
