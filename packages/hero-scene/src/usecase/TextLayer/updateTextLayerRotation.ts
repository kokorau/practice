/**
 * UpdateTextLayerRotation UseCase
 *
 * テキストレイヤーの回転を更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

/**
 * テキストレイヤーの回転を更新する
 *
 * @param layerId - 対象レイヤーのID
 * @param rotation - 回転角度（radians）
 * @param repository - HeroViewRepository
 * @returns 更新が成功した場合はtrue、レイヤーが見つからないか型が不一致の場合はfalse
 */
export function updateTextLayerRotation(
  layerId: string,
  rotation: number,
  repository: HeroViewRepository
): boolean {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)

  if (!layer || layer.type !== 'text') {
    return false
  }

  repository.updateLayer(layerId, { rotation })
  return true
}
