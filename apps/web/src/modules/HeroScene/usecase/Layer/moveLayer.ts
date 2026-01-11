/**
 * MoveLayer UseCase
 *
 * レイヤーの位置を移動する（ドラッグ&ドロップ対応）
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { DropPosition } from '../../Domain/LayerNode'

/**
 * レイヤーの位置を移動する
 *
 * @param sourceId - 移動元レイヤーのID
 * @param targetId - 移動先レイヤーのID
 * @param position - ドロップ位置（'before' | 'after' | 'into'）
 * @param repository - HeroViewRepository
 * @returns 移動が成功した場合はtrue、失敗した場合はfalse
 */
export function moveLayer(
  sourceId: string,
  targetId: string,
  position: DropPosition,
  repository: HeroViewRepository
): boolean {
  if (sourceId === targetId) {
    return false
  }

  const config = repository.get()
  const layers = config.layers

  // Find source and target indices
  const sourceIndex = layers.findIndex((l) => l.id === sourceId)
  const targetIndex = layers.findIndex((l) => l.id === targetId)

  if (sourceIndex === -1 || targetIndex === -1) {
    return false
  }

  // 'into' position is only valid for group targets
  if (position === 'into') {
    const targetLayer = layers[targetIndex]
    if (!targetLayer || targetLayer.type !== 'group') {
      return false
    }
    // For nested group handling, we would need to implement recursive operations
    // For now, handle flat layer reordering only
    return false
  }

  // Calculate new order
  const newLayers = [...layers]
  const removed = newLayers.splice(sourceIndex, 1)[0]
  if (!removed) {
    return false
  }

  // Adjust target index after removal
  let insertIndex = targetIndex
  if (sourceIndex < targetIndex) {
    insertIndex -= 1
  }

  if (position === 'after') {
    insertIndex += 1
  }

  newLayers.splice(insertIndex, 0, removed)

  // Update repository
  repository.reorderLayers(newLayers.map((l) => l.id))
  return true
}
