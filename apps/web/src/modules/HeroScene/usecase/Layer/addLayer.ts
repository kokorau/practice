/**
 * AddLayer UseCase
 *
 * 新しいレイヤーを追加する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { LayerNodeConfig } from '../../Domain/HeroViewConfig'

/**
 * 新しいレイヤーを追加する
 *
 * @param layer - 追加するレイヤー設定
 * @param repository - HeroViewRepository
 * @param index - 挿入位置（省略時は末尾に追加）
 * @returns 追加されたレイヤーのID
 */
export function addLayer(
  layer: LayerNodeConfig,
  repository: HeroViewRepository,
  index?: number
): string {
  repository.addLayer(layer, index)
  return layer.id
}
