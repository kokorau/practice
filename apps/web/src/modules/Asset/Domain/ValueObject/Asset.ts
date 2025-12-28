/**
 * Asset - アセットの集約ルート
 *
 * ファイルの実データ（source）とメタ情報（meta）を統合
 */

import type { AssetId } from './AssetId'
import { $AssetId } from './AssetId'
import type { AssetMeta, AssetMetaCreateOptions } from './AssetMeta'
import { $AssetMeta } from './AssetMeta'
import type { AssetSource } from './AssetSource'
import { $AssetSource } from './AssetSource'

/** アセット */
export type Asset = {
  /** 一意識別子 */
  readonly id: AssetId
  /** ファイル名（拡張子含む） */
  readonly name: string
  /** 実データソース */
  readonly source: AssetSource
  /** メタ情報 */
  readonly meta: AssetMeta
}

/** アセット作成オプション */
export type AssetCreateOptions = {
  id?: AssetId
  name: string
  source: AssetSource
  meta?: Partial<AssetMetaCreateOptions>
}

export const $Asset = {
  /** アセットを作成 */
  create: (options: AssetCreateOptions): Asset => {
    const source = options.source
    const blob = source.type === 'blob' ? source.blob : null

    return {
      id: options.id ?? $AssetId.generate(),
      name: options.name,
      source,
      meta: $AssetMeta.create({
        title: options.meta?.title ?? options.name,
        description: options.meta?.description ?? '',
        tags: options.meta?.tags ?? [],
        type: options.meta?.type,
        mimeType: options.meta?.mimeType ?? blob?.type ?? 'application/octet-stream',
        size: options.meta?.size ?? blob?.size ?? 0,
        custom: options.meta?.custom ?? {},
      }),
    }
  },

  /** Fileからアセットを作成 */
  fromFile: (file: File, meta?: Partial<AssetMetaCreateOptions>): Asset => {
    return $Asset.create({
      name: file.name,
      source: $AssetSource.fromFile(file),
      meta: {
        mimeType: file.type,
        size: file.size,
        ...meta,
      },
    })
  },

  /** FileSystemFileHandleからアセットを作成 */
  fromFileHandle: async (
    handle: FileSystemFileHandle,
    meta?: Partial<AssetMetaCreateOptions>
  ): Promise<Asset> => {
    const file = await handle.getFile()
    return $Asset.create({
      name: file.name,
      source: $AssetSource.fromFileHandle(handle),
      meta: {
        mimeType: file.type,
        size: file.size,
        ...meta,
      },
    })
  },

  /** メタ情報を更新 */
  updateMeta: (asset: Asset, updater: (meta: AssetMeta) => AssetMeta): Asset => ({
    ...asset,
    meta: updater(asset.meta),
  }),

  /** タイトルを更新 */
  updateTitle: (asset: Asset, title: string): Asset =>
    $Asset.updateMeta(asset, (meta) => $AssetMeta.updateTitle(meta, title)),

  /** 説明を更新 */
  updateDescription: (asset: Asset, description: string): Asset =>
    $Asset.updateMeta(asset, (meta) => $AssetMeta.updateDescription(meta, description)),

  /** タグを追加 */
  addTag: (asset: Asset, tag: string): Asset =>
    $Asset.updateMeta(asset, (meta) => $AssetMeta.addTag(meta, tag)),

  /** タグを削除 */
  removeTag: (asset: Asset, tag: string): Asset =>
    $Asset.updateMeta(asset, (meta) => $AssetMeta.removeTag(meta, tag)),

  /** Blobを取得 */
  toBlob: (asset: Asset): Promise<Blob> => $AssetSource.toBlob(asset.source),

  /** Object URLを取得 */
  toObjectUrl: (asset: Asset): Promise<string> => $AssetSource.toObjectUrl(asset.source),
}
