/**
 * RemoveLayer UseCase
 *
 * レイヤーを削除する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

/**
 * レイヤーを削除する
 *
 * @param layerId - 削除するレイヤーのID
 * @param repository - HeroViewRepository
 * @returns 削除が成功した場合はtrue、レイヤーが見つからない場合はfalse
 */
export function removeLayer(
  layerId: string,
  repository: HeroViewRepository
): boolean {
  const config = repository.get()
  const layerExists = config.layers.some((l) => l.id === layerId)

  if (!layerExists) {
    return false
  }

  repository.removeLayer(layerId)
  return true
}
