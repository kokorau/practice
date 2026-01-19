/**
 * GetHeroViewPresetsUseCase
 *
 * プリセットを取得するユースケース
 */

import type { HeroViewPresetRepository } from './ports/HeroViewPresetRepository'

/**
 * プリセット取得ユースケースを作成
 * @param repository プリセットリポジトリ
 */
export const createGetHeroViewPresetsUseCase = (
  repository: HeroViewPresetRepository
) => ({
  /**
   * 全てのプリセットを取得
   */
  execute: () => repository.findAll(),

  /**
   * IDでプリセットを取得
   */
  findById: (id: string) => repository.findById(id),
})

export type GetHeroViewPresetsUseCase = ReturnType<typeof createGetHeroViewPresetsUseCase>
