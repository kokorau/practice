/**
 * ExposureCorrection - 露出自動補正
 *
 * 中央値を目標値に「寄せる」（完全に合わせるのではなく）
 * 非線形アプローチでEV空間で処理
 */

import { $Lut1D, type Lut1D } from './Lut1D'

// ============================================
// 型定義
// ============================================

/** 画像の輝度統計（パーセンタイルベース） */
export type LuminanceStats = {
  /** 1パーセンタイル (0-1) */
  p01: number
  /** 10パーセンタイル (0-1) */
  p10: number
  /** 50パーセンタイル = 中央値 (0-1) */
  p50: number
  /** 90パーセンタイル (0-1) */
  p90: number
  /** 99パーセンタイル (0-1) */
  p99: number
  /** 黒クリップ割合 (0-1) */
  clipBlack: number
  /** 白クリップ割合 (0-1) */
  clipWhite: number
  /** ダイナミックレンジ (p90 - p10) */
  range: number
  /** 中間調比率 (Y ∈ [0.3, 0.7] の割合, 0-1) */
  midRatio: number
}

/** 画像の分類 */
export type ImageClassification = {
  /** ローキー画像か */
  isLowKey: boolean
  /** ハイキー画像か */
  isHighKey: boolean
  /** 低コントラストか */
  isLowContrast: boolean
  /** 高コントラストか */
  isHighContrast: boolean
  /** クリップが多いか */
  hasSignificantClipping: boolean
}

/** 露出補正パラメータ */
export type ExposureCorrectionParams = {
  /** 目標中央値 (0-1) - デフォルト 0.45 */
  targetY50: number
  /** 最大補正EV - デフォルト 0.7 */
  maxEV: number
  /** 適用強度 (0-1) - デフォルト 0.6 */
  strength: number
}

/** 露出補正結果 */
export type ExposureCorrectionResult = {
  /** 補正ゲイン（乗算係数） */
  gain: number
  /** EV差（補正前） */
  evDelta: number
  /** 適用されたEV差（非線形抑制後） */
  appliedEvDelta: number
  /** 実際に適用された強度 */
  effectiveStrength: number
}

// ============================================
// デフォルト値
// ============================================

const DEFAULT_PARAMS: ExposureCorrectionParams = {
  targetY50: 0.45,
  maxEV: 0.7,
  strength: 0.6,
}

// ============================================
// ExposureCorrection 操作
// ============================================

export const $ExposureCorrection = {
  /**
   * ヒストグラムから輝度統計を計算
   * @param histogram 輝度ヒストグラム (256ビン, 0-255)
   */
  computeStats: (histogram: Uint32Array): LuminanceStats => {
    const total = histogram.reduce((a, b) => a + b, 0)
    if (total === 0) {
      return {
        p01: 0,
        p10: 0,
        p50: 0.5,
        p90: 1,
        p99: 1,
        clipBlack: 0,
        clipWhite: 0,
        range: 1,
        midRatio: 0.4,
      }
    }

    // パーセンタイルを計算
    const getPercentile = (p: number): number => {
      const target = total * p
      let cumulative = 0
      for (let i = 0; i < 256; i++) {
        cumulative += histogram[i] ?? 0
        if (cumulative >= target) {
          return i / 255
        }
      }
      return 1
    }

    const p01 = getPercentile(0.01)
    const p10 = getPercentile(0.10)
    const p50 = getPercentile(0.50)
    const p90 = getPercentile(0.90)
    const p99 = getPercentile(0.99)

    const clipBlack = (histogram[0] ?? 0) / total
    const clipWhite = (histogram[255] ?? 0) / total

    // 中間調比率を計算 (Y ∈ [0.3, 0.7])
    // ビン77 (0.3*255≈77) からビン179 (0.7*255≈179) までの合計
    const midLow = Math.round(0.3 * 255)
    const midHigh = Math.round(0.7 * 255)
    let midCount = 0
    for (let i = midLow; i <= midHigh; i++) {
      midCount += histogram[i] ?? 0
    }
    const midRatio = midCount / total

    return {
      p01,
      p10,
      p50,
      p90,
      p99,
      clipBlack,
      clipWhite,
      range: p90 - p10,
      midRatio,
    }
  },

  /**
   * 画像を分類
   */
  classify: (stats: LuminanceStats): ImageClassification => {
    // ローキー: p50 < 0.25 かつ p90 < 0.55
    const isLowKey = stats.p50 < 0.25 && stats.p90 < 0.55

    // ハイキー: p50 > 0.75 かつ p10 > 0.45
    const isHighKey = stats.p50 > 0.75 && stats.p10 > 0.45

    // 低コントラスト: range < 0.25
    const isLowContrast = stats.range < 0.25

    // 高コントラスト: range > 0.75 または クリップが多い
    const isHighContrast = stats.range > 0.75 || (stats.clipBlack + stats.clipWhite) > 0.05

    // 有意なクリッピング: 5%以上
    const hasSignificantClipping = (stats.clipBlack + stats.clipWhite) > 0.05

    return {
      isLowKey,
      isHighKey,
      isLowContrast,
      isHighContrast,
      hasSignificantClipping,
    }
  },

  /**
   * 分類に基づいてパラメータを調整
   */
  adjustParams: (
    baseParams: ExposureCorrectionParams,
    classification: ImageClassification
  ): ExposureCorrectionParams => {
    let { targetY50, maxEV, strength } = baseParams

    // ローキー/ハイキーでは控えめに
    if (classification.isLowKey) {
      strength *= 0.5
      maxEV = Math.min(maxEV, 0.3) // 持ち上げすぎない
    }
    if (classification.isHighKey) {
      strength *= 0.5
      maxEV = Math.min(maxEV, 0.3) // 落としすぎない
    }

    // クリップが多いときも控えめに
    if (classification.hasSignificantClipping) {
      strength *= 0.7
    }

    return { targetY50, maxEV, strength }
  },

  /**
   * 露出補正を計算
   */
  compute: (
    stats: LuminanceStats,
    params: Partial<ExposureCorrectionParams> = {}
  ): ExposureCorrectionResult => {
    const fullParams = { ...DEFAULT_PARAMS, ...params }
    const classification = $ExposureCorrection.classify(stats)
    const adjustedParams = $ExposureCorrection.adjustParams(fullParams, classification)

    const { targetY50, maxEV, strength } = adjustedParams
    const currentY50 = stats.p50

    // ゼロ除算防止
    if (currentY50 <= 0.001) {
      return {
        gain: 1,
        evDelta: 0,
        appliedEvDelta: 0,
        effectiveStrength: strength,
      }
    }

    // Step 1: EV差を計算 (log2空間)
    const evDelta = Math.log2(targetY50 / currentY50)

    // Step 2: 非線形抑制 (tanh)
    // 小さなズレはしっかり直す、大きなズレは控えめに
    const appliedEvDelta = maxEV * Math.tanh(evDelta / maxEV)

    // Step 3: 強度を適用
    // gain = mix(1.0, exp2(appliedEvDelta), strength)
    const fullGain = Math.pow(2, appliedEvDelta)
    const gain = 1 + (fullGain - 1) * strength

    return {
      gain,
      evDelta,
      appliedEvDelta,
      effectiveStrength: strength,
    }
  },

  /**
   * 露出補正を1D LUTとして生成
   */
  toLut: (result: ExposureCorrectionResult): Lut1D => {
    const size = 256
    const r = new Float32Array(size)
    const g = new Float32Array(size)
    const b = new Float32Array(size)

    for (let i = 0; i < size; i++) {
      const normalized = i / 255
      // ゲインを適用してクランプ
      const adjusted = Math.min(1, Math.max(0, normalized * result.gain))
      r[i] = adjusted
      g[i] = adjusted
      b[i] = adjusted
    }

    return $Lut1D.create(r, g, b)
  },

  /**
   * ヒストグラムから直接LUTを生成（便利関数）
   */
  createLutFromHistogram: (
    histogram: Uint32Array,
    params: Partial<ExposureCorrectionParams> = {}
  ): { lut: Lut1D; result: ExposureCorrectionResult; stats: LuminanceStats } => {
    const stats = $ExposureCorrection.computeStats(histogram)
    const result = $ExposureCorrection.compute(stats, params)
    const lut = $ExposureCorrection.toLut(result)
    return { lut, result, stats }
  },
}
