/**
 * MoveLayer UseCase
 *
 * レイヤーをドラッグ&ドロップで移動する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { LayerDropPosition } from '../../Domain/LayerTreeOps'

/**
 * レイヤーを移動する
 *
 * @param layerId - 移動するレイヤーのID
 * @param position - 移動先の位置
 * @param repository - HeroViewRepository
 */
export function moveLayer(
  layerId: string,
  position: LayerDropPosition,
  repository: HeroViewRepository
): void {
  repository.moveLayer(layerId, position)
}
