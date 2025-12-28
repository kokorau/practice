import type { StylePack, StylePackPreset } from '../../../StylePack/Domain/ValueObject'
import { defaultStylePack } from '../../../StylePack/Domain/ValueObject'

/**
 * StyleConfig - サイトのスタイル設定
 *
 * StylePack の実体を保持（プリセットへの参照ではなくコピー）
 *
 * 形状パラメータを管理:
 * - border-radius
 * - gap
 * - padding
 * - font-size (leading)
 *
 * ※ color, shadow は別管理（SemanticPalette, Lighting など）
 */
export type StyleConfig = {
  /** 選択元のプリセットID（参照用） */
  readonly presetId: string
  /** スタイル設定の実体 */
  readonly style: StylePack
}

export const $StyleConfig = {
  fromPreset(preset: StylePackPreset): StyleConfig {
    return {
      presetId: preset.id,
      style: { ...preset.style, font: { ...preset.style.font } },
    }
  },

  /** @deprecated Use fromPreset instead */
  create(stylePackId: string): StyleConfig {
    // Fallback for legacy usage - returns default style
    return {
      presetId: stylePackId,
      style: { ...defaultStylePack, font: { ...defaultStylePack.font } },
    }
  },

  default(): StyleConfig {
    return $StyleConfig.create('default')
  },
}
