/**
 * Preset - フィルタープリセット定義
 */

import { type Adjustment, $Adjustment } from './Adjustment'
import { type Filter, $Filter } from './Filter'
import { type Lut3D, $Lut3D } from './Lut3D'

/** プリセットカテゴリ */
export type PresetCategory =
  | 'film'       // フィルムエミュレーション
  | 'cinematic'  // シネマティック
  | 'vintage'    // ヴィンテージ
  | 'bw'         // モノクロ
  | 'creative'   // クリエイティブ
  | 'design'     // デザイン (Duotone/Selective Color)

/** プリセット定義 */
export type Preset = {
  /** 一意のID */
  id: string
  /** 表示名 */
  name: string
  /** カテゴリ */
  category: PresetCategory
  /** 短い説明（UI表示用、日本語） */
  description?: string
  /** AI向け詳細説明（効果、適したシーン、特徴を含む、英語推奨） */
  aiDescription?: string
  /** 適したシーン・被写体のタグ */
  suitableFor?: string[]
  /** 色調特性タグ */
  characteristics?: string[]
  /** Adjustment パラメータ (identityからの差分) */
  adjustment: Partial<Adjustment>
  /** Master Curve ポイント (オプション、指定しなければidentity) */
  masterPoints?: number[]
  /** 3D LUT (指定した場合、1D LUTの代わりにこちらを使用) */
  lut3d?: Lut3D
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
      design: 'Design',
    }
    return labels[category]
  },

  /** AI向けプリセット情報をJSON形式で取得 */
  toAIContext: (preset: Preset): string => {
    const info = {
      id: preset.id,
      name: preset.name,
      category: preset.category,
      description: preset.aiDescription || preset.description || '',
      suitableFor: preset.suitableFor || [],
      characteristics: preset.characteristics || [],
    }
    return JSON.stringify(info, null, 2)
  },

  /** 全プリセットのAI向けサマリーを取得 */
  getAllAIContext: (presets: Preset[]): string => {
    const summary = presets.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.aiDescription || p.description || '',
      suitableFor: p.suitableFor || [],
      characteristics: p.characteristics || [],
    }))
    return JSON.stringify(summary, null, 2)
  },

  /** UI表示用の詳細情報を取得 */
  getDisplayInfo: (preset: Preset): {
    name: string
    category: string
    description: string
    suitableFor: string[]
    characteristics: string[]
  } => ({
    name: preset.name,
    category: $Preset.categoryLabel(preset.category),
    description: preset.description || '',
    suitableFor: preset.suitableFor || [],
    characteristics: preset.characteristics || [],
  }),
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
    aiDescription: 'Warm skin tones with soft contrast. Lifted shadows with orange/yellow highlights and blue shadows. Ideal for portraits, weddings, and lifestyle photography. Creates a romantic, timeless look.',
    suitableFor: ['portrait', 'wedding', 'lifestyle', 'fashion', 'people'],
    characteristics: ['warm', 'soft-contrast', 'lifted-shadows', 'natural-skin', 'film-like'],
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
    aiDescription: 'Fine grain, subtle warmth with excellent skin tone reproduction. Lower contrast than Portra 400. Best for studio portraits, beauty, and controlled lighting situations.',
    suitableFor: ['studio', 'beauty', 'portrait', 'product', 'controlled-lighting'],
    characteristics: ['fine-grain', 'subtle-warm', 'low-contrast', 'clean', 'professional'],
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
    aiDescription: 'Cool pastel tones with lifted shadows and cyan/blue color shift. Soft, dreamy aesthetic. Popular for weddings, editorial, and airy lifestyle photography.',
    suitableFor: ['wedding', 'editorial', 'lifestyle', 'bright-scenes', 'airy'],
    characteristics: ['cool', 'pastel', 'lifted-shadows', 'dreamy', 'soft', 'cyan-tint'],
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
    aiDescription: 'High saturation with punchy colors and strong contrast. Excellent for landscapes, travel, and outdoor photography. Vivid blues and greens with warm highlights.',
    suitableFor: ['landscape', 'travel', 'outdoor', 'nature', 'architecture'],
    characteristics: ['high-saturation', 'vivid', 'punchy', 'high-contrast', 'sharp'],
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
    aiDescription: 'Ultra-high saturation with deep blacks and dramatic contrast. Legendary for landscape and nature photography. Intense colors, especially reds, greens, and blues.',
    suitableFor: ['landscape', 'nature', 'sunset', 'dramatic-sky', 'macro'],
    characteristics: ['ultra-saturated', 'dramatic', 'deep-blacks', 'vivid-colors', 'intense'],
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
    aiDescription: 'Classic vintage look with warm reds and yellows. Strong contrast with a nostalgic, timeless quality. Great for street, documentary, and retro aesthetics.',
    suitableFor: ['street', 'documentary', 'retro', 'vintage', 'everyday'],
    characteristics: ['warm-red', 'vintage', 'nostalgic', 'classic', 'punchy'],
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
    aiDescription: 'Hollywood blockbuster color grade. Teal/cyan shadows with warm orange highlights. Creates cinematic separation between subjects and backgrounds. Great for action, drama, and commercial work.',
    suitableFor: ['movie', 'commercial', 'music-video', 'action', 'drama'],
    characteristics: ['cinematic', 'teal-orange', 'color-contrast', 'hollywood', 'professional'],
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
    aiDescription: 'High contrast cinematic look with crushed blacks and controlled highlights. Blue shadows with warm midtones. Ideal for dramatic scenes, trailers, and epic storytelling.',
    suitableFor: ['movie', 'trailer', 'epic', 'dramatic', 'action'],
    characteristics: ['high-contrast', 'cinematic', 'crushed-blacks', 'dramatic', 'bold'],
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
    aiDescription: 'Dark, mysterious look inspired by classic film noir. Very high contrast with desaturated colors and deep shadows. Perfect for thriller, mystery, and moody atmospheres.',
    suitableFor: ['thriller', 'mystery', 'moody', 'night', 'dramatic'],
    characteristics: ['dark', 'desaturated', 'high-contrast', 'mysterious', 'noir'],
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

  // --- 3D LUT Creative (Cross-Channel Color Mapping) ---
  {
    id: 'lut3d-red-to-cyan',
    name: 'Red → Cyan',
    category: 'creative',
    description: '赤をシアンにシフト（3D LUT）',
    adjustment: {},
    lut3d: $Lut3D.hueShift(0, 180, 40, 1, 17),
  },
  {
    id: 'lut3d-orange-to-teal',
    name: 'Orange → Teal',
    category: 'creative',
    description: 'オレンジをティールにシフト（3D LUT）',
    adjustment: {},
    lut3d: $Lut3D.hueShift(30, 180, 35, 1, 17),
  },
  {
    id: 'lut3d-boost-blue-sat',
    name: 'Blue Boost',
    category: 'creative',
    description: '青の彩度を強調（3D LUT）',
    adjustment: {},
    lut3d: $Lut3D.hueSaturation(210, 0.5, 40, 17),
  },
  {
    id: 'lut3d-boost-red-sat',
    name: 'Red Boost',
    category: 'creative',
    description: '赤の彩度を強調（3D LUT）',
    adjustment: {},
    lut3d: $Lut3D.hueSaturation(0, 0.5, 35, 17),
  },
  {
    id: 'lut3d-desaturate-green',
    name: 'Muted Greens',
    category: 'creative',
    description: '緑の彩度を落とす（3D LUT）',
    adjustment: {},
    lut3d: $Lut3D.hueSaturation(120, -0.6, 50, 17),
  },
  {
    id: 'lut3d-swap-rgb-gbr',
    name: 'RGB → GBR',
    category: 'creative',
    description: 'RGBチャンネルをGBRにスワップ（3D LUT）',
    adjustment: {},
    lut3d: $Lut3D.channelSwap(['g', 'b', 'r'], 17),
  },
  {
    id: 'lut3d-swap-rgb-brg',
    name: 'RGB → BRG',
    category: 'creative',
    description: 'RGBチャンネルをBRGにスワップ（3D LUT）',
    adjustment: {},
    lut3d: $Lut3D.channelSwap(['b', 'r', 'g'], 17),
  },

  // --- 3D LUT Practical (Skin Tone / Landscape / Color Cast Fix) ---

  // スキントーン系
  {
    id: 'lut3d-skin-protect',
    name: 'Skin Protect',
    category: 'film',
    description: '肌色を保護しつつ他の彩度を落とす（ポートレート向け）',
    adjustment: {},
    lut3d: $Lut3D.protectHue(20, 35, -0.4, 17),
  },
  {
    id: 'lut3d-skin-warm',
    name: 'Skin Warm',
    category: 'film',
    description: '肌色を少し暖かくシフト（健康的な印象に）',
    adjustment: {},
    lut3d: $Lut3D.hueShift(20, 28, 25, 0.5, 17),
  },
  {
    id: 'lut3d-skin-smooth',
    name: 'Skin Smooth',
    category: 'film',
    description: '肌色の彩度を少し落として均一化',
    adjustment: {},
    lut3d: $Lut3D.hueSaturation(20, -0.15, 30, 17),
  },

  // 風景・自然向け
  {
    id: 'lut3d-sky-enhance',
    name: 'Sky Enhance',
    category: 'film',
    description: '空のシアン〜青を自然に強調',
    adjustment: {},
    lut3d: $Lut3D.hueSaturation(200, 0.2, 45, 17),
  },
  {
    id: 'lut3d-foliage-natural',
    name: 'Foliage Natural',
    category: 'film',
    description: 'デジタルグリーンを自然な黄緑寄りに補正',
    adjustment: {},
    lut3d: $Lut3D.hueShift(120, 100, 35, 0.5, 17),
  },
  {
    id: 'lut3d-autumn-warmth',
    name: 'Autumn Warmth',
    category: 'film',
    description: '黄〜オレンジを暖かく、緑は控えめに（紅葉向け）',
    adjustment: {},
    lut3d: $Lut3D.hueSaturation(40, 0.25, 40, 17),
  },
  {
    id: 'lut3d-muted-greens',
    name: 'Neutralize Greens',
    category: 'film',
    description: '植物の緑を落ち着かせる（ポートレート背景用）',
    adjustment: {},
    lut3d: $Lut3D.hueSaturation(120, -0.35, 45, 17),
  },

  // 輝度連動
  {
    id: 'lut3d-warm-shadows',
    name: 'Warm Shadows',
    category: 'cinematic',
    description: 'シャドウを少し暖かく（冷たい印象を軽減）',
    adjustment: {},
    lut3d: $Lut3D.luminanceAdjust('shadows', 15, 0, 0.35, 17),
  },
  {
    id: 'lut3d-cool-highlights',
    name: 'Cool Highlights',
    category: 'cinematic',
    description: 'ハイライトを少しクールに（清潔感）',
    adjustment: {},
    lut3d: $Lut3D.luminanceAdjust('highlights', -10, 0, 0.35, 17),
  },
  {
    id: 'lut3d-desat-highlights',
    name: 'Soft Highlights',
    category: 'cinematic',
    description: 'ハイライトの彩度を落とす（ソフトな印象）',
    adjustment: {},
    lut3d: $Lut3D.luminanceAdjust('highlights', 0, -0.3, 0.4, 17),
  },
  {
    id: 'lut3d-vibrant-midtones',
    name: 'Vibrant Midtones',
    category: 'cinematic',
    description: '中間調の彩度を強調',
    adjustment: {},
    lut3d: $Lut3D.luminanceAdjust('midtones', 0, 0.25, 0.4, 17),
  },

  // 色かぶり補正
  {
    id: 'lut3d-fix-fluorescent',
    name: 'Fix Fluorescent',
    category: 'film',
    description: '蛍光灯のグリーンかぶりを軽減',
    adjustment: {},
    lut3d: $Lut3D.hueSaturation(100, -0.35, 45, 17),
  },

  // --- Design (Selective Color/Posterize/Hue Rotation) ---
  {
    id: 'selective-red-pop',
    name: 'Red Pop',
    category: 'design',
    description: '赤だけカラーで残す',
    adjustment: {
      selectiveColorEnabled: true,
      selectiveHue: 0,
      selectiveRange: 30,
      selectiveDesaturate: 1, // 赤以外を完全に脱色
      contrast: 0.1,
    },
  },
  {
    id: 'selective-blue-pop',
    name: 'Blue Pop',
    category: 'design',
    description: '青だけカラーで残す',
    adjustment: {
      selectiveColorEnabled: true,
      selectiveHue: 210,
      selectiveRange: 35,
      selectiveDesaturate: 1, // 青以外を完全に脱色
      contrast: 0.1,
    },
  },
  {
    id: 'selective-yellow-pop',
    name: 'Yellow Pop',
    category: 'design',
    description: '黄色だけカラーで残す',
    adjustment: {
      selectiveColorEnabled: true,
      selectiveHue: 55,
      selectiveRange: 25,
      selectiveDesaturate: 1, // 黄色以外を完全に脱色
      contrast: 0.1,
    },
  },
  {
    id: 'selective-green-pop',
    name: 'Green Pop',
    category: 'design',
    description: '緑だけカラーで残す',
    adjustment: {
      selectiveColorEnabled: true,
      selectiveHue: 120,
      selectiveRange: 40,
      selectiveDesaturate: 1, // 緑以外を完全に脱色
      contrast: 0.1,
    },
  },

  // --- Posterize ---
  {
    id: 'posterize-4',
    name: 'Poster 4',
    category: 'design',
    description: '4階調ポスター風',
    adjustment: {
      posterizeLevels: 4,
      contrast: 0.15,
    },
  },
  {
    id: 'posterize-8',
    name: 'Poster 8',
    category: 'design',
    description: '8階調ポスター風',
    adjustment: {
      posterizeLevels: 8,
      contrast: 0.1,
    },
  },
  {
    id: 'posterize-pop',
    name: 'Pop Art',
    category: 'design',
    description: 'ポップアート風（6階調+高彩度）',
    adjustment: {
      posterizeLevels: 6,
      contrast: 0.2,
      vibrance: 0.4,
    },
  },
  {
    id: 'posterize-mono',
    name: 'Poster Mono',
    category: 'design',
    description: 'モノクロポスター風',
    adjustment: {
      posterizeLevels: 5,
      vibrance: -1,
      contrast: 0.25,
    },
  },

  // --- Hue Rotation ---
  {
    id: 'hue-shift-warm',
    name: 'Warm Shift',
    category: 'design',
    description: '暖色方向にシフト',
    adjustment: {
      hueRotation: 30,
      vibrance: 0.1,
    },
  },
  {
    id: 'hue-shift-cool',
    name: 'Cool Shift',
    category: 'design',
    description: '寒色方向にシフト',
    adjustment: {
      hueRotation: -30,
      vibrance: 0.1,
    },
  },
  {
    id: 'hue-invert',
    name: 'Color Invert',
    category: 'design',
    description: '補色に反転',
    adjustment: {
      hueRotation: 180,
    },
  },
  {
    id: 'hue-psychedelic',
    name: 'Psychedelic',
    category: 'design',
    description: 'サイケデリック（90度回転+高彩度）',
    adjustment: {
      hueRotation: 90,
      vibrance: 0.5,
      contrast: 0.15,
    },
  },
]
