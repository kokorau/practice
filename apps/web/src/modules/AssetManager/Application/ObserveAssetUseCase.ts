/**
 * ObserveAssetUseCase - 特定アセットの変更を監視するユースケース
 *
 * Repository の subscribe をラップし、アセットの変更を callback で通知する。
 */

import type { Asset, AssetId } from '../../Asset'
import type { AssetRepository, Unsubscribe } from '../Infra/AssetRepository'

/** 監視コールバック */
export type AssetObserver = (asset: Asset | undefined) => void

/** ObserveAssetUseCase の戻り値 */
export interface ObserveAssetResult {
  /** 現在のアセット値 */
  current: Asset | undefined
  /** 購読解除関数 */
  unsubscribe: Unsubscribe
}

/**
 * アセットを監視するユースケース
 *
 * @param repository - AssetRepository インスタンス
 * @param id - 監視対象のアセットID
 * @param observer - 変更時に呼ばれるコールバック
 * @returns 現在値と購読解除関数
 */
export function observeAssetUseCase(
  repository: AssetRepository,
  id: AssetId,
  observer: AssetObserver
): ObserveAssetResult {
  // 初期値を取得
  const current = repository.get(id)

  // 購読開始
  const unsubscribe = repository.subscribe(id, observer)

  return {
    current,
    unsubscribe,
  }
}
