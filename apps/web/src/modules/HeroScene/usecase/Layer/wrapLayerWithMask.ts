/**
 * WrapLayerWithMask UseCase
 *
 * レイヤーをマスク付きグループで包む
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

/**
 * レイヤーをマスク付きグループで包む
 *
 * @param layerId - 包むレイヤーのID
 * @param repository - HeroViewRepository
 * @returns 作成されたグループのID、失敗時はnull
 */
export function wrapLayerWithMask(
  layerId: string,
  repository: HeroViewRepository
): string | null {
  return repository.wrapLayerWithMask(layerId)
}
