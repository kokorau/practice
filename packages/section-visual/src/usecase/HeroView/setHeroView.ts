/**
 * SetHeroView UseCase
 *
 * HeroViewConfigを更新する
 */

import type { HeroViewConfig } from '../../Domain/HeroViewConfig'
import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'

/**
 * HeroViewConfigを更新する
 *
 * @param config - 新しいHeroViewConfig
 * @param repository - HeroViewRepository（省略時はInMemoryRepositoryを使用）
 */
export function setHeroView(
  config: HeroViewConfig,
  repository: HeroViewRepository = createHeroViewInMemoryRepository()
): void {
  repository.set(config)
}
