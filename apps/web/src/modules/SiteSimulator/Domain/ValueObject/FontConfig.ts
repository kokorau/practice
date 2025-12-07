import type { FontPreset } from '../../../Font/Domain/ValueObject'

/**
 * FontConfig - サイトのフォント設定
 *
 * FontPreset の実体を保持（プリセットへの参照ではなくコピー）
 */
export type FontConfig = {
  /** 選択元のプリセットID（参照用） */
  readonly presetId: string
  /** フォント名 */
  readonly name: string
  /** CSS font-family */
  readonly family: string
  /** フォントカテゴリ */
  readonly category: FontPreset['category']
  /** フォントソース（Google Fonts URL など） */
  readonly source: FontPreset['source']
}

export const $FontConfig = {
  fromPreset(preset: FontPreset): FontConfig {
    return {
      presetId: preset.id,
      name: preset.name,
      family: preset.family,
      category: preset.category,
      source: { ...preset.source },
    }
  },

  /** @deprecated Use fromPreset instead */
  create(fontId: string): FontConfig {
    // Fallback for legacy usage - returns Inter-like default
    return {
      presetId: fontId,
      name: 'Inter',
      family: "'Inter', sans-serif",
      category: 'sans-serif',
      source: {
        vendor: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap',
      },
    }
  },

  default(): FontConfig {
    return $FontConfig.create('inter')
  },
}
