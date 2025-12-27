/**
 * createDefaultAssetsUseCase - デフォルトのアセットとツリー構造を作成
 */

import type { Asset, AssetId } from '../../Asset'
import { $Asset, $AssetSource } from '../../Asset'
import type { AssetTree } from '../Domain'
import { $AssetTree, ROOT_NODE_ID } from '../Domain'

// ファイルを ?raw でインポート
import sampleRedSvg from './constants/files/sample-red.svg?raw'
import sampleBlueSvg from './constants/files/sample-blue.svg?raw'
import sampleGreenSvg from './constants/files/sample-green.svg?raw'
import readmeContent from './constants/files/README.md?raw'
import configJson from './constants/files/config.json?raw'

export type DefaultAssetsResult = {
  tree: AssetTree
  assets: Map<AssetId, Asset>
}

/** 文字列からBlobを生成 */
const createBlob = (content: string, mimeType: string): Blob => {
  return new Blob([content], { type: mimeType })
}

/** デフォルトフォルダ */
const defaultFolders = ['Images', 'Documents', 'Fonts', 'Data'] as const

/** サンプルファイル定義 */
type SampleFileDef = {
  name: string
  content: string
  mimeType: string
  folder: string
  description: string
  tags: string[]
}

const sampleFiles: SampleFileDef[] = [
  // Images
  {
    name: 'sample-red.svg',
    content: sampleRedSvg,
    mimeType: 'image/svg+xml',
    folder: 'Images',
    description: 'Sample Red image',
    tags: ['sample', 'svg', 'red'],
  },
  {
    name: 'sample-blue.svg',
    content: sampleBlueSvg,
    mimeType: 'image/svg+xml',
    folder: 'Images',
    description: 'Sample Blue image',
    tags: ['sample', 'svg', 'blue'],
  },
  {
    name: 'sample-green.svg',
    content: sampleGreenSvg,
    mimeType: 'image/svg+xml',
    folder: 'Images',
    description: 'Sample Green image',
    tags: ['sample', 'svg', 'green'],
  },
  // Documents
  {
    name: 'README.md',
    content: readmeContent,
    mimeType: 'text/markdown',
    folder: 'Documents',
    description: 'Project readme file',
    tags: ['documentation', 'readme'],
  },
  // Data
  {
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

    const blob = createBlob(file.content, file.mimeType)
    const asset = $Asset.create({
      name: file.name,
      source: $AssetSource.fromBlob(blob),
      meta: {
        mimeType: file.mimeType,
        size: blob.size,
        description: file.description,
        tags: file.tags,
      },
    })
    assetMap.set(asset.id, asset)
    tree = $AssetTree.addAssetRef(tree, asset.name, folderId, asset.id)
  }

  return { tree, assets: assetMap }
}
