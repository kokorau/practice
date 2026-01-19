/**
 * UpdateTextLayerColor UseCase
 *
 * テキストレイヤーの色を更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

/**
 * テキストレイヤーの色を更新する
 *
 * @param layerId - 対象レイヤーのID
 * @param color - 新しい色（CSS color string）
 * @param repository - HeroViewRepository
 * @returns 更新が成功した場合はtrue、レイヤーが見つからないか型が不一致の場合はfalse
 */
export function updateTextLayerColor(
  layerId: string,
  color: string,
  repository: HeroViewRepository
): boolean {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)

  if (!layer || layer.type !== 'text') {
    return false
  }

  repository.updateLayer(layerId, { color })
  return true
}
