/**
 * SubscribeHeroView UseCase
 *
 * HeroViewConfigの変更を購読する
 */

import type { HeroViewSubscriber, HeroViewUnsubscribe, HeroViewRepository } from '../ports/HeroViewRepository'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'

/**
 * HeroViewConfigの変更を購読する
 *
 * @param subscriber - 変更時に呼び出されるコールバック
 * @param repository - HeroViewRepository（省略時はInMemoryRepositoryを使用）
 * @returns 購読解除関数
 */
export function subscribeHeroView(
  subscriber: HeroViewSubscriber,
  repository: HeroViewRepository = createHeroViewInMemoryRepository()
): HeroViewUnsubscribe {
  return repository.subscribe(subscriber)
}
