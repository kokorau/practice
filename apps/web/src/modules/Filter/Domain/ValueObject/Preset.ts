/**
 * Preset - フィルタープリセット定義
 */

import { type Adjustment, $Adjustment } from './Adjustment'
import { type Filter, $Filter } from './Filter'

/** プリセットカテゴリ */
export type PresetCategory =
  | 'film'       // フィルムエミュレーション
  | 'cinematic'  // シネマティック
  | 'vintage'    // ヴィンテージ
  | 'bw'         // モノクロ
  | 'creative'   // クリエイティブ

/** プリセット定義 */
export type Preset = {
  /** 一意のID */
  id: string
  /** 表示名 */
  name: string
  /** カテゴリ */
  category: PresetCategory
  /** 説明 (オプション) */
  description?: string
  /** Adjustment パラメータ (identityからの差分) */
  adjustment: Partial<Adjustment>
  /** Master Curve ポイント (オプション、指定しなければidentity) */
  masterPoints?: number[]
}

export const $Preset = {
  /** PresetからFilterを生成 */
  toFilter: (preset: Preset, pointCount: number = 7): Filter => {
    const base = $Filter.identity(pointCount)
    const identity = $Adjustment.identity()

    // Adjustmentをマージ
    const adjustment: Adjustment = {
      ...identity,
      ...preset.adjustment,
    }

    // Master Curveがあれば適用
    const master = preset.masterPoints
      ? { points: preset.masterPoints }
      : base.master

    return {
      ...base,
      adjustment,
      master,
    }
  },

  /** カテゴリ別にグループ化 */
  groupByCategory: (presets: Preset[]): Map<PresetCategory, Preset[]> => {
    const groups = new Map<PresetCategory, Preset[]>()

    for (const preset of presets) {
      const list = groups.get(preset.category) ?? []
      list.push(preset)
      groups.set(preset.category, list)
    }

    return groups
  },

  /** カテゴリの表示名 */
  categoryLabel: (category: PresetCategory): string => {
    const labels: Record<PresetCategory, string> = {
      film: 'Film',
      cinematic: 'Cinematic',
      vintage: 'Vintage',
      bw: 'B&W',
      creative: 'Creative',
    }
    return labels[category]
  },
}

// ========================================
// プリセット定義
// ========================================

export const PRESETS: Preset[] = [
  // --- Film Emulation ---
  {
    id: 'kodak-portra-400',
    name: 'Kodak Portra 400',
    category: 'film',
    description: '暖かいスキントーン、ウェディング・ポートレート向け',
    adjustment: {
      exposure: 0.05,
      contrast: 0.1,
      highlights: -0.15,
      shadows: 0.2,
      fade: 0.08,
      temperature: 0.1,
      vibrance: -0.1,
      toe: 0.25,
      shoulder: 0.3,
      splitShadowHue: 220,
      splitShadowAmount: 0.08,
      splitHighlightHue: 45,
      splitHighlightAmount: 0.1,
    },
  },
  {
    id: 'kodak-portra-160',
    name: 'Kodak Portra 160',
    category: 'film',
    description: '低感度、きめ細やかな粒子、スタジオ向け',
    adjustment: {
      contrast: 0.05,
      highlights: -0.1,
      shadows: 0.15,
      fade: 0.05,
      temperature: 0.08,
      vibrance: -0.05,
      toe: 0.2,
      shoulder: 0.25,
      splitShadowHue: 210,
      splitShadowAmount: 0.05,
      splitHighlightHue: 40,
      splitHighlightAmount: 0.08,
    },
  },
  {
    id: 'fuji-pro-400h',
    name: 'Fuji Pro 400H',
    category: 'film',
    description: 'クールなパステル調、ウェディング向け',
    adjustment: {
      exposure: 0.1,
      contrast: 0.05,
      highlights: -0.2,
      shadows: 0.25,
      fade: 0.1,
      temperature: -0.08,
      vibrance: -0.15,
      toe: 0.15,
      shoulder: 0.35,
      splitShadowHue: 200,
      splitShadowAmount: 0.12,
      splitHighlightHue: 180,
      splitHighlightAmount: 0.05,
      liftB: 0.05,
    },
  },
  {
    id: 'kodak-ektar-100',
    name: 'Kodak Ektar 100',
    category: 'film',
    description: '高彩度、風景向け、鮮やかな色',
    adjustment: {
      contrast: 0.2,
      highlights: -0.1,
      shadows: 0.1,
      vibrance: 0.15,
      toe: 0.3,
      shoulder: 0.2,
      temperature: 0.05,
      splitShadowHue: 230,
      splitShadowAmount: 0.05,
      splitHighlightHue: 35,
      splitHighlightAmount: 0.08,
    },
  },
  {
    id: 'fuji-velvia-50',
    name: 'Fuji Velvia 50',
    category: 'film',
    description: '超高彩度、風景向け、ドラマチック',
    adjustment: {
      contrast: 0.3,
      highlights: -0.15,
      shadows: -0.1,
      vibrance: 0.25,
      toe: 0.35,
      shoulder: 0.15,
      splitShadowHue: 240,
      splitShadowAmount: 0.08,
      splitHighlightHue: 30,
      splitHighlightAmount: 0.1,
    },
  },
  {
    id: 'kodachrome-64',
    name: 'Kodachrome 64',
    category: 'film',
    description: 'クラシック、ビビッドでポップな色',
    adjustment: {
      contrast: 0.25,
      highlights: -0.1,
      shadows: 0.05,
      vibrance: 0.1,
      temperature: 0.12,
      toe: 0.4,
      shoulder: 0.2,
      splitShadowHue: 210,
      splitShadowAmount: 0.1,
      splitHighlightHue: 40,
      splitHighlightAmount: 0.12,
      gainR: 0.05,
    },
  },

  // --- Cinematic ---
  {
    id: 'teal-orange',
    name: 'Teal & Orange',
    category: 'cinematic',
    description: 'ハリウッド風カラーグレード',
    adjustment: {
      contrast: 0.2,
      highlights: -0.1,
      shadows: 0.1,
      toe: 0.2,
      shoulder: 0.25,
      splitShadowHue: 195,
      splitShadowAmount: 0.2,
      splitHighlightHue: 35,
      splitHighlightAmount: 0.18,
      liftB: 0.08,
      gainR: 0.08,
    },
  },
  {
    id: 'blockbuster',
    name: 'Blockbuster',
    category: 'cinematic',
    description: '映画風、高コントラスト',
    adjustment: {
      contrast: 0.35,
      highlights: -0.2,
      shadows: 0.15,
      blacks: -0.1,
      toe: 0.3,
      shoulder: 0.3,
      fade: 0.03,
      splitShadowHue: 220,
      splitShadowAmount: 0.15,
      splitHighlightHue: 40,
      splitHighlightAmount: 0.1,
    },
  },
  {
    id: 'noir',
    name: 'Film Noir',
    category: 'cinematic',
    description: 'ダーク、ミステリアス',
    adjustment: {
      contrast: 0.4,
      brightness: -0.1,
      highlights: -0.25,
      shadows: -0.1,
      blacks: -0.15,
      toe: 0.4,
      shoulder: 0.2,
      vibrance: -0.3,
      splitShadowHue: 230,
      splitShadowAmount: 0.1,
      splitHighlightHue: 50,
      splitHighlightAmount: 0.05,
    },
  },

  // --- Vintage ---
  {
    id: 'vintage-warm',
    name: 'Vintage Warm',
    category: 'vintage',
    description: '暖かみのあるレトロ調',
    adjustment: {
      contrast: 0.1,
      highlights: -0.15,
      shadows: 0.2,
      fade: 0.15,
      temperature: 0.15,
      vibrance: -0.2,
      toe: 0.2,
      shoulder: 0.35,
      splitShadowHue: 40,
      splitShadowAmount: 0.1,
      splitHighlightHue: 45,
      splitHighlightAmount: 0.15,
    },
  },
  {
    id: 'vintage-cool',
    name: 'Vintage Cool',
    category: 'vintage',
    description: 'クールなレトロ調',
    adjustment: {
      contrast: 0.1,
      highlights: -0.15,
      shadows: 0.2,
      fade: 0.15,
      temperature: -0.1,
      vibrance: -0.2,
      toe: 0.2,
      shoulder: 0.35,
      splitShadowHue: 210,
      splitShadowAmount: 0.15,
      splitHighlightHue: 200,
      splitHighlightAmount: 0.1,
    },
  },
  {
    id: 'faded-memories',
    name: 'Faded Memories',
    category: 'vintage',
    description: '色褪せた思い出風',
    adjustment: {
      contrast: -0.1,
      highlights: -0.2,
      shadows: 0.3,
      fade: 0.25,
      vibrance: -0.35,
      toe: 0.1,
      shoulder: 0.4,
      temperature: 0.05,
      splitShadowHue: 220,
      splitShadowAmount: 0.08,
      splitHighlightHue: 45,
      splitHighlightAmount: 0.1,
    },
  },

  // --- B&W ---
  {
    id: 'bw-classic',
    name: 'B&W Classic',
    category: 'bw',
    description: 'クラシックなモノクロ',
    adjustment: {
      vibrance: -1,
      contrast: 0.2,
      highlights: -0.1,
      shadows: 0.1,
      toe: 0.25,
      shoulder: 0.2,
    },
  },
  {
    id: 'bw-high-contrast',
    name: 'B&W High Contrast',
    category: 'bw',
    description: '高コントラストモノクロ',
    adjustment: {
      vibrance: -1,
      contrast: 0.5,
      highlights: -0.15,
      shadows: -0.1,
      blacks: -0.1,
      toe: 0.4,
      shoulder: 0.15,
      clarity: 0.2,
    },
  },
  {
    id: 'bw-soft',
    name: 'B&W Soft',
    category: 'bw',
    description: 'ソフトなモノクロ、ポートレート向け',
    adjustment: {
      vibrance: -1,
      contrast: 0.05,
      highlights: -0.2,
      shadows: 0.25,
      fade: 0.1,
      toe: 0.15,
      shoulder: 0.35,
      clarity: -0.1,
    },
  },

  // --- Creative ---
  {
    id: 'dreamy',
    name: 'Dreamy',
    category: 'creative',
    description: '夢見心地、ソフト',
    adjustment: {
      contrast: -0.15,
      highlights: -0.25,
      shadows: 0.3,
      fade: 0.2,
      vibrance: -0.1,
      clarity: -0.3,
      shoulder: 0.4,
      splitHighlightHue: 300,
      splitHighlightAmount: 0.1,
    },
  },
  {
    id: 'cross-process',
    name: 'Cross Process',
    category: 'creative',
    description: 'クロスプロセス風',
    adjustment: {
      contrast: 0.25,
      highlights: -0.1,
      shadows: 0.15,
      toe: 0.3,
      shoulder: 0.25,
      splitShadowHue: 180,
      splitShadowAmount: 0.2,
      splitHighlightHue: 60,
      splitHighlightAmount: 0.15,
      liftB: 0.1,
      gainR: 0.1,
      gainG: -0.05,
    },
  },
  {
    id: 'punch',
    name: 'Punch',
    category: 'creative',
    description: '力強い、インパクト重視',
    adjustment: {
      contrast: 0.35,
      clarity: 0.25,
      vibrance: 0.2,
      highlights: -0.15,
      shadows: 0.2,
      toe: 0.35,
      shoulder: 0.15,
    },
  },
]
