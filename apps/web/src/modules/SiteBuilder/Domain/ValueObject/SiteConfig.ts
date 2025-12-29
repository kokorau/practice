/**
 * SiteConfig - サイトビルダーの設定
 *
 * ブランドカラー(HSV)、ファンデーション、デザイントークンの選択状態を管理
 */

import type { AssetId } from '../../../Asset'

/** HSV カラー値 */
export type HSV = {
  readonly hue: number        // 0-360
  readonly saturation: number // 0-100
  readonly value: number      // 0-100
}

/** サイト設定 */
export type SiteConfig = {
  /** ブランドカラー (HSV) */
  readonly brandHSV: HSV
  /** ファンデーションプリセット ID */
  readonly foundationId: string
  /** デザイントークンプリセット ID */
  readonly tokensId: string
}

/** SiteConfig の固定 AssetId */
export const SITE_CONFIG_ASSET_ID = 'site-config' as AssetId

/** SiteConfig のファイル名 */
export const SITE_CONFIG_FILENAME = 'site-config.json'

export const $SiteConfig = {
  /** SiteConfig を作成（デフォルト値とマージ） */
  create: (defaults: SiteConfig, partial?: Partial<SiteConfig>): SiteConfig => ({
    ...defaults,
    ...partial,
  }),

  /** JSON 文字列からパース（失敗時はデフォルト値を返す） */
  fromJSON: (json: string, defaults: SiteConfig): SiteConfig => {
    try {
      const parsed = JSON.parse(json)
      return $SiteConfig.create(defaults, parsed)
    } catch {
      return defaults
    }
  },

  /** JSON 文字列にシリアライズ */
  toJSON: (config: SiteConfig): string => {
    return JSON.stringify(config, null, 2)
  },

  /** brandHSV を更新 */
  updateBrandHSV: (config: SiteConfig, hsv: Partial<HSV>): SiteConfig => ({
    ...config,
    brandHSV: { ...config.brandHSV, ...hsv },
  }),

  /** foundationId を更新 */
  updateFoundationId: (config: SiteConfig, foundationId: string): SiteConfig => ({
    ...config,
    foundationId,
  }),

  /** tokensId を更新 */
  updateTokensId: (config: SiteConfig, tokensId: string): SiteConfig => ({
    ...config,
    tokensId,
  }),
}
