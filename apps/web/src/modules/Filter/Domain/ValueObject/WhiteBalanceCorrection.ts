/**
 * WhiteBalanceCorrection - 色かぶり正規化
 *
 * 本WB処理は「正しい色温度に合わせる」ことを目的としない。
 * 画像全体に乗っている色かぶりを弱め、後段のLUTが安定して効く状態に寄せる
 * ことを目的とする。
 *
 * 設計原則:
 * - 意図的な色（夕景・ネオン・演出光）は壊さない
 * - 補正は常に弱く、有限である
 * - 補正失敗時は「何もしない方向」に倒れる
 * - WBは差分ではなくチャネル比で扱う（G基準）
 */

import { $Lut1D, type Lut1D } from './Lut1D'
import type { NeutralStats, LuminanceStats } from './AutoCorrectionStats'

// ============================================
// 型定義
// ============================================

/** WB補正パラメータ */
export type WhiteBalanceCorrectionParams = {
  /** 基本強度 (0-1) - デフォルト 0.4 */
  strength: number
  /** ゲインの下限クランプ - デフォルト 0.90 */
  gainMin: number
  /** ゲインの上限クランプ - デフォルト 1.10 */
  gainMax: number
  /** 無彩色候補が少ない場合の閾値 - デフォルト 0.02 */
  neutralRatioMin: number
  /** 中間調が少ない場合の閾値 - デフォルト 0.20 */
  midRatioMin: number
}

/** WB補正結果 */
export type WhiteBalanceCorrectionResult = {
  /** 生のRゲイン比 (kr = m.g / m.r) */
  rawKr: number
  /** 生のBゲイン比 (kb = m.g / m.b) */
  rawKb: number
  /** クランプ後のRゲイン比 */
  clampedKr: number
  /** クランプ後のBゲイン比 */
  clampedKb: number
  /** 最終Rゲイン (identity とのブレンド後) */
  gainR: number
  /** Gゲイン (常に 1.0) */
  gainG: number
  /** 最終Bゲイン (identity とのブレンド後) */
  gainB: number
  /** 適用された強度 */
  effectiveStrength: number
  /** ガード条件が適用されたか */
  guardApplied: boolean
  /** 適用されたガードの種類リスト */
  guards: WbGuardType[]
}

/** ガードの種類 */
export type WbGuardType =
  | 'noNeutral'        // 無彩色候補がない
  | 'lowNeutralRatio'  // 無彩色候補が少ない (< 2%)
  | 'lowMidRatio'      // 中間調が少ない (< 20%)
  | 'extremeKey'       // ローキー/ハイキー (p50 < 0.25 or > 0.75)
  | 'highClipping'     // クリップが多い (> 10%)

// ============================================
// デフォルト値
// ============================================

const DEFAULT_PARAMS: WhiteBalanceCorrectionParams = {
  strength: 0.4,
  gainMin: 0.90,
  gainMax: 1.10,
  neutralRatioMin: 0.02,
  midRatioMin: 0.20,
}

// ============================================
// WhiteBalanceCorrection 操作
// ============================================

export const $WhiteBalanceCorrection = {
  /**
   * WB補正を計算
   *
   * @param neutral 無彩色候補統計
   * @param luminance 輝度統計（ガード条件に使用）
   * @param params パラメータ
   */
  compute: (
    neutral: NeutralStats,
    luminance: LuminanceStats,
    params: Partial<WhiteBalanceCorrectionParams> = {}
  ): WhiteBalanceCorrectionResult => {
    const fullParams = { ...DEFAULT_PARAMS, ...params }
    const { gainMin, gainMax, neutralRatioMin, midRatioMin } = fullParams
    let wbStrength = fullParams.strength

    const guards: WbGuardType[] = []

    // ゼロ除算防止
    const epsilon = 0.001

    // 無彩色候補がない場合は何もしない
    if (neutral.confidence === 'none' || neutral.count === 0) {
      guards.push('noNeutral')
      return {
        rawKr: 1,
        rawKb: 1,
        clampedKr: 1,
        clampedKb: 1,
        gainR: 1,
        gainG: 1,
        gainB: 1,
        effectiveStrength: 0,
        guardApplied: true,
        guards,
      }
    }

    // ガード条件の適用（累積的に強度を減衰）

    // 1. 無彩色候補不足: neutralRatio < 0.02 → strength *= 0.2
    if (neutral.ratio < neutralRatioMin) {
      wbStrength *= 0.2
      guards.push('lowNeutralRatio')
    }

    // 2. 中間調が少ない（極端構図）: midRatio < 0.20 → strength *= 0.3
    if (luminance.midRatio < midRatioMin) {
      wbStrength *= 0.3
      guards.push('lowMidRatio')
    }

    // 3. ローキー / ハイキー: p50 < 0.25 or p50 > 0.75 → strength *= 0.5
    if (luminance.p50 < 0.25 || luminance.p50 > 0.75) {
      wbStrength *= 0.5
      guards.push('extremeKey')
    }

    // 4. クリップが多い: clipBlack + clipWhite > 0.10 → strength *= 0.5
    if (luminance.clipBlack + luminance.clipWhite > 0.10) {
      wbStrength *= 0.5
      guards.push('highClipping')
    }

    // 無彩色候補の RGB 中央値からゲイン比を計算
    const [medR, medG, medB] = neutral.medianRGB

    // ゲイン比: G を基準として R と B を調整
    // kr = m.g / m.r  (kr > 1 なら赤が強い→赤を下げる)
    // kb = m.g / m.b  (kb > 1 なら青が強い→青を下げる)
    const rawKr = medG / Math.max(epsilon, medR)
    const rawKb = medG / Math.max(epsilon, medB)

    // ゲイン上限でクランプ: [0.90, 1.10]
    const clampedKr = Math.max(gainMin, Math.min(gainMax, rawKr))
    const clampedKb = Math.max(gainMin, Math.min(gainMax, rawKb))

    // 最終補正量: identity（何もしない）とのブレンド
    // kr_final = mix(1.0, kr_clamped, wbStrength)
    const gainR = 1.0 + (clampedKr - 1.0) * wbStrength
    const gainB = 1.0 + (clampedKb - 1.0) * wbStrength

    return {
      rawKr,
      rawKb,
      clampedKr,
      clampedKb,
      gainR,
      gainG: 1.0, // G は常に固定
      gainB,
      effectiveStrength: wbStrength,
      guardApplied: guards.length > 0,
      guards,
    }
  },

  /**
   * WB補正を1D LUTとして生成
   *
   * R' = R * gainR
   * G' = G (そのまま)
   * B' = B * gainB
   */
  toLut: (result: WhiteBalanceCorrectionResult): Lut1D => {
    const size = 256
    const r = new Float32Array(size)
    const g = new Float32Array(size)
    const b = new Float32Array(size)

    for (let i = 0; i < size; i++) {
      const normalized = i / 255
      // ゲインを適用してクランプ
      // HDR値（>1）もそのまま扱いたいが、LUT出力は [0,1] に制限
      r[i] = Math.min(1, Math.max(0, normalized * result.gainR))
      g[i] = Math.min(1, Math.max(0, normalized * result.gainG))
      b[i] = Math.min(1, Math.max(0, normalized * result.gainB))
    }

    return $Lut1D.create(r, g, b)
  },

  /**
   * Stats から直接 LUT を生成（便利関数）
   */
  createLutFromStats: (
    neutral: NeutralStats,
    luminance: LuminanceStats,
    params: Partial<WhiteBalanceCorrectionParams> = {}
  ): { lut: Lut1D; result: WhiteBalanceCorrectionResult } => {
    const result = $WhiteBalanceCorrection.compute(neutral, luminance, params)
    const lut = $WhiteBalanceCorrection.toLut(result)
    return { lut, result }
  },
}
