/**
 * UpdateLayer UseCase
 *
 * レイヤーの設定を部分更新する
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { LayerNodeConfig } from '../../Domain/HeroViewConfig'

/**
 * レイヤーの設定を部分更新する
 *
 * @param layerId - 対象レイヤーのID
 * @param updates - 更新するプロパティ
 * @param repository - HeroViewRepository
 * @returns 更新が成功した場合はtrue、レイヤーが見つからない場合はfalse
 */
export function updateLayer(
  layerId: string,
  updates: Partial<LayerNodeConfig>,
  repository: HeroViewRepository
): boolean {
  const config = repository.get()
  const layerExists = config.layers.some((l) => l.id === layerId)

  if (!layerExists) {
    return false
  }

  repository.updateLayer(layerId, updates)
  return true
}
