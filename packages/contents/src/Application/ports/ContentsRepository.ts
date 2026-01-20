/**
 * ContentsRepository - コンテンツデータへのアクセスを抽象化
 *
 * Observer pattern によるリアクティブな状態管理をサポート
 */

import type { Contents, ContentValue } from '../../Domain/ValueObject/Contents'

export type ContentsSubscriber = (contents: Contents) => void
export type ContentsUnsubscribe = () => void

export interface ContentsRepository {
  /** 現在のContentsを取得 */
  get(): Contents

  /** Contentsを設定 */
  set(contents: Contents): void

  /** Contents変更を購読 */
  subscribe(subscriber: ContentsSubscriber): ContentsUnsubscribe

  // ============================================================================
  // Path-based Operations
  // ============================================================================

  /** パスでコンテンツを取得 */
  getByPath(path: string): ContentValue | undefined

  /** パスでコンテンツを設定 */
  setByPath(path: string, value: ContentValue): void
}
