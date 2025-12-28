/**
 * AssetRepository - アセットの保存・取得・監視を行うリポジトリ
 *
 * Vue非依存。メモリ上でアセットを管理し、変更を購読できる。
 */

import type { Asset, AssetId } from '../../Asset'

/** 購読解除関数 */
export type Unsubscribe = () => void

/** 購読コールバック */
export type AssetSubscriber = (asset: Asset | undefined) => void

/** AssetRepository インターフェース */
export interface AssetRepository {
  /** アセットを取得 */
  get(id: AssetId): Asset | undefined

  /** アセットを保存（存在しなければ追加、存在すれば更新） */
  set(id: AssetId, asset: Asset): void

  /** アセットを削除 */
  delete(id: AssetId): void

  /** 特定アセットの変更を購読 */
  subscribe(id: AssetId, callback: AssetSubscriber): Unsubscribe
}

/**
 * インメモリ AssetRepository の作成
 */
export function createAssetRepository(
  initialAssets: Map<AssetId, Asset> = new Map()
): AssetRepository {
  const assets = new Map<AssetId, Asset>(initialAssets)
  const subscribers = new Map<AssetId, Set<AssetSubscriber>>()

  const notify = (id: AssetId, asset: Asset | undefined): void => {
    const subs = subscribers.get(id)
    if (subs) {
      for (const callback of subs) {
        callback(asset)
      }
    }
  }

  return {
    get(id: AssetId): Asset | undefined {
      return assets.get(id)
    },

    set(id: AssetId, asset: Asset): void {
      assets.set(id, asset)
      notify(id, asset)
    },

    delete(id: AssetId): void {
      assets.delete(id)
      notify(id, undefined)
    },

    subscribe(id: AssetId, callback: AssetSubscriber): Unsubscribe {
      let subs = subscribers.get(id)
      if (!subs) {
        subs = new Set()
        subscribers.set(id, subs)
      }
      subs.add(callback)

      // 購読解除関数を返す
      return () => {
        subs!.delete(callback)
        if (subs!.size === 0) {
          subscribers.delete(id)
        }
      }
    },
  }
}
