/**
 * createDefaultAssetsUseCase - デフォルトのアセットとツリー構造を作成
 *
 * 空のツリーとアセットマップを作成する。
 * アプリケーション固有のアセット（SiteBuilderなど）は各モジュールのInfra層で追加する。
 */

import type { Asset, AssetId } from '../../Asset'
import type { AssetTree } from '../Domain'
import { $AssetTree } from '../Domain'

export type DefaultAssetsResult = {
  tree: AssetTree
  assets: Map<AssetId, Asset>
}

export const createDefaultAssetsUseCase = (): DefaultAssetsResult => {
  const tree = $AssetTree.create()
  const assets = new Map<AssetId, Asset>()

  return { tree, assets }
}
