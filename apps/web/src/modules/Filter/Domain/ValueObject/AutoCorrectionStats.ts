/**
 * AutoCorrectionStats - 自動補正パイプライン用の共通解析結果
 *
 * 1画像につき1回解析し、以降は各ステージ（露出・コントラスト・WB・彩度）が
 * 同じ Stats を参照して補正量を決定する。
 *
 * 設計原則:
 * - 解析は「意味理解」ではなく、外れないための安全装置＋補正量の推定
 * - 正解を当てるのではなく、扱いやすい状態へ"弱く寄せる"ための指標を提供
 * - 計算コストは低く、結果は安定すること
 */

// ============================================
// 型定義
// ============================================

/** 輝度統計 */
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
  /** 黒クリップ割合 (Y < 0.01 の比率) */
  clipBlack: number
  /** 白クリップ割合 (Y > 0.99 の比率) */
  clipWhite: number
  /** ダイナミックレンジ (p90 - p10) */
  range: number
  /** 中間調比率 (Y ∈ [0.3, 0.7] の割合) */
  midRatio: number
}

/** 無彩色候補統計（WB用） */
export type NeutralStats = {
  /** 候補画素数 */
  count: number
  /** 候補比率 (count / totalPixels) */
  ratio: number
  /** 候補画素の RGB 中央値 [r, g, b] (0-1) */
  medianRGB: [number, number, number]
  /** 信頼度 (ratio に基づく) */
  confidence: 'high' | 'medium' | 'low' | 'none'
}

/** 彩度統計 */
export type SaturationStats = {
  /** 彩度プロキシ (max(R,G,B) - min(R,G,B)) の95パーセンタイル */
  p95Proxy: number
  /** 彩度プロキシの99パーセンタイル */
  p99Proxy: number
  /** 平均彩度プロキシ */
  meanProxy: number
}

/** 画像分類（派生値） */
export type ImageClassification = {
  /** ローキー画像か (p50 < 0.25 && p90 < 0.55) */
  isLowKey: boolean
  /** ハイキー画像か (p50 > 0.75 && p10 > 0.45) */
  isHighKey: boolean
  /** 低コントラストか (range < 0.25) */
  isLowContrast: boolean
  /** 高コントラストか (range > 0.75 || clip > 0.05) */
  isHighContrast: boolean
  /** 有意なクリッピングがあるか (clipBlack + clipWhite > 0.05) */
  hasSignificantClipping: boolean
  /** 極端なシーンか (midRatio < 0.2 || clip > 0.1) */
  isExtremeScene: boolean
}

/** 自動補正用の統合解析結果 */
export type AutoCorrectionStats = {
  /** 輝度統計 */
  luminance: LuminanceStats
  /** 無彩色候補統計（WB用） */
  neutral: NeutralStats
  /** 彩度統計 */
  saturation: SaturationStats
  /** 画像分類（派生値） */
  classification: ImageClassification
}

// ============================================
// 解析パラメータ
// ============================================

/** 解析パラメータ */
export type AnalysisParams = {
  /** 黒クリップ閾値 */
  blackClipThreshold: number
  /** 白クリップ閾値 */
  whiteClipThreshold: number
  /** 中間調の下限 */
  midLo: number
  /** 中間調の上限 */
  midHi: number
  /** 無彩色候補の輝度下限 */
  neutralYLo: number
  /** 無彩色候補の輝度上限 */
  neutralYHi: number
  /** 無彩色候補の彩度閾値 */
  neutralChromaThresh: number
}

/** デフォルト解析パラメータ */
export const DEFAULT_ANALYSIS_PARAMS: AnalysisParams = {
  blackClipThreshold: 0.01,
  whiteClipThreshold: 0.99,
  midLo: 0.30,
  midHi: 0.70,
  neutralYLo: 0.15,
  neutralYHi: 0.85,
  neutralChromaThresh: 0.08,
}

// ============================================
// 解析ロジック
// ============================================

/** ImageData 互換の入力型 */
export type ImageDataLike = {
  data: Uint8ClampedArray | number[]
  width: number
  height: number
}

export const $AutoCorrectionStats = {
  /**
   * 画像データから統合解析を実行
   * @param imageData 入力画像（RGB 8bit）
   * @param params 解析パラメータ
   */
  analyze: (
    imageData: ImageDataLike,
    params: Partial<AnalysisParams> = {}
  ): AutoCorrectionStats => {
    const fullParams = { ...DEFAULT_ANALYSIS_PARAMS, ...params }
    const { data, width, height } = imageData
    const pixelCount = width * height

    // 輝度ヒストグラム (256 bins)
    const luminanceHist = new Uint32Array(256)
    // 彩度プロキシヒストグラム (256 bins)
    const satProxyHist = new Uint32Array(256)
    // 無彩色候補の RGB 値を収集
    const neutralCandidates: { r: number; g: number; b: number }[] = []

    let midCount = 0
    let satProxySum = 0

    const midLoBin = Math.round(fullParams.midLo * 255)
    const midHiBin = Math.round(fullParams.midHi * 255)

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]! / 255
      const g = data[i + 1]! / 255
      const b = data[i + 2]! / 255

      // 輝度 (Rec.709)
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const yBin = Math.round(y * 255)
      luminanceHist[Math.min(255, Math.max(0, yBin))]++

      // 中間調カウント
      if (yBin >= midLoBin && yBin <= midHiBin) {
        midCount++
      }

      // 彩度プロキシ
      const maxRGB = Math.max(r, g, b)
      const minRGB = Math.min(r, g, b)
      const satProxy = maxRGB - minRGB
      const satProxyBin = Math.round(satProxy * 255)
      satProxyHist[Math.min(255, Math.max(0, satProxyBin))]++
      satProxySum += satProxy

      // 無彩色候補の収集
      if (
        y >= fullParams.neutralYLo &&
        y <= fullParams.neutralYHi &&
        satProxy < fullParams.neutralChromaThresh
      ) {
        neutralCandidates.push({ r, g, b })
      }
    }

    // 輝度統計を計算
    const luminance = $AutoCorrectionStats.computeLuminanceStats(
      luminanceHist,
      pixelCount,
      midCount,
      fullParams
    )

    // 無彩色候補統計を計算
    const neutral = $AutoCorrectionStats.computeNeutralStats(
      neutralCandidates,
      pixelCount
    )

    // 彩度統計を計算
    const saturation = $AutoCorrectionStats.computeSaturationStats(
      satProxyHist,
      pixelCount,
      satProxySum
    )

    // 分類を計算
    const classification = $AutoCorrectionStats.classify(luminance)

    return {
      luminance,
      neutral,
      saturation,
      classification,
    }
  },

  /**
   * 輝度ヒストグラムから統計を計算
   */
  computeLuminanceStats: (
    histogram: Uint32Array,
    total: number,
    midCount: number,
    params: AnalysisParams
  ): LuminanceStats => {
    if (total === 0) {
      return {
        p01: 0, p10: 0, p50: 0.5, p90: 1, p99: 1,
        clipBlack: 0, clipWhite: 0, range: 1, midRatio: 0.4,
      }
    }

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

    // クリップ率の計算（閾値ベース）
    const blackThreshBin = Math.round(params.blackClipThreshold * 255)
    const whiteThreshBin = Math.round(params.whiteClipThreshold * 255)
    let clipBlackCount = 0
    let clipWhiteCount = 0
    for (let i = 0; i <= blackThreshBin; i++) {
      clipBlackCount += histogram[i] ?? 0
    }
    for (let i = whiteThreshBin; i < 256; i++) {
      clipWhiteCount += histogram[i] ?? 0
    }

    return {
      p01,
      p10,
      p50,
      p90,
      p99,
      clipBlack: clipBlackCount / total,
      clipWhite: clipWhiteCount / total,
      range: p90 - p10,
      midRatio: midCount / total,
    }
  },

  /**
   * 無彩色候補から統計を計算
   */
  computeNeutralStats: (
    candidates: { r: number; g: number; b: number }[],
    totalPixels: number
  ): NeutralStats => {
    const count = candidates.length
    const ratio = count / totalPixels

    if (count === 0) {
      return {
        count: 0,
        ratio: 0,
        medianRGB: [1, 1, 1], // デフォルト: 白（補正なし）
        confidence: 'none',
      }
    }

    // 各チャンネルの中央値を計算
    const sortedR = candidates.map(c => c.r).sort((a, b) => a - b)
    const sortedG = candidates.map(c => c.g).sort((a, b) => a - b)
    const sortedB = candidates.map(c => c.b).sort((a, b) => a - b)

    const midIndex = Math.floor(count / 2)
    const medianRGB: [number, number, number] = [
      sortedR[midIndex]!,
      sortedG[midIndex]!,
      sortedB[midIndex]!,
    ]

    // 信頼度の判定
    let confidence: NeutralStats['confidence']
    if (ratio >= 0.05) {
      confidence = 'high'
    } else if (ratio >= 0.02) {
      confidence = 'medium'
    } else if (ratio >= 0.005) {
      confidence = 'low'
    } else {
      confidence = 'none'
    }

    return {
      count,
      ratio,
      medianRGB,
      confidence,
    }
  },

  /**
   * 彩度統計を計算
   */
  computeSaturationStats: (
    histogram: Uint32Array,
    total: number,
    sumProxy: number
  ): SaturationStats => {
    if (total === 0) {
      return { p95Proxy: 0, p99Proxy: 0, meanProxy: 0 }
    }

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

    return {
      p95Proxy: getPercentile(0.95),
      p99Proxy: getPercentile(0.99),
      meanProxy: sumProxy / total,
    }
  },

  /**
   * 輝度統計から画像を分類
   */
  classify: (luminance: LuminanceStats): ImageClassification => {
    const { p10, p50, p90, clipBlack, clipWhite, range, midRatio } = luminance
    const totalClip = clipBlack + clipWhite

    return {
      // ローキー: p50 < 0.25 かつ p90 < 0.55
      isLowKey: p50 < 0.25 && p90 < 0.55,
      // ハイキー: p50 > 0.75 かつ p10 > 0.45
      isHighKey: p50 > 0.75 && p10 > 0.45,
      // 低コントラスト: range < 0.25
      isLowContrast: range < 0.25,
      // 高コントラスト: range > 0.75 または クリップが多い
      isHighContrast: range > 0.75 || totalClip > 0.05,
      // 有意なクリッピング: 5%以上
      hasSignificantClipping: totalClip > 0.05,
      // 極端なシーン: 中間調が少ない または クリップが多い
      isExtremeScene: midRatio < 0.2 || totalClip > 0.1,
    }
  },

  /**
   * 輝度ヒストグラムから解析（互換用）
   * 既存の useMediaAnalysis との互換性のため
   */
  analyzeFromHistogram: (
    luminanceHistogram: Uint32Array,
    params: Partial<AnalysisParams> = {}
  ): Pick<AutoCorrectionStats, 'luminance' | 'classification'> => {
    const fullParams = { ...DEFAULT_ANALYSIS_PARAMS, ...params }
    const total = luminanceHistogram.reduce((a, b) => a + b, 0)

    // 中間調カウント
    const midLoBin = Math.round(fullParams.midLo * 255)
    const midHiBin = Math.round(fullParams.midHi * 255)
    let midCount = 0
    for (let i = midLoBin; i <= midHiBin; i++) {
      midCount += luminanceHistogram[i] ?? 0
    }

    const luminance = $AutoCorrectionStats.computeLuminanceStats(
      luminanceHistogram,
      total,
      midCount,
      fullParams
    )
    const classification = $AutoCorrectionStats.classify(luminance)

    return { luminance, classification }
  },

  /**
   * 空の Stats を生成（初期値用）
   */
  empty: (): AutoCorrectionStats => ({
    luminance: {
      p01: 0, p10: 0, p50: 0.5, p90: 1, p99: 1,
      clipBlack: 0, clipWhite: 0, range: 1, midRatio: 0.4,
    },
    neutral: {
      count: 0, ratio: 0, medianRGB: [1, 1, 1], confidence: 'none',
    },
    saturation: {
      p95Proxy: 0, p99Proxy: 0, meanProxy: 0,
    },
    classification: {
      isLowKey: false, isHighKey: false,
      isLowContrast: false, isHighContrast: false,
      hasSignificantClipping: false, isExtremeScene: false,
    },
  }),
}
