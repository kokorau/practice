/**
 * StyleConfig - サイトのスタイル設定
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
  stylePackId: string
}

export const $StyleConfig = {
  create(stylePackId: string): StyleConfig {
    return { stylePackId }
  },

  default(): StyleConfig {
    return { stylePackId: 'default' }
  },
}
