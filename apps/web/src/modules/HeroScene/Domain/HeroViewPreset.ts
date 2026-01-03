/**
 * HeroViewPreset
 *
 * HeroViewConfigのプリセット定義
 * UIで選択可能なテンプレートを表現する
 */

import type { HeroViewConfig } from './HeroViewConfig'

/**
 * HeroViewのプリセット
 */
export interface HeroViewPreset {
  /** 一意な識別子 */
  id: string
  /** 表示名 */
  name: string
  /** サムネイル画像URL（オプション） */
  thumbnail?: string
  /** プリセットの設定値 */
  config: HeroViewConfig
}
