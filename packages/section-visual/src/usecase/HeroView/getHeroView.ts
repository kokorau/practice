/**
 * GetHeroView UseCase
 *
 * 現在のHeroViewConfigを取得する
 */

import type { HeroViewConfig } from '../../Domain/HeroViewConfig'
import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'

/**
 * HeroViewConfigを取得する
 *
 * @param repository - HeroViewRepository（省略時はInMemoryRepositoryを使用）
 * @returns 現在のHeroViewConfig
 */
export function getHeroView(
  repository: HeroViewRepository = createHeroViewInMemoryRepository()
): HeroViewConfig {
  return repository.get()
}
