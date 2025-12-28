/**
 * SaturationCorrection - 彩度正規化 (仕様書 v1)
 *
 * 「派手にする」ではなく「過彩度による破綻を減らす」ことを目的とする。
 * 低彩度は触らない。高彩度だけをソフトに圧縮する。
 * 失敗時は「ほぼ何もしない」方向に倒す。
 *
 * パイプライン位置: WB → Saturation Normalize → Creative LUT
 */

import type { SaturationStats, LuminanceStats } from './AutoCorrectionStats'
import { $Lut3D, type Lut3D } from './Lut3D'

// ============================================
// 型定義
// ============================================

/** 彩度正規化パラメータ */
export type SaturationCorrectionParams = {
  /** 目標彩度 (p95) - デフォルト 0.22 */
  targetSat95: number
  /** knee幅（片側効果の滑らかさ）- デフォルト 0.10 */
  satKnee: number
  /** 基本強度 (0-1) - デフォルト 0.5 */
  satStrength: number
  /** 最大圧縮量 - デフォルト 0.35 */
  maxCompression: number
  /** ピクセル重み下限（satProxy） - デフォルト 0.10 */
  pixelSatLo: number
  /** ピクセル重み上限（satProxy） - デフォルト 0.30 */
  pixelSatHi: number
  /** 極端キー閾値 (p50) - デフォルト 0.25/0.75 */
  extremeKeyLo: number
  extremeKeyHi: number
  /** クリップ閾値 - デフォルト 0.10 */
  clipThreshold: number
  /** 中間調閾値 - デフォルト 0.20 */
  midRatioThreshold: number
}

/** 彩度正規化結果 */
export type SaturationCorrectionResult = {
  /** 生の差分 (current - target)。正なら過彩度 */
  delta: number
  /** smoothstep後の正規化値 (0-1) */
  normalizedDelta: number
  /** 最終圧縮量 (0-maxCompression) */
  compressionBase: number
  /** ガード適用後の強度 */
  effectiveStrength: number
  /** ガード条件が適用されたか */
  guardApplied: boolean
  /** 適用されたガードの種類 */
  guardType: 'none' | 'noCompression' | 'extremeKey' | 'highClipping' | 'lowMidRatio'
  /** ピクセル重みパラメータ（LUT生成用） */
  pixelSatLo: number
  pixelSatHi: number
}

// ============================================
// デフォルト値
// ============================================

const DEFAULT_PARAMS: SaturationCorrectionParams = {
  targetSat95: 0.22,
  satKnee: 0.10,
  satStrength: 0.5,
  maxCompression: 0.35,
  pixelSatLo: 0.10,
  pixelSatHi: 0.30,
  extremeKeyLo: 0.25,
  extremeKeyHi: 0.75,
  clipThreshold: 0.10,
  midRatioThreshold: 0.20,
}

// ============================================
// ユーティリティ
// ============================================

/** smoothstep 関数 */
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// ============================================
// SaturationCorrection 操作
// ============================================

export const $SaturationCorrection = {
  /**
   * 彩度正規化を計算
   *
   * @param saturation 彩度統計
   * @param luminance 輝度統計（ガード条件に使用）
   * @param params パラメータ
   */
  compute: (
    saturation: SaturationStats,
    luminance: LuminanceStats,
    params: Partial<SaturationCorrectionParams> = {}
  ): SaturationCorrectionResult => {
    const fullParams = { ...DEFAULT_PARAMS, ...params }
    const {
      targetSat95,
      satKnee,
      maxCompression,
      pixelSatLo,
      pixelSatHi,
      extremeKeyLo,
      extremeKeyHi,
      clipThreshold,
      midRatioThreshold,
    } = fullParams
    let satStrength = fullParams.satStrength

    let guardApplied = false
    let guardType: SaturationCorrectionResult['guardType'] = 'none'

    // 現在の彩度を p95 で評価
    const current = saturation.p95Proxy

    // 差分を計算（上側のみ）
    // d = current - target
    // d <= 0 → 補正なし
    // d > 0 → 圧縮
    const delta = current - targetSat95

    // 過彩度でない場合は補正しない
    if (delta <= 0) {
      return {
        delta,
        normalizedDelta: 0,
        compressionBase: 0,
        effectiveStrength: satStrength,
        guardApplied: true,
        guardType: 'noCompression',
        pixelSatLo,
        pixelSatHi,
      }
    }

    // ガード条件の適用（累積的に強度減衰）

    // 1. ローキー / ハイキー: p50 < 0.25 or p50 > 0.75 → strength *= 0.7
    if (luminance.p50 < extremeKeyLo || luminance.p50 > extremeKeyHi) {
      satStrength *= 0.7
      if (!guardApplied) {
        guardApplied = true
        guardType = 'extremeKey'
      }
    }

    // 2. クリップが多い: clipBlack + clipWhite > 0.10 → strength *= 0.7
    if (luminance.clipBlack + luminance.clipWhite > clipThreshold) {
      satStrength *= 0.7
      if (!guardApplied) {
        guardApplied = true
        guardType = 'highClipping'
      }
    }

    // 3. 中間調が少ない（極端構図）: midRatio < 0.20 → strength *= 0.5
    if (luminance.midRatio < midRatioThreshold) {
      satStrength *= 0.5
      if (!guardApplied) {
        guardApplied = true
        guardType = 'lowMidRatio'
      }
    }

    // 非線形制限（片側 knee）
    // x = clamp(d / satKnee, 0, 1)
    // t = smoothstep(0, 1, x)
    const x = Math.max(0, Math.min(1, delta / satKnee))
    const normalizedDelta = smoothstep(0, 1, x)

    // 最終圧縮量
    // compressionBase = min(t * satStrength, maxCompression)
    const compressionBase = Math.min(normalizedDelta * satStrength, maxCompression)

    return {
      delta,
      normalizedDelta,
      compressionBase,
      effectiveStrength: satStrength,
      guardApplied,
      guardType,
      pixelSatLo,
      pixelSatHi,
    }
  },

  /**
   * 彩度正規化を 3D LUT として生成
   *
   * 処理:
   * - satProxy(c) = max(R,G,B) - min(R,G,B)
   * - w = smoothstep(pixelSatLo, pixelSatHi, satProxy)
   * - gray = (Y, Y, Y) where Y = 0.2126*R + 0.7152*G + 0.0722*B
   * - c' = mix(c, gray, compression * w)
   */
  toLut3D: (result: SaturationCorrectionResult, size: number = 17): Lut3D => {
    const { compressionBase, pixelSatLo, pixelSatHi } = result

    // 圧縮量がゼロなら identity を返す
    if (compressionBase <= 0.001) {
      return $Lut3D.identity(size)
    }

    const totalSize = size * size * size * 3
    const data = new Float32Array(totalSize)

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          const idx = (ri + gi * size + bi * size * size) * 3
          const r = ri / (size - 1)
          const g = gi / (size - 1)
          const b = bi / (size - 1)

          // satProxy = max(R,G,B) - min(R,G,B)
          const maxRGB = Math.max(r, g, b)
          const minRGB = Math.min(r, g, b)
          const satProxy = maxRGB - minRGB

          // 高彩度重み: w = smoothstep(pixelSatLo, pixelSatHi, satProxy)
          const w = smoothstep(pixelSatLo, pixelSatHi, satProxy)

          // 輝度（グレー）
          const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b

          // 最終圧縮量
          const compression = compressionBase * w

          // c' = mix(c, gray, compression)
          data[idx] = r + (Y - r) * compression
          data[idx + 1] = g + (Y - g) * compression
          data[idx + 2] = b + (Y - b) * compression
        }
      }
    }

    return { type: 'lut3d', size, data }
  },

  /**
   * Stats から直接 3D LUT を生成（便利関数）
   */
  createLutFromStats: (
    saturation: SaturationStats,
    luminance: LuminanceStats,
    params: Partial<SaturationCorrectionParams> = {},
    size: number = 17
  ): { lut: Lut3D; result: SaturationCorrectionResult } => {
    const result = $SaturationCorrection.compute(saturation, luminance, params)
    const lut = $SaturationCorrection.toLut3D(result, size)
    return { lut, result }
  },

  /**
   * デフォルトパラメータを取得
   */
  getDefaultParams: (): SaturationCorrectionParams => ({ ...DEFAULT_PARAMS }),
}
