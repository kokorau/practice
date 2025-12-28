/**
 * ContrastCorrection - コントラスト自動正規化
 *
 * 画像の階調分布を「扱いやすい状態に寄せる」ことを目的とする。
 * ヒストグラムを揃えない、意図的なローキー/ハイキーを壊さない、
 * 補正は常に弱く・有限であること。
 *
 * 仕様:
 * - range = p90 - p10 (画像の中央80%が使用している実質的な階調幅)
 * - targetRange = 0.55 (LUTが安定して効く"素材向けレンジ"の基準点)
 * - d = targetRange - range (差分)
 * - d' = maxRange * tanh(d / maxRange) (非線形制限)
 * - amount = d' * strength (最終適用量)
 * - S字カーブで補正
 */

import { $Lut1D, type Lut1D } from './Lut1D'
import { $Curve, type Curve } from './Curve'
import type { LuminanceStats, ImageClassification } from './ExposureCorrection'

// ============================================
// 型定義
// ============================================

/** コントラスト補正パラメータ */
export type ContrastCorrectionParams = {
  /** 目標レンジ (0-1) - デフォルト 0.55 */
  targetRange: number
  /** 最大補正量 - デフォルト 0.15 */
  maxRange: number
  /** 適用強度 (0-1) - デフォルト 0.4 */
  strength: number
  /** 高コントラスト閾値 - デフォルト 0.75 */
  highContrastThreshold: number
  /** 中間調比率閾値 - デフォルト 0.2 */
  midRatioThreshold: number
}

/** コントラスト補正結果 */
export type ContrastCorrectionResult = {
  /** 生の差分 (targetRange - range) */
  delta: number
  /** 非線形制限後の差分 */
  clampedDelta: number
  /** 最終適用量 (S字カーブの強度) */
  amount: number
  /** 実際に適用された強度 */
  effectiveStrength: number
  /** ガード条件が適用されたか */
  guardApplied: boolean
  /** 適用されたガードの種類 */
  guardType: 'none' | 'highContrast' | 'lowKeyLowContrast' | 'highKey' | 'lowMidRatio'
}

// ============================================
// デフォルト値
// ============================================

const DEFAULT_PARAMS: ContrastCorrectionParams = {
  targetRange: 0.55,
  maxRange: 0.15,
  strength: 0.4,
  highContrastThreshold: 0.75,
  midRatioThreshold: 0.2,
}

// ============================================
// ContrastCorrection 操作
// ============================================

export const $ContrastCorrection = {
  /**
   * コントラスト補正を計算
   */
  compute: (
    stats: LuminanceStats,
    _classification: ImageClassification,
    params: Partial<ContrastCorrectionParams> = {}
  ): ContrastCorrectionResult => {
    const fullParams = { ...DEFAULT_PARAMS, ...params }
    const { targetRange, maxRange, highContrastThreshold, midRatioThreshold } = fullParams
    let { strength } = fullParams

    // ガード条件の適用
    let guardApplied = false
    let guardType: ContrastCorrectionResult['guardType'] = 'none'

    // 1. 高コントラスト画像: 拡張方向を禁止
    const delta = targetRange - stats.range
    if (stats.range > highContrastThreshold && delta > 0) {
      // 拡張を完全に禁止 (圧縮は許可)
      return {
        delta,
        clampedDelta: 0,
        amount: 0,
        effectiveStrength: strength,
        guardApplied: true,
        guardType: 'highContrast',
      }
    }

    // 2. ローキー + 低コントラスト: 強度を大幅に下げる
    if (stats.p50 < 0.3 && stats.range < 0.3) {
      strength *= 0.3
      guardApplied = true
      guardType = 'lowKeyLowContrast'
    }
    // 3. ハイキー画像: 強度を下げる
    else if (stats.p50 > 0.7) {
      strength *= 0.5
      guardApplied = true
      guardType = 'highKey'
    }
    // 4. 中間調が少ない: 強度を大幅に下げる
    else if (stats.midRatio < midRatioThreshold) {
      strength *= 0.3
      guardApplied = true
      guardType = 'lowMidRatio'
    }

    // 非線形制限: d' = maxRange * tanh(d / maxRange)
    const clampedDelta = maxRange * Math.tanh(delta / maxRange)

    // 最終適用量
    const amount = clampedDelta * strength

    return {
      delta,
      clampedDelta,
      amount,
      effectiveStrength: strength,
      guardApplied,
      guardType,
    }
  },

  /**
   * コントラスト補正結果を7点カーブに変換
   *
   * S字カーブの生成:
   * - amount > 0: コントラスト増加（暗部を暗く、明部を明るく）
   * - amount < 0: コントラスト減少（中央に寄せる）
   * - 端点 (0, 1) と中央 (0.5) は固定
   */
  toCurve: (result: ContrastCorrectionResult, pointCount: number = 7): Curve => {
    const { amount } = result

    // 補正量が微小な場合は identity を返す
    if (Math.abs(amount) < 0.001) {
      return $Curve.identity(pointCount)
    }

    const points: number[] = []
    const n = pointCount - 1 // 区間数

    for (let i = 0; i <= n; i++) {
      const x = i / n // 0, 1/6, 2/6, ..., 1

      if (i === 0) {
        // 端点: 固定
        points.push(0)
      } else if (i === n) {
        // 端点: 固定
        points.push(1)
      } else {
        // 中間点: S字変形
        // 中心 (0.5) からの距離に応じて変形
        const distFromCenter = x - 0.5

        // S字カーブ: 中心からの距離を強調/圧縮
        // amount > 0: 距離を拡大 (コントラスト増加)
        // amount < 0: 距離を縮小 (コントラスト減少)

        // スムーズなS字を作るため、中心に近いほど変化を控えめに
        // sin関数で自然なカーブを生成
        const t = distFromCenter * 2 // -1 to 1
        const curve = Math.sin(t * Math.PI / 2) // -1 to 1, 中心付近で緩やか

        // 変形量: amount に比例、端に近いほど大きく
        const shift = curve * amount

        // 新しいy値
        const y = x + shift

        // クランプして追加
        points.push(Math.max(0, Math.min(1, y)))
      }
    }

    return { points }
  },

  /**
   * コントラスト補正を1D LUTとして生成
   */
  toLut: (result: ContrastCorrectionResult, pointCount: number = 7): Lut1D => {
    const curve = $ContrastCorrection.toCurve(result, pointCount)
    const lutFloat = $Curve.toLutFloat(curve)
    return $Lut1D.fromMaster(lutFloat)
  },

  /**
   * LuminanceStats から直接LUTを生成（便利関数）
   */
  createLutFromStats: (
    stats: LuminanceStats,
    classification: ImageClassification,
    params: Partial<ContrastCorrectionParams> = {}
  ): { lut: Lut1D; result: ContrastCorrectionResult } => {
    const result = $ContrastCorrection.compute(stats, classification, params)
    const lut = $ContrastCorrection.toLut(result)
    return { lut, result }
  },
}
