/**
 * HeroViewInMemoryRepository
 *
 * インメモリでHeroViewConfigを管理するリポジトリ実装
 * - subscribe機能でリアクティブな状態管理を提供
 * - 初期値はDomain層のcreateDefaultHeroViewConfigを使用
 */

import type {
  HeroViewRepository,
  HeroViewSubscriber,
  HeroViewUnsubscribe,
} from '../Application/ports/HeroViewRepository'
import {
  type HeroViewConfig,
  createDefaultHeroViewConfig,
} from '../Domain/HeroViewConfig'

// ============================================================
// Repository Implementation
// ============================================================

/**
 * インメモリHeroViewリポジトリを作成
 *
 * @param initialConfig 初期設定（省略時はデフォルト値を使用）
 */
export const createHeroViewInMemoryRepository = (
  initialConfig?: HeroViewConfig
): HeroViewRepository => {
  // State
  let currentConfig: HeroViewConfig = initialConfig ?? createDefaultHeroViewConfig()
  const subscribers = new Set<HeroViewSubscriber>()

  // Notify all subscribers
  const notifySubscribers = (): void => {
    for (const subscriber of subscribers) {
      subscriber(currentConfig)
    }
  }

  return {
    get(): HeroViewConfig {
      return currentConfig
    },

    set(config: HeroViewConfig): void {
      currentConfig = config
      notifySubscribers()
    },

    subscribe(subscriber: HeroViewSubscriber): HeroViewUnsubscribe {
      subscribers.add(subscriber)
      // Immediately notify with current value
      subscriber(currentConfig)

      return () => {
        subscribers.delete(subscriber)
      }
    },
  }
}
