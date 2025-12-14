import type { ColorPalette } from './ColorPalette'
import type { Srgb } from '@practice/color'
import type { Oklch } from '@practice/color'
import { $Oklch } from '@practice/color'

/**
 * 色相オフセットの選択肢
 */
export const HueOffsetPresets = {
  same: { label: '同一色', offset: 0 },
  analogous30: { label: '類似色 +30°', offset: 30 },
  analogousN30: { label: '類似色 -30°', offset: -30 },
  triadic120: { label: 'トライアド +120°', offset: 120 },
  triadicN120: { label: 'トライアド -120°', offset: -120 },
  splitComp150: { label: '分裂補色 +150°', offset: 150 },
  splitCompN150: { label: '分裂補色 -150°', offset: -150 },
  complementary: { label: '補色', offset: 180 },
} as const

export type HueOffsetKey = keyof typeof HueOffsetPresets

/**
 * パレット生成の設定
 */
export type PaletteGeneratorConfig = {
  /** ブランドカラーの色相 (0-360) - 基準色 */
  brandHue: number
  /** プライマリーの色相オフセット */
  primaryHueOffset: HueOffsetKey
  /** セカンダリーの色相オフセット */
  secondaryHueOffset: HueOffsetKey
  /** 彩度の有効範囲 (0 to ~0.4) */
  chromaRange: {
    min: number
    max: number
  }
  /** 明度 (0.5-0.8) */
  lightness: number
  /** ダークモードかどうか */
  isDark?: boolean
}

/**
 * デフォルトの彩度範囲プリセット
 * LUT変換での使い勝手を考慮した範囲
 */
export const ChromaRangePresets = {
  /** 控えめ - LUT変換後も安定 */
  subtle: { min: 0.05, max: 0.12 },
  /** 標準 - バランスの良い範囲 */
  standard: { min: 0.08, max: 0.18 },
  /** 鮮やか - 強い印象を与える */
  vivid: { min: 0.12, max: 0.25 },
} as const

/**
 * OKLCHからSrgbへ変換（gamut clampingあり）
 */
const oklchToSrgbClamped = (oklch: Oklch): Srgb => {
  const clamped = $Oklch.clampToGamut(oklch)
  const srgb = $Oklch.toSrgb(clamped)
  return {
    r: Math.max(0, Math.min(1, srgb.r)),
    g: Math.max(0, Math.min(1, srgb.g)),
    b: Math.max(0, Math.min(1, srgb.b)),
  }
}

/**
 * 彩度を範囲内に制限
 */
const clampChroma = (chroma: number, range: { min: number; max: number }): number => {
  return Math.max(range.min, Math.min(range.max, chroma))
}

/**
 * 色相を正規化 (0-360)
 */
const normalizeHue = (hue: number): number => {
  return ((hue % 360) + 360) % 360
}

/**
 * OKLCHベースでColorPaletteを生成
 */
export const generateOklchPalette = (config: PaletteGeneratorConfig): ColorPalette => {
  const { brandHue, primaryHueOffset, secondaryHueOffset, chromaRange, lightness, isDark = false } = config

  // 各色の色相を計算
  const primaryHue = normalizeHue(brandHue + HueOffsetPresets[primaryHueOffset].offset)
  const secondaryHue = normalizeHue(brandHue + HueOffsetPresets[secondaryHueOffset].offset)

  // 各色の彩度
  const brandChroma = clampChroma(chromaRange.max * 0.9, chromaRange)
  const primaryChroma = clampChroma(chromaRange.max * 0.85, chromaRange)
  const secondaryChroma = clampChroma(chromaRange.max * 0.7, chromaRange)

  // ベース色（背景）の設定
  const baseLightness = isDark ? 0.15 : 0.97
  const baseChroma = chromaRange.min * 0.2

  // on* 色の明度（コントラスト確保）
  const getOnColorLightness = (bgLightness: number) => bgLightness > 0.5 ? 0.1 : 0.95

  // 各色を生成
  const base = oklchToSrgbClamped({ L: baseLightness, C: baseChroma, H: brandHue })
  const onBase = oklchToSrgbClamped({ L: getOnColorLightness(baseLightness), C: 0.01, H: brandHue })

  const brand = oklchToSrgbClamped({ L: lightness, C: brandChroma, H: brandHue })
  const onBrand = oklchToSrgbClamped({ L: getOnColorLightness(lightness), C: 0, H: brandHue })

  const primary = oklchToSrgbClamped({ L: lightness, C: primaryChroma, H: primaryHue })
  const onPrimary = oklchToSrgbClamped({ L: getOnColorLightness(lightness), C: 0, H: primaryHue })

  const secondaryLightness = isDark ? lightness + 0.05 : lightness - 0.05
  const secondary = oklchToSrgbClamped({ L: secondaryLightness, C: secondaryChroma, H: secondaryHue })
  const onSecondary = oklchToSrgbClamped({ L: getOnColorLightness(secondaryLightness), C: 0, H: secondaryHue })

  return {
    id: 'oklch-generated',
    name: `OKLCH Generated (Brand H:${Math.round(brandHue)})`,
    base,
    onBase,
    primary,
    onPrimary,
    secondary,
    onSecondary,
    brand,
    onBrand,
  }
}

/**
 * 設定のデフォルト値を取得
 */
export const getDefaultGeneratorConfig = (): PaletteGeneratorConfig => ({
  brandHue: 220,
  primaryHueOffset: 'same',
  secondaryHueOffset: 'splitComp150',
  chromaRange: ChromaRangePresets.standard,
  lightness: 0.6,
  isDark: false,
})

/**
 * パレットプリセット
 */
export type PalettePreset = {
  id: string
  name: string
  config: PaletteGeneratorConfig
}

export const PalettePresets: PalettePreset[] = [
  // Blue系
  {
    id: 'ocean',
    name: 'Ocean',
    config: {
      brandHue: 220,
      primaryHueOffset: 'analogous30',
      secondaryHueOffset: 'analogousN30',
      chromaRange: { min: 0.065, max: 0.145 },
      lightness: 0.55,
    },
  },
  {
    id: 'sky',
    name: 'Sky',
    config: {
      brandHue: 200,
      primaryHueOffset: 'analogous30',
      secondaryHueOffset: 'complementary',
      chromaRange: { min: 0.065, max: 0.145 },
      lightness: 0.65,
    },
  },
  // Green系
  {
    id: 'forest',
    name: 'Forest',
    config: {
      brandHue: 145,
      primaryHueOffset: 'analogousN30',
      secondaryHueOffset: 'triadic120',
      chromaRange: { min: 0.065, max: 0.145 },
      lightness: 0.55,
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    config: {
      brandHue: 165,
      primaryHueOffset: 'analogousN30',
      secondaryHueOffset: 'triadic120',
      chromaRange: { min: 0.065, max: 0.145 },
      lightness: 0.7,
    },
  },
  // Red/Orange系
  {
    id: 'sunset',
    name: 'Sunset',
    config: {
      brandHue: 25,
      primaryHueOffset: 'analogousN30',
      secondaryHueOffset: 'complementary',
      chromaRange: { min: 0.065, max: 0.16 },
      lightness: 0.6,
    },
  },
  {
    id: 'coral',
    name: 'Coral',
    config: {
      brandHue: 15,
      primaryHueOffset: 'triadic120',
      secondaryHueOffset: 'analogous30',
      chromaRange: { min: 0.065, max: 0.145 },
      lightness: 0.65,
    },
  },
  // Purple系
  {
    id: 'lavender',
    name: 'Lavender',
    config: {
      brandHue: 280,
      primaryHueOffset: 'analogous30',
      secondaryHueOffset: 'splitComp150',
      chromaRange: { min: 0.065, max: 0.145 },
      lightness: 0.65,
    },
  },
  {
    id: 'grape',
    name: 'Grape',
    config: {
      brandHue: 300,
      primaryHueOffset: 'analogousN30',
      secondaryHueOffset: 'complementary',
      chromaRange: { min: 0.065, max: 0.145 },
      lightness: 0.55,
    },
  },
  // Yellow系
  {
    id: 'honey',
    name: 'Honey',
    config: {
      brandHue: 50,
      primaryHueOffset: 'splitComp150',
      secondaryHueOffset: 'triadicN120',
      chromaRange: { min: 0.065, max: 0.145 },
      lightness: 0.7,
    },
  },
  // Neutral系
  {
    id: 'stone',
    name: 'Stone',
    config: {
      brandHue: 40,
      primaryHueOffset: 'analogous30',
      secondaryHueOffset: 'complementary',
      chromaRange: { min: 0.03, max: 0.08 },
      lightness: 0.55,
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    config: {
      brandHue: 220,
      primaryHueOffset: 'analogous30',
      secondaryHueOffset: 'analogousN30',
      chromaRange: { min: 0.02, max: 0.06 },
      lightness: 0.5,
    },
  },
  // Vibrant系
  {
    id: 'neon',
    name: 'Neon',
    config: {
      brandHue: 320,
      primaryHueOffset: 'triadic120',
      secondaryHueOffset: 'triadicN120',
      chromaRange: { min: 0.1, max: 0.175 },
      lightness: 0.65,
    },
  },
]
