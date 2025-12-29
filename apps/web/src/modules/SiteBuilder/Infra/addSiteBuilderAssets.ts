/**
 * addSiteBuilderAssets - SiteBuilder用アセットをAssetTreeに追加
 *
 * Infra層でモックデータを注入し、Application層（createDefaultAssetsUseCase）から
 * モックデータへの依存を分離する。
 */

import type { Asset, AssetId } from '../../Asset'
import { $Asset, $AssetSource } from '../../Asset'
import type { AssetTree } from '../../AssetRepository/Domain'
import { $AssetTree, ROOT_NODE_ID, $AssetNode } from '../../AssetRepository/Domain'
import {
  BRAND_GUIDE_ASSET_ID,
  BRAND_GUIDE_FILENAME,
} from '../Domain/constants/defaultBrandGuide'
import {
  SITE_CONFIG_ASSET_ID,
  SITE_CONFIG_FILENAME,
  $SiteConfig,
} from '../Domain/ValueObject/SiteConfig'
import {
  FILTER_CONFIG_ASSET_ID,
  FILTER_CONFIG_FILENAME,
  $FilterConfig,
} from '../Domain/ValueObject/FilterConfig'
import {
  SITE_CONTENTS_ASSET_ID,
  SITE_CONTENTS_FILENAME,
  $SiteContents,
} from '../Domain/ValueObject/SiteContents'
import {
  DEFAULT_BRAND_GUIDE_CONTENT,
  DEFAULT_SITE_CONFIG,
  DEFAULT_FILTER_CONFIG,
  DEFAULT_SITE_CONTENTS,
} from './MockData'

export type AddSiteBuilderAssetsResult = {
  tree: AssetTree
  assets: Map<AssetId, Asset>
}

/**
 * SiteBuilder用アセットを追加する
 *
 * @param input - 既存のAssetTreeとassetsマップ
 * @returns SiteBuilder用アセットが追加されたツリーとマップ
 */
export function addSiteBuilderAssets(input: AddSiteBuilderAssetsResult): AddSiteBuilderAssetsResult {
  let { tree, assets } = input
  const assetMap = new Map(assets)

  // Config フォルダを探すか作成
  let configFolderId = findOrCreateConfigFolder(tree)
  if (configFolderId.newTree) {
    tree = configFolderId.newTree
  }
  const folderId = configFolderId.folderId

  // Brand Guide
  const brandGuideBlob = new Blob([DEFAULT_BRAND_GUIDE_CONTENT], { type: 'text/markdown' })
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
  tree = $AssetTree.addAssetRef(tree, brandGuideAsset.name, folderId, brandGuideAsset.id)

  // SiteConfig
  const siteConfigJson = $SiteConfig.toJSON(DEFAULT_SITE_CONFIG)
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
  tree = $AssetTree.addAssetRef(tree, siteConfigAsset.name, folderId, siteConfigAsset.id)

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
  tree = $AssetTree.addAssetRef(tree, filterConfigAsset.name, folderId, filterConfigAsset.id)

  // SiteContents
  const siteContentsJson = $SiteContents.toJSON(DEFAULT_SITE_CONTENTS)
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
  tree = $AssetTree.addAssetRef(tree, siteContentsAsset.name, folderId, siteContentsAsset.id)

  return { tree, assets: assetMap }
}

/**
 * Configフォルダを探すか作成する
 */
function findOrCreateConfigFolder(tree: AssetTree): { folderId: string; newTree?: AssetTree } {
  const children = $AssetTree.getChildren(tree, ROOT_NODE_ID)
  const configFolder = children.find(
    (node) => $AssetNode.isFolder(node) && node.name === 'Config'
  )

  if (configFolder) {
    return { folderId: configFolder.id }
  }

  // Configフォルダがない場合は作成
  const newTree = $AssetTree.addFolder(tree, 'Config', ROOT_NODE_ID)
  const newChildren = $AssetTree.getChildren(newTree, ROOT_NODE_ID)
  const newConfigFolder = newChildren.find(
    (node) => $AssetNode.isFolder(node) && node.name === 'Config'
  )

  return { folderId: newConfigFolder!.id, newTree }
}
