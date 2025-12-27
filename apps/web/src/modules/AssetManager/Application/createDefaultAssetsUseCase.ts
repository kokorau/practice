/**
 * createDefaultAssetsUseCase - デフォルトのアセットとツリー構造を作成
 */

import type { Asset, AssetId } from '../../Asset'
import { $Asset, $AssetSource } from '../../Asset'
import type { AssetTree } from '../Domain'
import { $AssetTree, ROOT_NODE_ID } from '../Domain'

/** サンプルSVG画像を生成 */
const createSampleSvg = (color: string, label: string): Blob => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="${color}"/>
  <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="system-ui" font-size="24">${label}</text>
</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

/** サンプルテキストを生成 */
const createSampleText = (content: string): Blob => {
  return new Blob([content], { type: 'text/plain' })
}

/** サンプルJSONを生成 */
const createSampleJson = (data: object): Blob => {
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}

export type DefaultAssetsResult = {
  tree: AssetTree
  assets: Map<AssetId, Asset>
}

export const createDefaultAssetsUseCase = (): DefaultAssetsResult => {
  let t = $AssetTree.create()
  const assetMap = new Map<AssetId, Asset>()

  // フォルダ作成
  t = $AssetTree.addFolder(t, 'Images', ROOT_NODE_ID)
  t = $AssetTree.addFolder(t, 'Documents', ROOT_NODE_ID)
  t = $AssetTree.addFolder(t, 'Fonts', ROOT_NODE_ID)
  t = $AssetTree.addFolder(t, 'Data', ROOT_NODE_ID)

  // フォルダIDを取得
  const folders = $AssetTree.getChildren(t, ROOT_NODE_ID)
  const imagesFolder = folders.find((n) => n.name === 'Images')!
  const documentsFolder = folders.find((n) => n.name === 'Documents')!
  const dataFolder = folders.find((n) => n.name === 'Data')!

  // サンプル画像
  const sampleImages = [
    { name: 'sample-red.svg', color: '#e53935', label: 'Red' },
    { name: 'sample-blue.svg', color: '#1e88e5', label: 'Blue' },
    { name: 'sample-green.svg', color: '#43a047', label: 'Green' },
  ]

  for (const img of sampleImages) {
    const blob = createSampleSvg(img.color, img.label)
    const asset = $Asset.create({
      name: img.name,
      source: $AssetSource.fromBlob(blob),
      meta: {
        mimeType: 'image/svg+xml',
        size: blob.size,
        description: `Sample ${img.label} image`,
        tags: ['sample', 'svg', img.label.toLowerCase()],
      },
    })
    assetMap.set(asset.id, asset)
    t = $AssetTree.addAssetRef(t, asset.name, imagesFolder.id, asset.id)
  }

  // サンプルテキスト
  const readmeBlob = createSampleText(`# Asset Manager

This is a sample README file.

## Features
- Tree-based file management
- Image preview
- Metadata support
`)
  const readmeAsset = $Asset.create({
    name: 'README.md',
    source: $AssetSource.fromBlob(readmeBlob),
    meta: {
      mimeType: 'text/markdown',
      size: readmeBlob.size,
      description: 'Project readme file',
      tags: ['documentation', 'readme'],
    },
  })
  assetMap.set(readmeAsset.id, readmeAsset)
  t = $AssetTree.addAssetRef(t, readmeAsset.name, documentsFolder.id, readmeAsset.id)

  // サンプルJSON
  const configBlob = createSampleJson({
    name: 'My Project',
    version: '1.0.0',
    settings: {
      theme: 'dark',
      language: 'ja',
    },
  })
  const configAsset = $Asset.create({
    name: 'config.json',
    source: $AssetSource.fromBlob(configBlob),
    meta: {
      mimeType: 'application/json',
      size: configBlob.size,
      description: 'Configuration file',
      tags: ['config', 'json'],
    },
  })
  assetMap.set(configAsset.id, configAsset)
  t = $AssetTree.addAssetRef(t, configAsset.name, dataFolder.id, configAsset.id)

  return { tree: t, assets: assetMap }
}
