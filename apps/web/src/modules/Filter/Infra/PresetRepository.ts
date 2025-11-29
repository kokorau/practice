/**
 * PresetRepository - プリセットデータの提供
 */

import type { Preset } from '../Domain'
import { $Lut3D } from '../Domain'

const PRESETS: Preset[] = [
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

  // ========================================
  // 3D LUT - Cinematic Movie Looks
  // ========================================
  {
    id: 'lut3d-matrix',
    name: 'Matrix',
    category: 'cinematic',
    description: 'マトリックス風グリーンかぶり',
    aiDescription: 'Iconic green tint inspired by The Matrix. Shifts all colors toward green/cyan while maintaining contrast. Perfect for sci-fi, cyberpunk, and dystopian aesthetics.',
    suitableFor: ['sci-fi', 'cyberpunk', 'dystopian', 'tech', 'night'],
    characteristics: ['green-tint', 'cold', 'digital', 'futuristic'],
    adjustment: {},
    lut3d: $Lut3D.colorMatrix([
      0.7, 0.3, 0.0,   // R → 70% R + 30% G
      0.1, 1.0, 0.1,   // G → 10% R + 100% G + 10% B (強調)
      0.0, 0.2, 0.6,   // B → 20% G + 60% B
    ], 17),
  },
  {
    id: 'lut3d-blade-runner',
    name: 'Blade Runner',
    category: 'cinematic',
    description: 'ブレードランナー風ティール＆オレンジ',
    aiDescription: 'Intense teal shadows with warm orange highlights. Inspired by Blade Runner 2049 cinematography. Creates futuristic noir atmosphere.',
    suitableFor: ['sci-fi', 'noir', 'urban', 'night', 'neon'],
    characteristics: ['teal-orange', 'high-contrast', 'futuristic', 'noir'],
    adjustment: {},
    lut3d: $Lut3D.multiHueShift([
      { sourceHue: 200, targetHue: 185, range: 50, strength: 0.8 },  // シアン強調
      { sourceHue: 30, targetHue: 25, range: 40, strength: 0.6 },    // オレンジ強調
      { sourceHue: 120, targetHue: 180, range: 40, strength: 0.5 },  // 緑→シアン
    ], 17),
  },
  {
    id: 'lut3d-moonlight',
    name: 'Moonlight',
    category: 'cinematic',
    description: '深いブルーシャドウ（夜間・ムード系）',
    aiDescription: 'Deep blue shadows with subtle warmth in highlights. Inspired by moonlit night scenes. Creates intimate, contemplative mood.',
    suitableFor: ['night', 'moody', 'intimate', 'drama', 'portrait'],
    characteristics: ['blue-shadows', 'intimate', 'soft', 'emotional'],
    adjustment: {},
    lut3d: $Lut3D.tritone(
      { r: 0.05, g: 0.08, b: 0.18 },  // シャドウ: ディープブルー
      { r: 0.35, g: 0.38, b: 0.45 },  // ミッド: クールグレー
      { r: 1.0, g: 0.95, b: 0.9 },    // ハイライト: ウォームホワイト
      17
    ),
  },
  {
    id: 'lut3d-wes-anderson',
    name: 'Wes Anderson',
    category: 'cinematic',
    description: 'パステル調＋暖色（ウェス・アンダーソン風）',
    aiDescription: 'Pastel colors with warm, whimsical tones. Characteristic of Wes Anderson films. Desaturated yet warm palette with pink/yellow bias.',
    suitableFor: ['whimsical', 'retro', 'quirky', 'fashion', 'interior'],
    characteristics: ['pastel', 'warm', 'whimsical', 'vintage', 'pink-yellow'],
    adjustment: {
      vibrance: -0.15,
      fade: 0.1,
    },
    lut3d: $Lut3D.multiHueShift([
      { sourceHue: 0, targetHue: 350, range: 30, strength: 0.4 },    // 赤→ピンク
      { sourceHue: 60, targetHue: 50, range: 30, strength: 0.5 },    // 黄色をマスタード寄りに
      { sourceHue: 200, targetHue: 190, range: 40, strength: 0.3 },  // 青→ティール寄り
    ], 17),
  },
  {
    id: 'lut3d-joker',
    name: 'Joker',
    category: 'cinematic',
    description: 'ダークで不穏なグリーン＋イエロー',
    aiDescription: 'Dark, unsettling color grade with sickly green-yellow tones. Inspired by gritty urban dramas. Creates sense of unease and decay.',
    suitableFor: ['drama', 'dark', 'urban', 'gritty', 'psychological'],
    characteristics: ['green-yellow', 'dark', 'gritty', 'unsettling'],
    adjustment: {
      contrast: 0.15,
      shadows: -0.1,
    },
    lut3d: $Lut3D.colorMatrix([
      0.9, 0.15, 0.0,   // R: 若干緑を混ぜる
      0.05, 0.95, 0.1,  // G: 青を少し混ぜる
      0.0, 0.1, 0.7,    // B: 彩度落とす
    ], 17),
  },
  {
    id: 'lut3d-mad-max',
    name: 'Mad Max',
    category: 'cinematic',
    description: '砂漠・オレンジティール極端版',
    aiDescription: 'Extreme orange and teal contrast. Desert wasteland aesthetic inspired by Mad Max. Pushes warm and cool tones to extremes.',
    suitableFor: ['action', 'desert', 'apocalyptic', 'intense', 'outdoor'],
    characteristics: ['extreme-contrast', 'orange-teal', 'harsh', 'apocalyptic'],
    adjustment: {
      contrast: 0.25,
    },
    lut3d: $Lut3D.multiHueShift([
      { sourceHue: 30, targetHue: 25, range: 50, strength: 1.0 },    // オレンジ強調
      { sourceHue: 200, targetHue: 190, range: 50, strength: 1.0 },  // ティール強調
      { sourceHue: 120, targetHue: 25, range: 40, strength: 0.7 },   // 緑→オレンジ
    ], 17),
  },

  // ========================================
  // 3D LUT - Time of Day / Season
  // ========================================
  {
    id: 'lut3d-golden-hour',
    name: 'Golden Hour',
    category: 'film',
    description: 'ゴールデンアワーの暖かい光',
    aiDescription: 'Warm, golden light of sunset/sunrise. Orange-pink tones throughout with lifted shadows. Creates romantic, nostalgic atmosphere.',
    suitableFor: ['sunset', 'sunrise', 'outdoor', 'portrait', 'romantic'],
    characteristics: ['warm', 'golden', 'soft', 'romantic', 'orange-pink'],
    adjustment: {},
    lut3d: $Lut3D.tritone(
      { r: 0.15, g: 0.08, b: 0.05 },  // シャドウ: ウォームブラウン
      { r: 0.7, g: 0.45, b: 0.3 },    // ミッド: オレンジ
      { r: 1.0, g: 0.9, b: 0.75 },    // ハイライト: ウォームホワイト
      17
    ),
  },
  {
    id: 'lut3d-blue-hour',
    name: 'Blue Hour',
    category: 'film',
    description: 'ブルーアワー（日没後の青い時間帯）',
    aiDescription: 'Cool blue tones of twilight. Deep blue shadows with subtle magenta in highlights. Creates contemplative, ethereal mood.',
    suitableFor: ['twilight', 'evening', 'urban', 'landscape', 'moody'],
    characteristics: ['cool', 'blue', 'twilight', 'ethereal', 'magenta-hints'],
    adjustment: {},
    lut3d: $Lut3D.tritone(
      { r: 0.05, g: 0.1, b: 0.2 },    // シャドウ: ディープブルー
      { r: 0.3, g: 0.35, b: 0.5 },    // ミッド: クールブルー
      { r: 0.9, g: 0.85, b: 0.95 },   // ハイライト: 薄いマゼンタ
      17
    ),
  },
  {
    id: 'lut3d-winter-cold',
    name: 'Winter Cold',
    category: 'film',
    description: '冬の冷たい空気感',
    aiDescription: 'Cold, crisp winter atmosphere. Cyan-blue color cast with desaturated tones. Creates sense of cold, clean air.',
    suitableFor: ['winter', 'cold', 'snow', 'landscape', 'nordic'],
    characteristics: ['cold', 'cyan', 'desaturated', 'crisp', 'clean'],
    adjustment: {
      vibrance: -0.2,
    },
    lut3d: $Lut3D.colorTemperature(30, 17),
  },
  {
    id: 'lut3d-summer-warm',
    name: 'Summer Warm',
    category: 'film',
    description: '夏の暖かい陽射し',
    aiDescription: 'Warm, inviting summer light. Yellow-orange warmth with vibrant greens. Creates sense of lazy summer days.',
    suitableFor: ['summer', 'outdoor', 'beach', 'vacation', 'lifestyle'],
    characteristics: ['warm', 'yellow', 'vibrant', 'cheerful', 'sunny'],
    adjustment: {
      vibrance: 0.1,
    },
    lut3d: $Lut3D.colorTemperature(-25, 17),
  },
  {
    id: 'lut3d-autumn-forest',
    name: 'Autumn Forest',
    category: 'film',
    description: '紅葉の森（オレンジ＋赤強調）',
    aiDescription: 'Rich autumn colors with enhanced oranges and reds. Greens shifted toward yellow-orange. Perfect for fall foliage.',
    suitableFor: ['autumn', 'forest', 'nature', 'landscape', 'foliage'],
    characteristics: ['orange', 'red', 'warm', 'rich', 'earthy'],
    adjustment: {},
    lut3d: $Lut3D.multiHueShift([
      { sourceHue: 120, targetHue: 60, range: 50, strength: 0.6 },   // 緑→黄
      { sourceHue: 60, targetHue: 40, range: 40, strength: 0.5 },    // 黄→オレンジ
      { sourceHue: 30, targetHue: 20, range: 30, strength: 0.4 },    // オレンジ→赤オレンジ
    ], 17),
  },
  {
    id: 'lut3d-spring-fresh',
    name: 'Spring Fresh',
    category: 'film',
    description: '春の新緑（グリーン＋イエロー強調）',
    aiDescription: 'Fresh spring colors with vivid greens and soft yellows. Light, airy feel with gentle warmth. New growth and renewal.',
    suitableFor: ['spring', 'nature', 'garden', 'fresh', 'cheerful'],
    characteristics: ['green', 'yellow', 'fresh', 'light', 'vibrant'],
    adjustment: {
      vibrance: 0.15,
    },
    lut3d: $Lut3D.hueSaturation(120, 0.3, 50, 17),
  },

  // ========================================
  // 3D LUT - Duotone / Tritone (Design)
  // ========================================
  {
    id: 'lut3d-duotone-blue-orange',
    name: 'Duo: Blue/Orange',
    category: 'design',
    description: 'デュオトーン: ブルー＆オレンジ',
    aiDescription: 'Classic complementary duotone. Deep blue shadows with vibrant orange highlights. High visual impact.',
    suitableFor: ['design', 'poster', 'graphic', 'bold', 'sports'],
    characteristics: ['duotone', 'blue-orange', 'bold', 'graphic'],
    adjustment: {},
    lut3d: $Lut3D.duotone(
      { r: 0.0, g: 0.15, b: 0.4 },    // シャドウ: ディープブルー
      { r: 1.0, g: 0.6, b: 0.2 },     // ハイライト: オレンジ
      1.1,
      17
    ),
  },
  {
    id: 'lut3d-duotone-pink-cyan',
    name: 'Duo: Pink/Cyan',
    category: 'design',
    description: 'デュオトーン: ピンク＆シアン（80sレトロ）',
    aiDescription: 'Retro 80s aesthetic with hot pink and cyan. Synthwave and vaporwave vibes. Bold, nostalgic design look.',
    suitableFor: ['retro', '80s', 'synthwave', 'vaporwave', 'design'],
    characteristics: ['duotone', 'pink-cyan', 'retro', '80s', 'neon'],
    adjustment: {},
    lut3d: $Lut3D.duotone(
      { r: 0.15, g: 0.0, b: 0.25 },   // シャドウ: ディープパープル
      { r: 1.0, g: 0.4, b: 0.8 },     // ハイライト: ホットピンク
      1.0,
      17
    ),
  },
  {
    id: 'lut3d-duotone-green-purple',
    name: 'Duo: Green/Purple',
    category: 'design',
    description: 'デュオトーン: グリーン＆パープル',
    aiDescription: 'Striking complementary duotone with green shadows and purple highlights. Unique, eye-catching combination.',
    suitableFor: ['design', 'creative', 'bold', 'unique', 'experimental'],
    characteristics: ['duotone', 'green-purple', 'bold', 'unique'],
    adjustment: {},
    lut3d: $Lut3D.duotone(
      { r: 0.0, g: 0.2, b: 0.1 },     // シャドウ: ダークグリーン
      { r: 0.7, g: 0.3, b: 0.9 },     // ハイライト: パープル
      1.0,
      17
    ),
  },
  {
    id: 'lut3d-duotone-sepia',
    name: 'Duo: Sepia',
    category: 'vintage',
    description: 'セピアデュオトーン（クラシック）',
    aiDescription: 'Classic sepia tone duotone. Warm brown shadows with cream highlights. Timeless vintage photography look.',
    suitableFor: ['vintage', 'classic', 'portrait', 'nostalgic', 'old-photo'],
    characteristics: ['sepia', 'vintage', 'warm', 'classic', 'nostalgic'],
    adjustment: {},
    lut3d: $Lut3D.duotone(
      { r: 0.2, g: 0.12, b: 0.05 },   // シャドウ: ダークブラウン
      { r: 1.0, g: 0.95, b: 0.85 },   // ハイライト: クリーム
      1.0,
      17
    ),
  },
  {
    id: 'lut3d-tritone-sunset',
    name: 'Tri: Sunset',
    category: 'creative',
    description: 'トライトーン: サンセット（紫→オレンジ→黄）',
    aiDescription: 'Beautiful sunset gradient from purple shadows through orange to yellow highlights. Dramatic sky aesthetic.',
    suitableFor: ['sunset', 'dramatic', 'creative', 'sky', 'landscape'],
    characteristics: ['tritone', 'sunset', 'gradient', 'warm', 'dramatic'],
    adjustment: {},
    lut3d: $Lut3D.tritone(
      { r: 0.25, g: 0.1, b: 0.35 },   // シャドウ: パープル
      { r: 0.9, g: 0.4, b: 0.2 },     // ミッド: オレンジ
      { r: 1.0, g: 0.95, b: 0.6 },    // ハイライト: イエロー
      17
    ),
  },
  {
    id: 'lut3d-tritone-ocean',
    name: 'Tri: Ocean',
    category: 'creative',
    description: 'トライトーン: オーシャン（ディープブルー→ティール→白）',
    aiDescription: 'Ocean-inspired gradient from deep blue through teal to white foam. Cool, refreshing aquatic feel.',
    suitableFor: ['ocean', 'water', 'cool', 'fresh', 'nature'],
    characteristics: ['tritone', 'ocean', 'blue', 'teal', 'cool'],
    adjustment: {},
    lut3d: $Lut3D.tritone(
      { r: 0.02, g: 0.08, b: 0.2 },   // シャドウ: ディープオーシャン
      { r: 0.1, g: 0.5, b: 0.55 },    // ミッド: ティール
      { r: 0.95, g: 1.0, b: 1.0 },    // ハイライト: ホワイトフォーム
      17
    ),
  },
  {
    id: 'lut3d-tritone-neon',
    name: 'Tri: Neon Night',
    category: 'creative',
    description: 'トライトーン: ネオンナイト（ブルー→マゼンタ→シアン）',
    aiDescription: 'Cyberpunk neon aesthetic with electric blue, hot magenta, and cyan. Perfect for night city and electronic themes.',
    suitableFor: ['cyberpunk', 'neon', 'night', 'electronic', 'urban'],
    characteristics: ['tritone', 'neon', 'cyberpunk', 'vibrant', 'electric'],
    adjustment: {},
    lut3d: $Lut3D.tritone(
      { r: 0.05, g: 0.05, b: 0.3 },   // シャドウ: エレクトリックブルー
      { r: 0.8, g: 0.1, b: 0.6 },     // ミッド: ホットマゼンタ
      { r: 0.3, g: 0.95, b: 1.0 },    // ハイライト: シアン
      17
    ),
  },

  // ========================================
  // Web Design - Tone Adjustment
  // ========================================
  {
    id: 'web-pastel-soft',
    name: 'Pastel Soft',
    category: 'design',
    description: 'パステル調に変換（やさしい印象）',
    aiDescription: 'Converts colors to soft pastel tones. Lower saturation with raised lightness. Perfect for children-friendly, gentle, and approachable designs.',
    suitableFor: ['kids', 'gentle', 'soft', 'feminine', 'wellness'],
    characteristics: ['pastel', 'soft', 'light', 'gentle', 'approachable'],
    adjustment: {},
    lut3d: $Lut3D.pastel(0.6, 17),
  },
  {
    id: 'web-muted-calm',
    name: 'Muted Calm',
    category: 'design',
    description: 'くすみ色に（落ち着いた洗練）',
    aiDescription: 'Muted, desaturated tones for sophisticated designs. Creates calm, understated elegance. Popular in modern minimalist and Scandinavian aesthetics.',
    suitableFor: ['minimalist', 'sophisticated', 'calm', 'nordic', 'luxury'],
    characteristics: ['muted', 'desaturated', 'calm', 'sophisticated', 'understated'],
    adjustment: {},
    lut3d: $Lut3D.muted(0.6, 17),
  },
  {
    id: 'web-vivid-pop',
    name: 'Vivid Pop',
    category: 'design',
    description: 'ビビッド調に（元気・エネルギッシュ）',
    aiDescription: 'Boosts saturation for vibrant, energetic colors. Creates bold, attention-grabbing palettes. Great for youth brands, sports, and entertainment.',
    suitableFor: ['energetic', 'youth', 'sports', 'entertainment', 'bold'],
    characteristics: ['vivid', 'saturated', 'bold', 'energetic', 'vibrant'],
    adjustment: {},
    lut3d: $Lut3D.saturationAdjust(0.4, 17),
  },
  {
    id: 'web-desaturate-pro',
    name: 'Desaturate Pro',
    category: 'design',
    description: '彩度を抑えて統一感（コーポレート向け）',
    aiDescription: 'Professional desaturation for corporate designs. Creates unified, serious tone. Ideal for business, finance, and professional services.',
    suitableFor: ['corporate', 'business', 'professional', 'finance', 'legal'],
    characteristics: ['desaturated', 'professional', 'serious', 'unified', 'corporate'],
    adjustment: {},
    lut3d: $Lut3D.saturationAdjust(-0.35, 17),
  },
  {
    id: 'web-earth-tone',
    name: 'Earth Tone',
    category: 'design',
    description: 'アースカラー（ナチュラル・オーガニック）',
    aiDescription: 'Natural earth tones with browns, beiges, and olive greens. Creates organic, eco-friendly feel. Perfect for sustainable brands and natural products.',
    suitableFor: ['organic', 'eco', 'natural', 'sustainable', 'outdoor'],
    characteristics: ['earth', 'natural', 'brown', 'olive', 'organic'],
    adjustment: {},
    lut3d: $Lut3D.earthTone(0.6, 17),
  },

  // ========================================
  // Web Design - UI Mode
  // ========================================
  {
    id: 'web-dark-mode',
    name: 'Dark Mode',
    category: 'design',
    description: 'ダークモード用に変換',
    aiDescription: 'Converts light palette to dark mode suitable colors. Inverts lightness while maintaining hue and reducing saturation for eye comfort.',
    suitableFor: ['dark-ui', 'night-mode', 'app', 'dashboard', 'developer'],
    characteristics: ['dark', 'inverted', 'ui', 'comfortable', 'modern'],
    adjustment: {},
    lut3d: $Lut3D.darkMode(true, 17),
  },
  {
    id: 'web-glass-effect',
    name: 'Glass Effect',
    category: 'design',
    description: '透明感・グラスモーフィズム用',
    aiDescription: 'Soft, translucent colors for glassmorphism designs. Reduced saturation with lifted lightness creates frosted glass aesthetic.',
    suitableFor: ['glassmorphism', 'modern-ui', 'ios', 'translucent', 'overlay'],
    characteristics: ['glass', 'translucent', 'soft', 'modern', 'frosted'],
    adjustment: {},
    lut3d: $Lut3D.pastel(0.4, 17),
  },
  {
    id: 'web-soft-shadow',
    name: 'Soft Shadow',
    category: 'design',
    description: 'ニューモーフィズム用の微妙なトーン',
    aiDescription: 'Subtle, low-contrast colors for neumorphic designs. Very muted tones that work well with soft shadows and highlights.',
    suitableFor: ['neumorphism', 'soft-ui', 'subtle', 'modern', 'minimalist'],
    characteristics: ['neumorphic', 'subtle', 'low-contrast', 'soft', 'tactile'],
    adjustment: {},
    lut3d: $Lut3D.muted(0.7, 17),
  },

  // ========================================
  // Web Design - Brand / Industry
  // ========================================
  {
    id: 'web-corporate-blue',
    name: 'Corporate Blue',
    category: 'design',
    description: 'ビジネス・信頼感（青寄せ）',
    aiDescription: 'Shifts palette toward professional blue tones. Creates trust, reliability, and corporate feel. Standard for finance, tech, and business.',
    suitableFor: ['business', 'corporate', 'finance', 'trust', 'professional'],
    characteristics: ['blue', 'corporate', 'trustworthy', 'professional', 'reliable'],
    adjustment: {},
    lut3d: $Lut3D.tint(210, 0.35, 17),
  },
  {
    id: 'web-tech-purple',
    name: 'Tech Purple',
    category: 'design',
    description: 'テック・イノベーション（紫寄せ）',
    aiDescription: 'Shifts palette toward innovative purple/violet tones. Creates sense of creativity, technology, and innovation. Popular in tech startups.',
    suitableFor: ['tech', 'startup', 'innovation', 'creative', 'ai'],
    characteristics: ['purple', 'tech', 'innovative', 'creative', 'modern'],
    adjustment: {},
    lut3d: $Lut3D.tint(270, 0.35, 17),
  },
  {
    id: 'web-luxury-gold',
    name: 'Luxury Gold',
    category: 'design',
    description: '高級感・エレガント（ゴールド＋低彩度）',
    aiDescription: 'Warm gold tones with reduced saturation for luxury feel. Creates elegance, premium quality, and sophistication.',
    suitableFor: ['luxury', 'premium', 'elegant', 'jewelry', 'fashion'],
    characteristics: ['gold', 'luxury', 'elegant', 'premium', 'sophisticated'],
    adjustment: {},
    lut3d: $Lut3D.tint(45, 0.4, 17),
  },
  {
    id: 'web-eco-green',
    name: 'Eco Green',
    category: 'design',
    description: 'エコ・サステナブル（グリーン寄せ）',
    aiDescription: 'Shifts palette toward natural green tones. Creates eco-friendly, sustainable, and healthy impression. For environmental and wellness brands.',
    suitableFor: ['eco', 'sustainable', 'health', 'organic', 'environmental'],
    characteristics: ['green', 'eco', 'natural', 'healthy', 'sustainable'],
    adjustment: {},
    lut3d: $Lut3D.tint(120, 0.3, 17),
  },
  {
    id: 'web-friendly-orange',
    name: 'Friendly Orange',
    category: 'design',
    description: 'カジュアル・親しみやすさ（オレンジ寄せ）',
    aiDescription: 'Warm orange tones for friendly, approachable feel. Creates energy, enthusiasm, and accessibility. Great for food, community, and social brands.',
    suitableFor: ['friendly', 'casual', 'food', 'community', 'social'],
    characteristics: ['orange', 'warm', 'friendly', 'approachable', 'energetic'],
    adjustment: {},
    lut3d: $Lut3D.tint(30, 0.3, 17),
  },
  {
    id: 'web-healthcare-teal',
    name: 'Healthcare Teal',
    category: 'design',
    description: 'ヘルスケア・医療（ティール寄せ）',
    aiDescription: 'Clean teal tones associated with healthcare and medicine. Creates sense of cleanliness, trust, and professionalism in medical context.',
    suitableFor: ['healthcare', 'medical', 'pharmacy', 'clinic', 'wellness'],
    characteristics: ['teal', 'clean', 'medical', 'trustworthy', 'professional'],
    adjustment: {},
    lut3d: $Lut3D.tint(180, 0.35, 17),
  },

  // ========================================
  // Web Design - Trends
  // ========================================
  {
    id: 'web-neo-brutal',
    name: 'Neo Brutal',
    category: 'design',
    description: 'ネオブルータリズム（高彩度＋高コントラスト）',
    aiDescription: 'Bold, high-saturation colors for neo-brutalist design. Raw, unapologetic aesthetic with strong contrast. Trending in modern web design.',
    suitableFor: ['brutalist', 'bold', 'raw', 'modern', 'artistic'],
    characteristics: ['brutal', 'bold', 'high-contrast', 'raw', 'unapologetic'],
    adjustment: {},
    lut3d: $Lut3D.contrastAdjust(1.4, 17),
  },
  {
    id: 'web-y2k-revival',
    name: 'Y2K Revival',
    category: 'design',
    description: 'Y2K風（ピンク・シルバー・透明感）',
    aiDescription: 'Y2K aesthetic with pink, silver, and iridescent tones. Nostalgic early 2000s digital aesthetic. Futuristic yet retro.',
    suitableFor: ['y2k', 'retro', 'nostalgic', 'futuristic', 'pop'],
    characteristics: ['y2k', 'pink', 'iridescent', 'nostalgic', 'digital'],
    adjustment: {},
    lut3d: $Lut3D.tritone(
      { r: 0.6, g: 0.5, b: 0.7 },    // シャドウ: ラベンダー
      { r: 0.9, g: 0.7, b: 0.85 },   // ミッド: ピンク
      { r: 0.95, g: 0.95, b: 1.0 },  // ハイライト: シルバーホワイト
      17
    ),
  },
  {
    id: 'web-gradient-boost',
    name: 'Gradient Boost',
    category: 'design',
    description: 'グラデーション映え用（彩度+コントラスト）',
    aiDescription: 'Enhanced colors for gradient-heavy designs. Boosted saturation and slight contrast increase makes gradients more vibrant.',
    suitableFor: ['gradient', 'vibrant', 'modern', 'hero', 'background'],
    characteristics: ['gradient', 'vibrant', 'boosted', 'modern', 'colorful'],
    adjustment: {},
    lut3d: $Lut3D.saturationAdjust(0.3, 17),
  },
  {
    id: 'web-monochrome-clean',
    name: 'Monochrome Clean',
    category: 'design',
    description: 'モノクロマティック（単色系に統一）',
    aiDescription: 'Reduces palette to near-monochromatic range. Creates clean, focused, and cohesive look. Great for minimal and editorial designs.',
    suitableFor: ['minimal', 'editorial', 'clean', 'focused', 'modern'],
    characteristics: ['monochrome', 'clean', 'minimal', 'cohesive', 'focused'],
    adjustment: {},
    lut3d: $Lut3D.saturationAdjust(-0.7, 17),
  },

  // ========================================
  // Web Design - Accessibility
  // ========================================
  {
    id: 'web-high-contrast',
    name: 'High Contrast',
    category: 'design',
    description: '高コントラスト（アクセシビリティ）',
    aiDescription: 'Increased contrast for better accessibility. Helps users with low vision see content more clearly. WCAG compliance helper.',
    suitableFor: ['accessibility', 'wcag', 'low-vision', 'readable', 'inclusive'],
    characteristics: ['high-contrast', 'accessible', 'readable', 'clear', 'inclusive'],
    adjustment: {},
    lut3d: $Lut3D.contrastAdjust(1.5, 17),
  },
  {
    id: 'web-color-blind-safe',
    name: 'Color Blind Safe',
    category: 'design',
    description: '色覚多様性対応（赤緑の区別改善）',
    aiDescription: 'Adjusts colors for better red-green distinction. Helps users with protanopia and deuteranopia see differences more clearly.',
    suitableFor: ['accessibility', 'color-blind', 'inclusive', 'universal', 'readable'],
    characteristics: ['color-blind', 'accessible', 'inclusive', 'safe', 'universal'],
    adjustment: {},
    lut3d: $Lut3D.colorBlindSafe(17),
  },
  {
    id: 'web-reduced-saturation',
    name: 'Reduced Saturation',
    category: 'design',
    description: '彩度を抑えて目に優しく',
    aiDescription: 'Gentle saturation reduction for eye comfort. Reduces visual fatigue during extended viewing. Good for reading-heavy interfaces.',
    suitableFor: ['reading', 'eye-comfort', 'long-form', 'documentation', 'text-heavy'],
    characteristics: ['gentle', 'comfortable', 'reduced', 'soft', 'readable'],
    adjustment: {},
    lut3d: $Lut3D.saturationAdjust(-0.25, 17),
  },

  // ========================================
  // Retro Gaming
  // ========================================
  {
    id: 'retro-game-boy',
    name: 'Game Boy',
    category: 'creative',
    description: 'ゲームボーイ（DMG）風 4階調グリーン',
    aiDescription: 'Classic Game Boy (DMG-01) green LCD look. 4-shade green palette that defined portable gaming in 1989. Iconic retro aesthetic.',
    suitableFor: ['retro', 'gaming', '8bit', 'nostalgia', 'pixel-art'],
    characteristics: ['4-color', 'green', 'retro', 'lcd', 'gameboy'],
    adjustment: {},
    lut3d: $Lut3D.gameBoy(17),
  },
  {
    id: 'retro-game-boy-pocket',
    name: 'Game Boy Pocket',
    category: 'creative',
    description: 'ゲームボーイポケット風 4階調グレー',
    aiDescription: 'Game Boy Pocket grayscale LCD. Cleaner, higher contrast 4-shade display introduced in 1996. Sharper retro look.',
    suitableFor: ['retro', 'gaming', '8bit', 'grayscale', 'pixel-art'],
    characteristics: ['4-color', 'grayscale', 'retro', 'lcd', 'sharp'],
    adjustment: {},
    lut3d: $Lut3D.gameBoyPocket(17),
  },
  {
    id: 'retro-game-boy-color',
    name: 'Game Boy Color',
    category: 'creative',
    description: 'ゲームボーイカラー風（暖かみのある色）',
    aiDescription: 'Game Boy Color display characteristics. Warm, slightly desaturated colors with 15-bit palette. The first color portable Nintendo.',
    suitableFor: ['retro', 'gaming', '8bit', 'nostalgia', 'colorful'],
    characteristics: ['15bit', 'warm', 'retro', 'lcd', 'gbc'],
    adjustment: {},
    lut3d: $Lut3D.gameBoyColor(17),
  },
  {
    id: 'retro-gba',
    name: 'Game Boy Advance',
    category: 'creative',
    description: 'ゲームボーイアドバンス風（反射型液晶）',
    aiDescription: 'Original GBA reflective LCD look. Vibrant colors but requires external light. Characteristic of early 2000s portable gaming.',
    suitableFor: ['retro', 'gaming', '16bit', 'handheld', '2000s'],
    characteristics: ['15bit', 'reflective', 'retro', 'lcd', 'gba'],
    adjustment: {},
    lut3d: $Lut3D.gameBoyAdvance(17),
  },
  {
    id: 'retro-gba-sp',
    name: 'Game Boy Advance SP',
    category: 'creative',
    description: 'ゲームボーイアドバンスSP風（バックライト）',
    aiDescription: 'GBA SP AGS-101 backlit screen. Bright, vivid colors with excellent contrast. The best classic GBA display experience.',
    suitableFor: ['retro', 'gaming', '16bit', 'handheld', 'vivid'],
    characteristics: ['15bit', 'backlit', 'vivid', 'lcd', 'sp'],
    adjustment: {},
    lut3d: $Lut3D.gameBoyAdvanceSP(17),
  },
]

/** プリセット一覧を取得 */
export const getPresets = (): Preset[] => PRESETS
