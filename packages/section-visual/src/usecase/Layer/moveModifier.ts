/**
 * MoveModifier UseCase
 *
 * 修飾子をドラッグ&ドロップで移動する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { ModifierDropPosition } from '../../Domain/LayerTreeOps'

/**
 * 修飾子を移動する
 *
 * @param sourceNodeId - 移動元のレイヤーID
 * @param sourceModifierIndex - 移動する修飾子のインデックス
 * @param position - 移動先の位置
 * @param repository - HeroViewRepository
 */
export function moveModifier(
  sourceNodeId: string,
  sourceModifierIndex: number,
  position: ModifierDropPosition,
  repository: HeroViewRepository
): void {
  repository.moveModifier(sourceNodeId, sourceModifierIndex, position)
}
