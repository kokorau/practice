/**
 * createPaletteAssetsUseCase - SemanticColorPaletteGenerator用のデフォルトアセットを作成
 */

import type { Asset, AssetId } from '../../Asset'
import { $Asset, $AssetSource } from '../../Asset'
import type { AssetTree } from '../../AssetManager/Domain'
import { $AssetTree, ROOT_NODE_ID } from '../../AssetManager/Domain'
import {
  DEFAULT_BRAND_GUIDE_CONTENT,
  BRAND_GUIDE_FILENAME,
  BRAND_GUIDE_ASSET_ID,
} from '../Domain/constants/defaultBrandGuide'

export type PaletteAssetsResult = {
  tree: AssetTree
  assets: Map<AssetId, Asset>
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
 * SemanticColorPaletteGenerator用のデフォルトアセットとツリー構造を作成
 */
export const createPaletteAssetsUseCase = (): PaletteAssetsResult => {
  let tree = $AssetTree.create()
  const assetMap = new Map<AssetId, Asset>()

  // Brand Guide アセットを作成
  const brandGuideAsset = createBrandGuideAsset(DEFAULT_BRAND_GUIDE_CONTENT)
  assetMap.set(brandGuideAsset.id, brandGuideAsset)

  // ツリーに追加
  tree = $AssetTree.addAssetRef(tree, BRAND_GUIDE_FILENAME, ROOT_NODE_ID, BRAND_GUIDE_ASSET_ID)

  return { tree, assets: assetMap }
}
