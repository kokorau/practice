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

/** Foundation Oklch カラー値 */
export type FoundationOklch = {
  readonly L: number           // 0-1 (Lightness)
  readonly C: number           // 0-0.4 (Chroma)
  readonly H: number           // 0-360 (Hue)
  readonly hueLinkedToBrand?: boolean  // If true, H follows brand hue
}

/** サイト設定 */
export type SiteConfig = {
  /** ブランドカラー (HSV) */
  readonly brandHSV: HSV
  /** ファンデーション Oklch 値 */
  readonly foundationOklch?: FoundationOklch
  /** @deprecated ファンデーションプリセット ID (後方互換用) */
  readonly foundationId?: string
  /** デザイントークンプリセット ID */
  readonly tokensId: string
}

/** SiteConfig の固定 AssetId */
export const SITE_CONFIG_ASSET_ID = 'site-config' as AssetId

/** SiteConfig のファイル名 */
export const SITE_CONFIG_FILENAME = 'site-config.json'

/** デフォルトの SiteConfig */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  brandHSV: {
    hue: 210,
    saturation: 80,
    value: 70,
  },
  foundationOklch: {
    L: 0.955,
    C: 0,
    H: 0,
    hueLinkedToBrand: false,
  },
  tokensId: 'default',
}

export const $SiteConfig = {
  /** SiteConfig を作成 */
  create: (partial?: Partial<SiteConfig>): SiteConfig => ({
    ...DEFAULT_SITE_CONFIG,
    ...partial,
  }),

  /** JSON 文字列からパース */
  fromJSON: (json: string): SiteConfig => {
    try {
      const parsed = JSON.parse(json)
      return $SiteConfig.create(parsed)
    } catch {
      return DEFAULT_SITE_CONFIG
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

  /** foundationOklch を更新 */
  updateFoundationOklch: (config: SiteConfig, foundationOklch: FoundationOklch): SiteConfig => ({
    ...config,
    foundationOklch,
    foundationId: undefined, // Clear deprecated field
  }),

  /** tokensId を更新 */
  updateTokensId: (config: SiteConfig, tokensId: string): SiteConfig => ({
    ...config,
    tokensId,
  }),
}
