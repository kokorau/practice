/**
 * HeroViewRepository Port
 *
 * HeroViewConfigの状態管理を抽象化するインターフェース
 * - InMemory実装: 開発中のリアクティブ状態管理
 * - LocalStorage実装: 将来の永続化対応
 */

import type { HeroViewConfig } from '../../Domain/HeroViewConfig'

/**
 * Subscribe callback type
 */
export type HeroViewSubscriber = (config: HeroViewConfig) => void

/**
 * Unsubscribe function type
 */
export type HeroViewUnsubscribe = () => void

/**
 * HeroViewConfigのリポジトリインターフェース
 */
export interface HeroViewRepository {
  /**
   * 現在のHeroViewConfigを取得
   */
  get(): HeroViewConfig

  /**
   * HeroViewConfigを更新
   * @param config 新しい設定
   */
  set(config: HeroViewConfig): void

  /**
   * 設定変更を購読
   * @param subscriber 変更時に呼び出されるコールバック
   * @returns 購読解除関数
   */
  subscribe(subscriber: HeroViewSubscriber): HeroViewUnsubscribe
}
