/**
 * FontConfig - サイトのフォント設定
 *
 * 現状は fontId のみ（サイト全体で1フォント）
 * 将来的に heading/body 分離時は型を拡張予定
 */
export type FontConfig = {
  fontId: string
}

export const $FontConfig = {
  create(fontId: string): FontConfig {
    return { fontId }
  },

  default(): FontConfig {
    return { fontId: 'inter' }
  },
}
