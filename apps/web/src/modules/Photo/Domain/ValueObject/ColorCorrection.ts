import type { HistogramStats } from './HistogramStats'

/**
 * 画像から推定された色調補正パラメータ
 */
export type ColorGradingEstimate = {
  /** RGB各チャンネルの平均からのずれ (-128 〜 +128) */
  colorCast: {
    r: number
    g: number
    b: number
  }
  /** 輝度の中心(128)からのずれ (-128 〜 +128) */
  brightnessOffset: number
  /** コントラスト推定 (0 〜 1, ハイライト - シャドウ比率) */
  contrastEstimate: number
}

/**
 * ノーマライズに必要な補正パラメータ（フィルター適用用）
 */
export type NormalizationParams = {
  /** 色温度補正 (-1 〜 +1) */
  temperature: number
  /** ティント補正 (-1 〜 +1) */
  tint: number
  /** 明るさ補正 (-1 〜 +1) */
  brightness: number
  /** コントラスト補正 (-1 〜 +1) */
  contrast: number
}

export const $ColorCorrection = {
  /**
   * ヒストグラム統計から色調補正を推定
   */
  estimateFromStats: (stats: HistogramStats): ColorGradingEstimate => {
    const avgR = stats.r.mean
    const avgG = stats.g.mean
    const avgB = stats.b.mean
    const avgAll = (avgR + avgG + avgB) / 3

    return {
      colorCast: {
        r: avgR - avgAll,
        g: avgG - avgAll,
        b: avgB - avgAll,
      },
      brightnessOffset: stats.luminance.mean - 128,
      contrastEstimate: stats.luminance.highlights - stats.luminance.shadows,
    }
  },

  /**
   * 推定された補正からノーマライズパラメータを計算
   * 検出された補正の逆方向に補正をかける
   */
  toNormalizationParams: (estimate: ColorGradingEstimate): NormalizationParams => {
    // 色被りからtemperature/tintを推定
    // R-B差 → temperature (暖色寄り/寒色寄り)
    // G - (R+B)/2 → tint (緑寄り/マゼンタ寄り)
    const tempBias = (estimate.colorCast.r - estimate.colorCast.b) / 128
    const tintBias = (estimate.colorCast.g - (estimate.colorCast.r + estimate.colorCast.b) / 2) / 128

    // 明るさ補正（検出された明るさのずれを打ち消す）
    const brightnessCorrection = -estimate.brightnessOffset / 128

    // コントラスト補正
    // 0.5を基準に、低ければ上げる、高ければ下げる
    const idealContrast = 0.5
    const contrastCorrection = (idealContrast - estimate.contrastEstimate) * 2

    return {
      temperature: clamp(-tempBias, -1, 1),
      tint: clamp(-tintBias, -1, 1),
      brightness: clamp(brightnessCorrection, -1, 1),
      contrast: clamp(contrastCorrection, -1, 1),
    }
  },
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))
