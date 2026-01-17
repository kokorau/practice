/**
 * WrapLayerInGroup UseCase
 *
 * レイヤーを新しいグループで包む
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'

/**
 * レイヤーを新しいグループで包む
 *
 * @param layerId - 包むレイヤーのID
 * @param repository - HeroViewRepository
 * @param groupId - 新しいグループのID（省略時は自動生成）
 * @returns 作成されたグループのID、失敗時はnull
 */
export function wrapLayerInGroup(
  layerId: string,
  repository: HeroViewRepository,
  groupId?: string
): string | null {
  return repository.wrapLayerInGroup(layerId, groupId)
}
