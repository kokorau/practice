/**
 * UpdateTextLayerText UseCase
 *
 * テキストレイヤーのテキスト内容を更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

/**
 * テキストレイヤーのテキスト内容を更新する
 *
 * @param layerId - 対象レイヤーのID
 * @param text - 新しいテキスト内容
 * @param repository - HeroViewRepository
 * @returns 更新が成功した場合はtrue、レイヤーが見つからないか型が不一致の場合はfalse
 */
export function updateTextLayerText(
  layerId: string,
  text: string,
  repository: HeroViewRepository
): boolean {
  const config = repository.get()
  const layer = config.layers.find((l) => l.id === layerId)

  if (!layer || layer.type !== 'text') {
    return false
  }

  repository.updateLayer(layerId, { text })
  return true
}
