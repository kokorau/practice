/**
 * AutoCorrection - 統合自動補正
 *
 * 2フェーズ設計:
 * - Phase1 (Stats0): オリジナル画像から露出＋コントラストを決定
 * - Phase2 (Stats1): 露出＋コントラスト適用後からWB＋彩度を決定
 *
 * すべての補正を1つの3D LUTに統合して出力する。
 */

import { $Lut1D, type Lut1D } from './Lut1D'
import { $Lut3D, type Lut3D } from './Lut3D'
import {
  $ExposureCorrection,
  type ExposureCorrectionResult,
} from './ExposureCorrection'
import {
  $ContrastCorrection,
  type ContrastCorrectionResult,
} from './ContrastCorrection'
import {
  $WhiteBalanceCorrection,
  type WhiteBalanceCorrectionResult,
} from './WhiteBalanceCorrection'
import {
  $SaturationCorrection,
  type SaturationCorrectionResult,
} from './SaturationCorrection'
import type { NeutralStats, SaturationStats } from './AutoCorrectionStats'

// ============================================
// 型定義
// ============================================

/** ヒストグラムデータ（useMediaAnalysis からの入力） */
export type HistogramData = {
  luminance: Uint32Array
  r: Uint32Array | number[]
  g: Uint32Array | number[]
  b: Uint32Array | number[]
}

/** 自動補正の入力（Phase1 用） */
export type AutoCorrectionInput = {
  histogram: HistogramData
}

/** Phase2 用の追加入力（WB/彩度用） */
export type Phase2Input = {
  histogram: HistogramData
}

/** 統合自動補正結果 */
export type AutoCorrectionResult = {
  // Phase1 結果
  exposure: ExposureCorrectionResult
  contrast: ContrastCorrectionResult
  // Phase2 結果
  wb: WhiteBalanceCorrectionResult
  saturation: SaturationCorrectionResult
  // 統合パイプライン情報
  phase1Lut: Lut1D
  phase2Lut3D: Lut3D
}

// ============================================
// ユーティリティ
// ============================================

/** RGB ヒストグラムから中央値を計算 */
const getMedianFromHist = (hist: Uint32Array | number[]): number => {
  const total = Array.from(hist).reduce((a, b) => a + b, 0)
  if (total === 0) return 0.5
  let cumsum = 0
  for (let i = 0; i < hist.length; i++) {
    cumsum += hist[i]!
    if (cumsum >= total / 2) {
      return i / 255
    }
  }
  return 0.5
}

/** RGB ヒストグラムからパーセンタイルを計算 */
const getPercentileFromHist = (hist: Uint32Array | number[], p: number): number => {
  const total = Array.from(hist).reduce((a, b) => a + b, 0)
  if (total === 0) return 0.5
  let cumsum = 0
  for (let i = 0; i < hist.length; i++) {
    cumsum += hist[i]!
    if (cumsum >= total * p) {
      return i / 255
    }
  }
  return 0.5
}

/** RGB ヒストグラムから NeutralStats を推定 */
const estimateNeutralStats = (histogram: HistogramData): NeutralStats => {
  const medR = getMedianFromHist(histogram.r)
  const medG = getMedianFromHist(histogram.g)
  const medB = getMedianFromHist(histogram.b)

  return {
    count: 1000,
    ratio: 0.1,
    medianRGB: [medR, medG, medB],
    confidence: 'medium',
  }
}

/** RGB ヒストグラムから SaturationStats を推定 */
const estimateSaturationStats = (histogram: HistogramData): SaturationStats => {
  const r50 = getPercentileFromHist(histogram.r, 0.5)
  const g50 = getPercentileFromHist(histogram.g, 0.5)
  const b50 = getPercentileFromHist(histogram.b, 0.5)

  const r95 = getPercentileFromHist(histogram.r, 0.95)
  const g95 = getPercentileFromHist(histogram.g, 0.95)
  const b95 = getPercentileFromHist(histogram.b, 0.95)

  const r99 = getPercentileFromHist(histogram.r, 0.99)
  const g99 = getPercentileFromHist(histogram.g, 0.99)
  const b99 = getPercentileFromHist(histogram.b, 0.99)

  const sat50 = Math.max(r50, g50, b50) - Math.min(r50, g50, b50)
  const sat95 = Math.max(r95, g95, b95) - Math.min(r95, g95, b95)
  const sat99 = Math.max(r99, g99, b99) - Math.min(r99, g99, b99)

  return {
    p95Proxy: sat95,
    p99Proxy: sat99,
    meanProxy: sat50,
  }
}

// ============================================
// AutoCorrection 操作
// ============================================

export const $AutoCorrection = {
  /**
   * 統合自動補正を計算（2フェーズ）
   *
   * @param originalInput オリジナル画像の解析結果
   * @param phase2Input 露出＋コントラスト適用後の解析結果（省略時はオリジナルを使用）
   */
  compute: (
    originalInput: AutoCorrectionInput,
    phase2Input?: Phase2Input
  ): AutoCorrectionResult => {
    // ========================================
    // Phase1: 露出 + コントラスト（オリジナルから）
    // ========================================

    // 輝度統計を計算
    const stats0 = $ExposureCorrection.computeStats(originalInput.histogram.luminance)
    const classification = $ExposureCorrection.classify(stats0)

    // 露出補正
    const exposure = $ExposureCorrection.compute(stats0)
    const exposureLut = $ExposureCorrection.toLut(exposure)

    // コントラスト補正
    const contrast = $ContrastCorrection.compute(stats0, classification)
    const contrastLut = $ContrastCorrection.toLut(contrast)

    // Phase1 LUT を合成（exposure → contrast）
    const phase1Lut = $Lut1D.compose(exposureLut, contrastLut)

    // ========================================
    // Phase2: WB + 彩度（Phase1適用後から、またはオリジナルから）
    // ========================================

    // Phase2 用の入力を決定
    const phase2Histogram = phase2Input?.histogram ?? originalInput.histogram
    const stats1 = $ExposureCorrection.computeStats(phase2Histogram.luminance)

    // WB補正: NeutralStats を推定
    const neutralStats = estimateNeutralStats(phase2Histogram)
    const wb = $WhiteBalanceCorrection.compute(neutralStats, stats1)
    const wbLut = $WhiteBalanceCorrection.toLut(wb)

    // 彩度補正: SaturationStats を推定
    const saturationStats = estimateSaturationStats(phase2Histogram)
    const saturation = $SaturationCorrection.compute(saturationStats, stats1)
    const saturationLut3D = $SaturationCorrection.toLut3D(saturation, 17)

    // WB は 1D LUT なので 3D に変換してから saturation と合成
    const wbLut3D = $Lut3D.fromLut1D(wbLut, 17)
    const phase2Lut3D = $Lut3D.compose(wbLut3D, saturationLut3D)

    return {
      exposure,
      contrast,
      wb,
      saturation,
      phase1Lut,
      phase2Lut3D,
    }
  },

  /**
   * 統合自動補正を単一の 3D LUT として生成
   *
   * パイプライン: phase1 (1D) → phase2 (3D)
   */
  toLut3D: (result: AutoCorrectionResult, size: number = 17): Lut3D => {
    // Phase1 の 1D LUT を 3D に変換
    const phase1Lut3D = $Lut3D.fromLut1D(result.phase1Lut, size)

    // Phase1 → Phase2 を合成
    return $Lut3D.compose(phase1Lut3D, result.phase2Lut3D)
  },

  /**
   * オリジナルのみから統合 LUT を生成（便利関数）
   *
   * Phase2 もオリジナルの統計を使用（軽量版）
   */
  createLutFromOriginal: (
    input: AutoCorrectionInput,
    size: number = 17
  ): { lut: Lut3D; result: AutoCorrectionResult } => {
    const result = $AutoCorrection.compute(input)
    const lut = $AutoCorrection.toLut3D(result, size)
    return { lut, result }
  },

  /**
   * 2フェーズで統合 LUT を生成
   *
   * @param originalInput オリジナル画像の解析結果
   * @param phase2Input 露出＋コントラスト適用後の解析結果
   */
  createLutWithPhase2: (
    originalInput: AutoCorrectionInput,
    phase2Input: Phase2Input,
    size: number = 17
  ): { lut: Lut3D; result: AutoCorrectionResult } => {
    const result = $AutoCorrection.compute(originalInput, phase2Input)
    const lut = $AutoCorrection.toLut3D(result, size)
    return { lut, result }
  },

  /**
   * 補正の概要を取得（デバッグ/表示用）
   */
  getSummary: (result: AutoCorrectionResult): string => {
    const parts: string[] = []

    // 露出
    if (Math.abs(result.exposure.appliedEvDelta) > 0.01) {
      const sign = result.exposure.appliedEvDelta > 0 ? '+' : ''
      parts.push(`Exp: ${sign}${result.exposure.appliedEvDelta.toFixed(2)}EV`)
    }

    // コントラスト
    if (Math.abs(result.contrast.amount) > 0.001) {
      const sign = result.contrast.amount > 0 ? '+' : ''
      parts.push(`Con: ${sign}${(result.contrast.amount * 100).toFixed(1)}%`)
    }

    // WB
    if (Math.abs(result.wb.gainR - 1) > 0.01 || Math.abs(result.wb.gainB - 1) > 0.01) {
      parts.push(`WB: R${result.wb.gainR.toFixed(2)} B${result.wb.gainB.toFixed(2)}`)
    }

    // 彩度
    if (result.saturation.compressionBase > 0.01) {
      parts.push(`Sat: -${(result.saturation.compressionBase * 100).toFixed(1)}%`)
    }

    return parts.length > 0 ? parts.join(' → ') : 'No correction'
  },
}
