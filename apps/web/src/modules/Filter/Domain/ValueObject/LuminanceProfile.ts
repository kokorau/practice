/**
 * LuminanceProfile - Oklab輝度ベースのトーンプロファイル抽出
 *
 * RGB独立処理ではなく、知覚的に均一なOklab色空間の輝度(L)のみを
 * 分析・処理することで、色ズレを防ぎつつ正確なトーンカーブを抽出する
 */

import { $Oklab, type Oklab } from '@practice/color'
import type { Srgb } from '@practice/color'

// ============================================
// 型定義
// ============================================

/** 輝度プロファイル */
export type LuminanceProfile = {
  /** 輝度ヒストグラム (256ビン) */
  histogram: Uint32Array
  /** 累積分布関数 (256点, 0-1) */
  cdf: Float32Array
  /** 黒点 (0-255) */
  blackPoint: number
  /** 白点 (0-255) */
  whitePoint: number
  /** ガンマ推定値 */
  gamma: number
  /** 平均輝度 (0-1) */
  meanLuminance: number
  /** コントロールポイント */
  controlPoints: ControlPoint[]
}

/** コントロールポイント */
export type ControlPoint = {
  /** 入力値 (0-1) */
  input: number
  /** 出力値 (0-1) */
  output: number
}

/** 輝度LUT (256エントリ, 入力L→出力L) */
export type LuminanceLut = Float32Array

/** カーブフィッティングの種類 */
export type CurveFitType = 'raw' | 'polynomial' | 'spline' | 'simple' | 'normalize'

/** 正規化オプション */
export type NormalizeOptions = {
  /** 入力パーセンタイル下限 (デフォルト: 5) */
  inputLowPercentile?: number
  /** 入力パーセンタイル上限 (デフォルト: 95) */
  inputHighPercentile?: number
  /** 出力範囲下限 (デフォルト: 0.1) */
  outputLow?: number
  /** 出力範囲上限 (デフォルト: 0.9) */
  outputHigh?: number
  /** 目標ガンマ (デフォルト: 1.0 = リニア) */
  targetGamma?: number
}

// ============================================
// LuminanceProfile 操作
// ============================================

export const $LuminanceProfile = {
  /**
   * ImageDataから輝度プロファイルを抽出
   * Oklab Lチャンネルのみを使用
   */
  extract: (
    imageData: ImageData,
    percentile: number = 1,
    numControlPoints: number = 7
  ): LuminanceProfile => {
    const { data, width, height } = imageData
    const totalPixels = width * height

    // 輝度ヒストグラムを計算
    const histogram = new Uint32Array(256)
    let luminanceSum = 0

    for (let i = 0; i < data.length; i += 4) {
      const srgb: Srgb = {
        r: data[i]! / 255,
        g: data[i + 1]! / 255,
        b: data[i + 2]! / 255,
      }
      // Oklab輝度 (0-1) を 0-255 にマッピング
      const L = $Oklab.fromSrgb(srgb).L
      const L255 = Math.round(Math.max(0, Math.min(1, L)) * 255)
      histogram[L255]!++
      luminanceSum += L
    }

    const meanLuminance = luminanceSum / totalPixels

    // CDFを計算
    const cdf = computeCdf(histogram, totalPixels)

    // 黒点・白点を検出
    const { blackPoint, whitePoint } = detectBlackWhitePoints(histogram, totalPixels, percentile)

    // ガンマを推定
    const gamma = estimateGamma(blackPoint, whitePoint, meanLuminance)

    // コントロールポイントを抽出
    const controlPoints = extractControlPoints(cdf, numControlPoints)

    return {
      histogram,
      cdf,
      blackPoint,
      whitePoint,
      gamma,
      meanLuminance,
      controlPoints,
    }
  },

  /**
   * ニュートラル（リニア）プロファイル
   */
  neutral: (): LuminanceProfile => {
    const histogram = new Uint32Array(256)
    const cdf = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      cdf[i] = i / 255
    }
    return {
      histogram,
      cdf,
      blackPoint: 0,
      whitePoint: 255,
      gamma: 1.0,
      meanLuminance: 0.5,
      controlPoints: [
        { input: 0, output: 0 },
        { input: 0.25, output: 0.25 },
        { input: 0.5, output: 0.5 },
        { input: 0.75, output: 0.75 },
        { input: 1, output: 1 },
      ],
    }
  },

  /**
   * プロファイルを適用するLUTを生成
   * CDFをそのままLUTとして使用
   */
  toLut: (profile: LuminanceProfile): LuminanceLut => {
    return profile.cdf.slice()
  },

  /**
   * プロファイルを打ち消す（フラット化する）LUTを生成
   * CDFの逆関数
   */
  toInverseLut: (profile: LuminanceProfile): LuminanceLut => {
    return invertCdf(profile.cdf)
  },

  /**
   * 簡易パラメータベースの逆LUT生成
   * CDFではなく、blackPoint/whitePoint/gamma のみを使用
   * より穏やかなフラット化
   */
  toSimpleInverseLut: (profile: LuminanceProfile): LuminanceLut => {
    const lut = new Float32Array(256)
    const { blackPoint, whitePoint, gamma } = profile
    const range = whitePoint - blackPoint

    for (let i = 0; i < 256; i++) {
      if (range <= 0) {
        lut[i] = i / 255
        continue
      }

      // 黒点・白点の逆変換
      const normalized = (i - blackPoint) / range
      const clamped = Math.max(0, Math.min(1, normalized))

      // 逆ガンマ適用
      const output = Math.pow(clamped, 1 / gamma)
      lut[i] = Math.max(0, Math.min(1, output))
    }

    return lut
  },

  /**
   * LUTをImageDataに適用
   * Oklab色空間で輝度のみ変更、色相・彩度を保持
   */
  applyLut: (imageData: ImageData, lut: LuminanceLut): ImageData => {
    const { data, width, height } = imageData
    const result = new Uint8ClampedArray(data.length)

    for (let i = 0; i < data.length; i += 4) {
      const srgb: Srgb = {
        r: data[i]! / 255,
        g: data[i + 1]! / 255,
        b: data[i + 2]! / 255,
      }

      // Oklabに変換
      const oklab = $Oklab.fromSrgb(srgb)

      // LUTで輝度を変換
      const L255 = Math.round(Math.max(0, Math.min(1, oklab.L)) * 255)
      const newL = lut[L255] ?? oklab.L

      // 輝度のみ更新、a/bは保持
      const newOklab: Oklab = {
        L: newL,
        a: oklab.a,
        b: oklab.b,
      }

      // sRGBに戻す
      const newSrgb = $Oklab.toSrgb(newOklab)

      result[i] = Math.round(newSrgb.r * 255)
      result[i + 1] = Math.round(newSrgb.g * 255)
      result[i + 2] = Math.round(newSrgb.b * 255)
      result[i + 3] = data[i + 3]! // alpha保持
    }

    return new ImageData(result, width, height)
  },

  /**
   * LUTの強度を調整（0-1でブレンド）
   * 0 = 元のまま、1 = 完全適用
   */
  blendLut: (lut: LuminanceLut, strength: number): LuminanceLut => {
    const result = new Float32Array(256)
    const clampedStrength = Math.max(0, Math.min(1, strength))

    for (let i = 0; i < 256; i++) {
      const original = i / 255
      const adjusted = lut[i] ?? original
      result[i] = original * (1 - clampedStrength) + adjusted * clampedStrength
    }

    return result
  },

  /**
   * フィットしたカーブから逆LUTを生成
   * @param profile プロファイル
   * @param fitType フィッティングタイプ
   *   - 'raw': CDFそのまま（荒い）
   *   - 'polynomial': 多項式フィット（滑らか）
   *   - 'spline': スプライン補間（コントロールポイントベース）
   *   - 'simple': ガンマ/黒点/白点のみ（穏やか）
   *   - 'normalize': パーセンタイル正規化（安定・推奨）
   */
  toFittedInverseLut: (
    profile: LuminanceProfile,
    fitType: CurveFitType = 'polynomial'
  ): LuminanceLut => {
    switch (fitType) {
      case 'raw':
        return invertCdf(profile.cdf)
      case 'simple':
        return $LuminanceProfile.toSimpleInverseLut(profile)
      case 'polynomial':
        return invertPolynomialFit(profile.cdf, 5)
      case 'spline':
        return invertSplineFit(profile.controlPoints)
      case 'normalize':
        return $LuminanceProfile.toNormalizeLut(profile)
      default:
        return invertCdf(profile.cdf)
    }
  },

  /**
   * LUTをシフトして平均輝度を保持
   * フラット化後の平均輝度が元の平均輝度に近くなるようにシフト
   * @param lut 入力LUT
   * @param originalMean 元の平均輝度 (0-1)
   * @param targetMean フラット化後の目標平均輝度 (通常0.5)
   */
  shiftLutToPreserveMean: (
    lut: LuminanceLut,
    originalMean: number,
    targetMean: number = 0.5
  ): LuminanceLut => {
    // フラット化後の平均輝度は targetMean に向かう
    // これを originalMean に戻すためにシフトが必要
    const shift = originalMean - targetMean

    const result = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      // LUTの出力値にシフトを適用
      result[i] = Math.max(0, Math.min(1, (lut[i] ?? i / 255) + shift))
    }

    return result
  },

  /**
   * パーセンタイル正規化LUTを生成 (B+Cアプローチ)
   *
   * 1. 入力画像の指定パーセンタイル範囲を検出
   * 2. それを目標出力範囲にマッピング
   * 3. オプションでガンマカーブを適用
   * 4. ソフトクリッピングで端点を滑らかに処理
   *
   * CDFベースの複雑なフィッティングより安定
   */
  toNormalizeLut: (
    profile: LuminanceProfile,
    options: NormalizeOptions = {}
  ): LuminanceLut => {
    const {
      inputLowPercentile = 5,
      inputHighPercentile = 95,
      outputLow = 0.1,
      outputHigh = 0.9,
      targetGamma = 1.0,
    } = options

    // パーセンタイル位置を検出
    const inputLow = findPercentileValue(profile.cdf, inputLowPercentile / 100)
    const inputHigh = findPercentileValue(profile.cdf, inputHighPercentile / 100)

    const lut = new Float32Array(256)
    const inputRange = inputHigh - inputLow
    const outputRange = outputHigh - outputLow

    for (let i = 0; i < 256; i++) {
      const input = i / 255

      // 入力範囲を正規化 (0-1)
      let normalized: number
      if (inputRange <= 0.001) {
        // 範囲がほぼない場合（単色画像など）
        normalized = 0.5
      } else {
        normalized = (input - inputLow) / inputRange
        // ソフトクリッピング: 端点で滑らかに0/1に収束
        normalized = softClip(normalized)
      }

      // 目標ガンマを適用
      const gammaCorrected = Math.pow(normalized, targetGamma)

      // 出力範囲にマッピング
      const output = outputLow + gammaCorrected * outputRange

      lut[i] = Math.max(0, Math.min(1, output))
    }

    return lut
  },

  /**
   * フィットしたカーブからLUTを生成
   */
  toFittedLut: (
    profile: LuminanceProfile,
    fitType: CurveFitType = 'polynomial'
  ): LuminanceLut => {
    switch (fitType) {
      case 'raw':
        return profile.cdf.slice()
      case 'simple': {
        const lut = new Float32Array(256)
        const { blackPoint, whitePoint, gamma } = profile
        for (let i = 0; i < 256; i++) {
          const normalized = i / 255
          const gammaCorrected = Math.pow(normalized, gamma)
          const output = blackPoint / 255 + gammaCorrected * (whitePoint - blackPoint) / 255
          lut[i] = Math.max(0, Math.min(1, output))
        }
        return lut
      }
      case 'polynomial':
        return polynomialFit(profile.cdf, 5)
      case 'spline':
        return splineFit(profile.controlPoints)
      default:
        return profile.cdf.slice()
    }
  },
}

// ============================================
// ヘルパー関数
// ============================================

/** CDFを計算 */
function computeCdf(histogram: Uint32Array, totalPixels: number): Float32Array {
  const cdf = new Float32Array(256)

  if (totalPixels === 0) {
    for (let i = 0; i < 256; i++) {
      cdf[i] = i / 255
    }
    return cdf
  }

  let cumulative = 0
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i] ?? 0
    cdf[i] = cumulative / totalPixels
  }

  return cdf
}

/** 黒点・白点を検出 */
function detectBlackWhitePoints(
  histogram: Uint32Array,
  totalPixels: number,
  percentile: number
): { blackPoint: number; whitePoint: number } {
  const threshold = totalPixels * (percentile / 100)

  // 黒点
  let cumulative = 0
  let blackPoint = 0
  for (let i = 0; i < 256; i++) {
    if ((histogram[i] ?? 0) > 0) {
      cumulative += histogram[i] ?? 0
      if (cumulative > threshold) {
        blackPoint = i
        break
      }
    }
  }

  // 白点
  cumulative = 0
  let whitePoint = 255
  for (let i = 255; i >= 0; i--) {
    if ((histogram[i] ?? 0) > 0) {
      cumulative += histogram[i] ?? 0
      if (cumulative > threshold) {
        whitePoint = i
        break
      }
    }
  }

  return { blackPoint, whitePoint }
}

/** ガンマを推定 */
function estimateGamma(blackPoint: number, whitePoint: number, meanLuminance: number): number {
  const range = whitePoint - blackPoint
  if (range <= 0) return 1.0

  // 正規化された平均輝度
  const normalizedMean = (meanLuminance * 255 - blackPoint) / range
  const clampedMean = Math.max(0.01, Math.min(0.99, normalizedMean))

  // gamma = log(normalizedMean) / log(0.5)
  const gamma = Math.log(clampedMean) / Math.log(0.5)

  return Math.max(0.2, Math.min(5.0, gamma))
}

/** コントロールポイントを抽出 */
function extractControlPoints(cdf: Float32Array, numPoints: number): ControlPoint[] {
  const points: ControlPoint[] = []

  for (let i = 0; i < numPoints; i++) {
    const input = i / (numPoints - 1)
    const idx = input * 255
    const lo = Math.floor(idx)
    const hi = Math.min(255, lo + 1)
    const t = idx - lo
    const output = (cdf[lo] ?? 0) * (1 - t) + (cdf[hi] ?? 0) * t

    points.push({ input, output })
  }

  return points
}

/**
 * ソフトクリッピング関数
 * 0-1の範囲外を滑らかに0/1に収束させる
 * -∞ → 0, +∞ → 1 に漸近するシグモイド的な関数
 *
 * 0-1の範囲内はほぼリニア、範囲外で徐々に曲がる
 */
function softClip(x: number): number {
  // 範囲内（0.05-0.95）はほぼリニアに通す
  if (x >= 0.05 && x <= 0.95) {
    return x
  }

  // 範囲外はシグモイドで滑らかにクリップ
  // スケール係数: 大きいほど急峻にクリップ
  const k = 10

  if (x < 0.05) {
    // 下側: 0に向かって滑らかに収束
    // x=0.05でほぼリニアと接続、x<0で0に漸近
    const t = (x - 0.05) * k // t < 0
    const sigmoid = 1 / (1 + Math.exp(-t))
    return 0.05 * sigmoid / (1 / (1 + Math.exp(0))) // 0.05でx=0.05と接続
  } else {
    // 上側: 1に向かって滑らかに収束
    // x=0.95でほぼリニアと接続、x>1で1に漸近
    const t = (x - 0.95) * k // t > 0
    const sigmoid = 1 / (1 + Math.exp(-t))
    // 0.95 + (1-0.95) * normalized_sigmoid
    const normalizedSigmoid = (sigmoid - 0.5) * 2 // 0 to 1
    return 0.95 + 0.05 * normalizedSigmoid
  }
}

/**
 * CDFからパーセンタイル位置の輝度値を取得
 * @param cdf 累積分布関数
 * @param percentile パーセンタイル (0-1)
 * @returns 輝度値 (0-1)
 */
function findPercentileValue(cdf: Float32Array, percentile: number): number {
  for (let i = 0; i < 256; i++) {
    if ((cdf[i] ?? 0) >= percentile) {
      // 線形補間
      if (i > 0) {
        const prev = cdf[i - 1] ?? 0
        const curr = cdf[i] ?? 0
        if (curr > prev) {
          const t = (percentile - prev) / (curr - prev)
          return (i - 1 + t) / 255
        }
      }
      return i / 255
    }
  }
  return 1.0
}

/** CDFの逆関数を計算 */
function invertCdf(cdf: Float32Array): Float32Array {
  const inverse = new Float32Array(256)

  for (let i = 0; i < 256; i++) {
    const target = i / 255

    // CDFで target 以上になる最初の位置を探す
    let found = 255
    for (let j = 0; j < 256; j++) {
      if ((cdf[j] ?? 0) >= target) {
        found = j
        break
      }
    }

    // 線形補間で精度を上げる
    if (found > 0 && found < 255) {
      const prevVal = cdf[found - 1] ?? 0
      const currVal = cdf[found] ?? 0
      if (currVal > prevVal) {
        const t = (target - prevVal) / (currVal - prevVal)
        inverse[i] = (found - 1 + t) / 255
      } else {
        inverse[i] = found / 255
      }
    } else {
      inverse[i] = found / 255
    }
  }

  return inverse
}

// ============================================
// カーブフィッティング
// ============================================

/**
 * 多項式フィット
 * CDFを多項式でフィットして滑らかなLUTを生成
 * @param cdf 入力CDF
 * @param degree 多項式の次数 (3-7推奨)
 */
function polynomialFit(cdf: Float32Array, degree: number): Float32Array {
  // サンプルポイントを取得 (計算量削減のため間引き)
  const sampleCount = Math.min(64, 256)
  const step = 256 / sampleCount
  const xs: number[] = []
  const ys: number[] = []

  for (let i = 0; i < sampleCount; i++) {
    const idx = Math.round(i * step)
    xs.push(idx / 255)
    ys.push(cdf[Math.min(255, idx)] ?? 0)
  }

  // 多項式係数を最小二乗法でフィット
  const coeffs = fitPolynomial(xs, ys, degree)

  // LUT生成
  const lut = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const x = i / 255
    let y = 0
    for (let j = 0; j <= degree; j++) {
      y += (coeffs[j] ?? 0) * Math.pow(x, j)
    }
    lut[i] = Math.max(0, Math.min(1, y))
  }

  return lut
}

/**
 * 多項式係数を最小二乗法で求める
 * y = a0 + a1*x + a2*x^2 + ... + an*x^n
 */
function fitPolynomial(xs: number[], ys: number[], degree: number): number[] {
  const n = xs.length
  const m = degree + 1

  // Vandermonde行列 X を構築
  const X: number[][] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < m; j++) {
      row.push(Math.pow(xs[i]!, j))
    }
    X.push(row)
  }

  // 正規方程式: (X^T * X) * a = X^T * y
  // XtX = X^T * X (m x m)
  const XtX: number[][] = []
  for (let i = 0; i < m; i++) {
    const row: number[] = []
    for (let j = 0; j < m; j++) {
      let sum = 0
      for (let k = 0; k < n; k++) {
        sum += X[k]![i]! * X[k]![j]!
      }
      row.push(sum)
    }
    XtX.push(row)
  }

  // Xty = X^T * y (m x 1)
  const Xty: number[] = []
  for (let i = 0; i < m; i++) {
    let sum = 0
    for (let k = 0; k < n; k++) {
      sum += X[k]![i]! * ys[k]!
    }
    Xty.push(sum)
  }

  // ガウス消去法で解く
  return solveLinearSystem(XtX, Xty)
}

/**
 * ガウス消去法で連立一次方程式を解く
 * A * x = b
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length
  // 拡大係数行列を作成
  const aug: number[][] = A.map((row, i) => [...row, b[i]!])

  // 前進消去
  for (let i = 0; i < n; i++) {
    // ピボット選択
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k]![i]!) > Math.abs(aug[maxRow]![i]!)) {
        maxRow = k
      }
    }
    [aug[i], aug[maxRow]] = [aug[maxRow]!, aug[i]!]

    // ピボットが0に近い場合はスキップ
    if (Math.abs(aug[i]![i]!) < 1e-10) continue

    // 消去
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k]![i]! / aug[i]![i]!
      for (let j = i; j <= n; j++) {
        aug[k]![j] = aug[k]![j]! - factor * aug[i]![j]!
      }
    }
  }

  // 後退代入
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(aug[i]![i]!) < 1e-10) {
      x[i] = 0
      continue
    }
    let sum = aug[i]![n]!
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i]![j]! * x[j]!
    }
    x[i] = sum / aug[i]![i]!
  }

  return x
}

/**
 * 多項式フィットの逆関数LUT
 */
function invertPolynomialFit(cdf: Float32Array, degree: number): Float32Array {
  const fitted = polynomialFit(cdf, degree)
  return invertCdf(fitted)
}

/**
 * スプライン補間
 * コントロールポイントからCatmull-Romスプラインで滑らかなLUTを生成
 */
function splineFit(controlPoints: ControlPoint[]): Float32Array {
  const lut = new Float32Array(256)

  if (controlPoints.length < 2) {
    // ポイント不足時はリニア
    for (let i = 0; i < 256; i++) {
      lut[i] = i / 255
    }
    return lut
  }

  // 各入力値に対して補間
  for (let i = 0; i < 256; i++) {
    const x = i / 255
    lut[i] = catmullRomInterpolate(controlPoints, x)
  }

  return lut
}

/**
 * Catmull-Rom スプライン補間
 */
function catmullRomInterpolate(points: ControlPoint[], x: number): number {
  const n = points.length

  // xを含むセグメントを見つける
  let segIdx = 0
  for (let i = 0; i < n - 1; i++) {
    if (x >= points[i]!.input && x <= points[i + 1]!.input) {
      segIdx = i
      break
    }
    if (i === n - 2) segIdx = n - 2
  }

  // 4点を取得 (端点は複製)
  const p0 = points[Math.max(0, segIdx - 1)]!
  const p1 = points[segIdx]!
  const p2 = points[Math.min(n - 1, segIdx + 1)]!
  const p3 = points[Math.min(n - 1, segIdx + 2)]!

  // セグメント内のt (0-1)
  const segmentLength = p2.input - p1.input
  const t = segmentLength > 0 ? (x - p1.input) / segmentLength : 0

  // Catmull-Rom補間
  const t2 = t * t
  const t3 = t2 * t

  const y = 0.5 * (
    (2 * p1.output) +
    (-p0.output + p2.output) * t +
    (2 * p0.output - 5 * p1.output + 4 * p2.output - p3.output) * t2 +
    (-p0.output + 3 * p1.output - 3 * p2.output + p3.output) * t3
  )

  return Math.max(0, Math.min(1, y))
}

/**
 * スプラインフィットの逆関数LUT
 */
function invertSplineFit(controlPoints: ControlPoint[]): Float32Array {
  const fitted = splineFit(controlPoints)
  return invertCdf(fitted)
}
