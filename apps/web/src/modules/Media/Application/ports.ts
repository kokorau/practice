import type { Media } from '../Domain'

/**
 * MediaRepository - メディア状態の管理
 */
export type MediaRepository = {
  /** 現在のメディアを取得 */
  get: () => Media | null
  /** メディアを設定 */
  set: (media: Media) => void
  /** メディアをクリア */
  clear: () => void
}
