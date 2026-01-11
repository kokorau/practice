/**
 * ToggleVisibility UseCase
 *
 * レイヤーの表示/非表示状態を切り替える
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

/**
 * レイヤーの表示/非表示状態を切り替える
 *
 * @param layerId - 対象レイヤーのID
 * @param repository - HeroViewRepository
 * @returns 切り替え後の表示状態、レイヤーが見つからない場合はnull
 */
export function toggleVisibility(
  layerId: string,
  repository: HeroViewRepository
): boolean | null {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)

  if (!layer) {
    return null
  }

  const newVisible = !layer.visible
  repository.updateLayer(layerId, { visible: newVisible })
  return newVisible
}
