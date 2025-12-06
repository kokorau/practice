/**
 * ToneProfile - 画像から抽出した色調プロファイル
 *
 * 統計ベースのアプローチで、各チャンネルの黒点・白点・ガンマを抽出し、
 * それを再現する1D LUTを生成する
 *
 * 詳細モードでは、CDFベースの完全なトーンカーブとコントロールポイントを抽出
 */

import { type Lut1D, $Lut1D } from './Lut1D'

/** 単一チャンネルの色調パラメータ（簡易版） */
export type ChannelTone = {
  /** 黒点 (0-255) - シャドウの切り詰め位置 */
  blackPoint: number
  /** 白点 (0-255) - ハイライトの切り詰め位置 */
  whitePoint: number
  /** ガンマ (0.1-10) - 中間調の明るさ。1.0=リニア、<1=明るく、>1=暗く */
  gamma: number
}

/** カーブ上のコントロールポイント */
export type CurvePoint = {
  /** 入力値 (0-1) */
  input: number
  /** 出力値 (0-1) */
  output: number
}

/** 単一チャンネルの詳細カーブデータ */
export type ChannelCurve = {
  /** 簡易パラメータ */
  tone: ChannelTone
  /** 累積分布関数 (256点, 0-1) - 入力値→出力値のマッピング */
  cdf: Float32Array
  /** コントロールポイント (5-7点) */
  controlPoints: CurvePoint[]
}

/** RGB各チャンネルの色調プロファイル（簡易版） */
export type ToneProfile = {
  r: ChannelTone
  g: ChannelTone
  b: ChannelTone
}

/** RGB各チャンネルの詳細プロファイル */
export type ToneProfileDetailed = {
  r: ChannelCurve
  g: ChannelCurve
  b: ChannelCurve
}

// ============================================
// 画像解析タイプ
// ============================================

/** ヒストグラム統計（単一チャンネル） */
export type HistogramStats = {
  /** 平均 (0-255) */
  mean: number
  /** 中央値 (0-255) */
  median: number
  /** 標準偏差 */
  stdDev: number
  /** 歪度 (正=暗め/右に裾, 負=明るめ/左に裾) */
  skewness: number
}

/** ダイナミックレンジ解析 */
export type DynamicRange = {
  /** コントラスト比 (whitePoint / blackPoint、blackPoint=0の場合は無限大として255) */
  contrastRatio: number
  /** 使用レンジ (whitePoint - blackPoint) */
  range: number
  /** キー判定 */
  key: 'low' | 'normal' | 'high'
  /** キー値 (0-1, 0.5が中間、0に近いほどローキー) */
  keyValue: number
}

/** トーナルゾーン統計 */
export type TonalZoneStats = {
  /** シャドウ (0-85) */
  shadows: ZoneStats
  /** ミッドトーン (86-170) */
  midtones: ZoneStats
  /** ハイライト (171-255) */
  highlights: ZoneStats
}

/** 各ゾーンの統計 */
export type ZoneStats = {
  /** ゾーン範囲 [min, max] */
  range: [number, number]
  /** このゾーンのピクセル割合 (0-1) */
  percentage: number
  /** ゾーン内平均値 (0-255) */
  mean: number
}

/** 彩度解析 */
export type SaturationStats = {
  /** 平均彩度 (0-1) */
  mean: number
  /** 彩度の中央値 (0-1) */
  median: number
  /** 標準偏差 */
  stdDev: number
  /** 彩度ヒストグラム (256ビン, 0-1の範囲を256分割) */
  histogram: Uint32Array
}

/** クリッピング情報 */
export type ClippingInfo = {
  /** 黒潰れピクセル数 (RGB全てが0) */
  blackClipped: number
  /** 黒潰れ割合 (0-1) */
  blackClippedPercent: number
  /** 白飛びピクセル数 (RGB全てが255) */
  whiteClipped: number
  /** 白飛び割合 (0-1) */
  whiteClippedPercent: number
  /** 合計クリッピング割合 (0-1) */
  totalClippedPercent: number
  /** チャンネル別クリッピング */
  channels: {
    r: { black: number; white: number }
    g: { black: number; white: number }
    b: { black: number; white: number }
  }
}

/** 画像解析結果 */
export type ImageAnalysis = {
  /** 輝度ヒストグラム統計 */
  luminance: HistogramStats
  /** ダイナミックレンジ解析 */
  dynamicRange: DynamicRange
  /** トーナルゾーン解析 */
  tonalZones: TonalZoneStats
  /** 彩度解析 */
  saturation: SaturationStats
  /** クリッピング情報 */
  clipping: ClippingInfo
  /** チャンネル別統計 */
  channels: {
    r: HistogramStats
    g: HistogramStats
    b: HistogramStats
  }
}

/** ヒストグラム (各チャンネル256ビン) */
type Histogram = {
  r: Uint32Array
  g: Uint32Array
  b: Uint32Array
}

/** デフォルトのコントロールポイント数 */
const DEFAULT_CONTROL_POINTS = 7

/** ToneProfile 操作 */
export const $ToneProfile = {
  /** ニュートラル（無変換）プロファイル */
  neutral: (): ToneProfile => ({
    r: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
    g: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
    b: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
  }),

  /** ニュートラル（無変換）詳細プロファイル */
  neutralDetailed: (): ToneProfileDetailed => {
    const neutralCurve = (): ChannelCurve => {
      const cdf = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        cdf[i] = i / 255
      }
      return {
        tone: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
        cdf,
        controlPoints: [
          { input: 0, output: 0 },
          { input: 0.25, output: 0.25 },
          { input: 0.5, output: 0.5 },
          { input: 0.75, output: 0.75 },
          { input: 1, output: 1 },
        ],
      }
    }
    return { r: neutralCurve(), g: neutralCurve(), b: neutralCurve() }
  },

  /**
   * ImageData から ToneProfile を抽出（簡易版）
   * @param imageData 入力画像
   * @param percentile 黒点/白点のパーセンタイル (default: 1%)
   */
  extract: (imageData: ImageData, percentile: number = 1): ToneProfile => {
    const histogram = computeHistogram(imageData)
    const totalPixels = imageData.width * imageData.height

    return {
      r: extractChannelTone(histogram.r, totalPixels, percentile),
      g: extractChannelTone(histogram.g, totalPixels, percentile),
      b: extractChannelTone(histogram.b, totalPixels, percentile),
    }
  },

  /**
   * ImageData から詳細プロファイルを抽出
   * @param imageData 入力画像
   * @param percentile 黒点/白点のパーセンタイル (default: 1%)
   * @param numControlPoints コントロールポイント数 (default: 7)
   */
  extractDetailed: (
    imageData: ImageData,
    percentile: number = 1,
    numControlPoints: number = DEFAULT_CONTROL_POINTS
  ): ToneProfileDetailed => {
    const histogram = computeHistogram(imageData)
    const totalPixels = imageData.width * imageData.height

    return {
      r: extractChannelCurve(histogram.r, totalPixels, percentile, numControlPoints),
      g: extractChannelCurve(histogram.g, totalPixels, percentile, numControlPoints),
      b: extractChannelCurve(histogram.b, totalPixels, percentile, numControlPoints),
    }
  },

  /** 詳細プロファイルから簡易プロファイルを取得 */
  toSimple: (detailed: ToneProfileDetailed): ToneProfile => ({
    r: detailed.r.tone,
    g: detailed.g.tone,
    b: detailed.b.tone,
  }),

  /**
   * 詳細プロファイルのCDFから直接LUTを生成
   * CDFそのものがLUTになる（より正確）
   */
  detailedToLut: (profile: ToneProfileDetailed): Lut1D => {
    return $Lut1D.create(
      profile.r.cdf.slice(),
      profile.g.cdf.slice(),
      profile.b.cdf.slice()
    )
  },

  /**
   * 詳細プロファイルの逆LUTを生成
   * CDFの逆関数を計算
   */
  detailedToInverseLut: (profile: ToneProfileDetailed): Lut1D => {
    return $Lut1D.create(
      invertCdf(profile.r.cdf),
      invertCdf(profile.g.cdf),
      invertCdf(profile.b.cdf)
    )
  },

  /**
   * ToneProfile を適用する Lut1D を生成
   * このLUTを適用すると、画像にプロファイルの色調が適用される
   */
  toLut: (profile: ToneProfile): Lut1D => {
    return $Lut1D.create(
      createChannelLut(profile.r),
      createChannelLut(profile.g),
      createChannelLut(profile.b)
    )
  },

  /**
   * ToneProfile を打ち消す（元に戻す）Lut1D を生成
   * このLUTを適用すると、プロファイルの色調が除去される
   */
  toInverseLut: (profile: ToneProfile): Lut1D => {
    return $Lut1D.create(
      createInverseChannelLut(profile.r),
      createInverseChannelLut(profile.g),
      createInverseChannelLut(profile.b)
    )
  },

  /**
   * 2つのプロファイル間の変換LUTを生成
   * fromProfile の画像を toProfile の色調に変換する
   */
  createTransferLut: (fromProfile: ToneProfile, toProfile: ToneProfile): Lut1D => {
    // from を正規化 → to を適用
    const fromInverse = $ToneProfile.toInverseLut(fromProfile)
    const toLut = $ToneProfile.toLut(toProfile)
    return $Lut1D.compose(fromInverse, toLut)
  },

  /**
   * 画像を詳細解析
   * ヒストグラム統計、ダイナミックレンジ、トーナルゾーン、彩度、クリッピングを分析
   */
  analyze: (imageData: ImageData): ImageAnalysis => {
    const { data, width, height } = imageData
    const totalPixels = width * height

    // ヒストグラム計算
    const histogram = computeHistogram(imageData)

    // 輝度ヒストグラム計算
    const luminanceHist = new Uint32Array(256)
    // 彩度ヒストグラム計算
    const saturationHist = new Uint32Array(256)
    const saturationValues: number[] = []

    // クリッピング検出用
    let blackClipped = 0
    let whiteClipped = 0
    const channelClipping = {
      r: { black: 0, white: 0 },
      g: { black: 0, white: 0 },
      b: { black: 0, white: 0 },
    }

    // ピクセル走査
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!

      // 輝度 (Rec.709)
      const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
      luminanceHist[lum]!++

      // 彩度 (HSL式: (max - min) / (1 - |2L - 1|))
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 2 / 255
      let sat = 0
      if (max !== min) {
        const d = (max - min) / 255
        sat = l > 0.5 ? d / (2 - max / 255 - min / 255) : d / (max / 255 + min / 255)
      }
      const satIdx = Math.min(255, Math.round(sat * 255))
      saturationHist[satIdx]!++
      saturationValues.push(sat)

      // クリッピング検出
      if (r === 0 && g === 0 && b === 0) blackClipped++
      if (r === 255 && g === 255 && b === 255) whiteClipped++
      if (r === 0) channelClipping.r.black++
      if (r === 255) channelClipping.r.white++
      if (g === 0) channelClipping.g.black++
      if (g === 255) channelClipping.g.white++
      if (b === 0) channelClipping.b.black++
      if (b === 255) channelClipping.b.white++
    }

    // チャンネル別統計
    const rStats = computeHistogramStats(histogram.r, totalPixels)
    const gStats = computeHistogramStats(histogram.g, totalPixels)
    const bStats = computeHistogramStats(histogram.b, totalPixels)

    // 輝度統計
    const luminanceStats = computeHistogramStats(luminanceHist, totalPixels)

    // ダイナミックレンジ
    const dynamicRange = computeDynamicRange(luminanceHist, totalPixels, luminanceStats.mean)

    // トーナルゾーン
    const tonalZones = computeTonalZones(luminanceHist, totalPixels)

    // 彩度統計
    const saturation = computeSaturationStats(saturationHist, saturationValues, totalPixels)

    // クリッピング情報
    const clipping: ClippingInfo = {
      blackClipped,
      blackClippedPercent: blackClipped / totalPixels,
      whiteClipped,
      whiteClippedPercent: whiteClipped / totalPixels,
      totalClippedPercent: (blackClipped + whiteClipped) / totalPixels,
      channels: channelClipping,
    }

    return {
      luminance: luminanceStats,
      dynamicRange,
      tonalZones,
      saturation,
      clipping,
      channels: { r: rStats, g: gStats, b: bStats },
    }
  },
}

/** ヒストグラムを計算 */
function computeHistogram(imageData: ImageData): Histogram {
  const { data } = imageData
  const r = new Uint32Array(256)
  const g = new Uint32Array(256)
  const b = new Uint32Array(256)

  for (let i = 0; i < data.length; i += 4) {
    const ri = data[i]!
    const gi = data[i + 1]!
    const bi = data[i + 2]!
    r[ri] = (r[ri] ?? 0) + 1
    g[gi] = (g[gi] ?? 0) + 1
    b[bi] = (b[bi] ?? 0) + 1
  }

  return { r, g, b }
}

/** 単一チャンネルの色調パラメータを抽出 */
function extractChannelTone(
  histogram: Uint32Array,
  totalPixels: number,
  percentile: number
): ChannelTone {
  const threshold = totalPixels * (percentile / 100)

  // 黒点: 下位パーセンタイル
  // percentile=0 の場合は最初に出現する値を使用
  let cumulative = 0
  let blackPoint = 0
  for (let i = 0; i < 256; i++) {
    if (histogram[i]! > 0) {
      cumulative += histogram[i]!
      if (cumulative > threshold) {
        blackPoint = i
        break
      }
    }
  }

  // 白点: 上位パーセンタイル
  cumulative = 0
  let whitePoint = 255
  for (let i = 255; i >= 0; i--) {
    if (histogram[i]! > 0) {
      cumulative += histogram[i]!
      if (cumulative > threshold) {
        whitePoint = i
        break
      }
    }
  }

  // ガンマ: 中間値の位置から推定
  // 有効範囲内の平均値を計算
  let sum = 0
  let count = 0
  for (let i = blackPoint; i <= whitePoint; i++) {
    sum += i * histogram[i]!
    count += histogram[i]!
  }

  const mean = count > 0 ? sum / count : 127.5
  // 正規化された平均 (0-1)
  const range = whitePoint - blackPoint
  const normalizedMean = range > 0 ? (mean - blackPoint) / range : 0.5

  // ガンマ推定: output = input^gamma と仮定
  // 入力が均一分布(mean=0.5)だったとすると、出力の平均 = normalizedMean
  // 0.5^gamma = normalizedMean → gamma = log(normalizedMean) / log(0.5)
  // normalizedMean が 0.5 なら gamma = 1.0
  // normalizedMean < 0.5 なら gamma > 1.0 (暗い画像)
  // normalizedMean > 0.5 なら gamma < 1.0 (明るい画像)
  const gamma = normalizedMean > 0.01 && normalizedMean < 0.99
    ? Math.log(normalizedMean) / Math.log(0.5)
    : 1.0

  // ガンマをクランプ (極端な値を避ける)
  const clampedGamma = Math.max(0.2, Math.min(5.0, gamma))

  return { blackPoint, whitePoint, gamma: clampedGamma }
}

/** チャンネルLUTを生成 (プロファイルを適用) */
function createChannelLut(tone: ChannelTone): Float32Array {
  const lut = new Float32Array(256)
  const { blackPoint, whitePoint, gamma } = tone

  for (let i = 0; i < 256; i++) {
    // 入力を 0-1 に正規化
    const normalized = i / 255

    // ガンマ適用
    const gammaCorrected = Math.pow(normalized, gamma)

    // 黒点・白点でスケーリング
    const output = blackPoint / 255 + gammaCorrected * (whitePoint - blackPoint) / 255

    lut[i] = Math.max(0, Math.min(1, output))
  }

  return lut
}

/** 逆チャンネルLUTを生成 (プロファイルを除去) */
function createInverseChannelLut(tone: ChannelTone): Float32Array {
  const lut = new Float32Array(256)
  const { blackPoint, whitePoint, gamma } = tone
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
}

/**
 * 詳細なチャンネルカーブを抽出
 * ヒストグラムからCDF、簡易パラメータ、コントロールポイントを計算
 */
function extractChannelCurve(
  histogram: Uint32Array,
  totalPixels: number,
  percentile: number,
  numControlPoints: number
): ChannelCurve {
  // 簡易パラメータを抽出
  const tone = extractChannelTone(histogram, totalPixels, percentile)

  // CDFを計算
  const cdf = computeCdf(histogram, totalPixels)

  // CDFからコントロールポイントを抽出
  const controlPoints = extractControlPoints(cdf, numControlPoints)

  return { tone, cdf, controlPoints }
}

/**
 * ヒストグラムから累積分布関数(CDF)を計算
 * 入力値 i に対して、値が i 以下のピクセルの割合を返す
 * これを「入力→出力」マッピングとして使用
 */
function computeCdf(histogram: Uint32Array, totalPixels: number): Float32Array {
  const cdf = new Float32Array(256)

  if (totalPixels === 0) {
    // 空の画像の場合はリニア
    for (let i = 0; i < 256; i++) {
      cdf[i] = i / 255
    }
    return cdf
  }

  // 累積和を計算
  let cumulative = 0
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i] ?? 0
    cdf[i] = cumulative / totalPixels
  }

  return cdf
}

/**
 * CDFからコントロールポイントを抽出
 * 等間隔の入力値に対する出力値を取得
 */
function extractControlPoints(cdf: Float32Array, numPoints: number): CurvePoint[] {
  const points: CurvePoint[] = []

  for (let i = 0; i < numPoints; i++) {
    // 入力値: 0, 1/(n-1), 2/(n-1), ..., 1
    const input = i / (numPoints - 1)
    // CDFから出力値を補間取得
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
 * CDFの逆関数を計算
 * 出力値 y に対して、CDF(x) = y となる x を求める
 */
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
// 画像解析ヘルパー関数
// ============================================

/**
 * ヒストグラムから統計情報を計算
 */
function computeHistogramStats(histogram: Uint32Array, totalPixels: number): HistogramStats {
  if (totalPixels === 0) {
    return { mean: 0, median: 0, stdDev: 0, skewness: 0 }
  }

  // 平均
  let sum = 0
  for (let i = 0; i < 256; i++) {
    sum += i * (histogram[i] ?? 0)
  }
  const mean = sum / totalPixels

  // 中央値
  let cumulative = 0
  let median = 0
  const halfTotal = totalPixels / 2
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i] ?? 0
    if (cumulative >= halfTotal) {
      median = i
      break
    }
  }

  // 標準偏差と歪度
  let variance = 0
  let skewnessSum = 0
  for (let i = 0; i < 256; i++) {
    const count = histogram[i] ?? 0
    const diff = i - mean
    variance += diff * diff * count
    skewnessSum += diff * diff * diff * count
  }
  const stdDev = Math.sqrt(variance / totalPixels)

  // 歪度 = E[(X - μ)³] / σ³
  const skewness = stdDev > 0 ? (skewnessSum / totalPixels) / (stdDev * stdDev * stdDev) : 0

  return { mean, median, stdDev, skewness }
}

/**
 * ダイナミックレンジを計算
 */
function computeDynamicRange(
  luminanceHist: Uint32Array,
  totalPixels: number,
  meanLuminance: number
): DynamicRange {
  // 黒点・白点を1%パーセンタイルで検出
  const threshold = totalPixels * 0.01

  let cumulative = 0
  let blackPoint = 0
  for (let i = 0; i < 256; i++) {
    if ((luminanceHist[i] ?? 0) > 0) {
      cumulative += luminanceHist[i] ?? 0
      if (cumulative > threshold) {
        blackPoint = i
        break
      }
    }
  }

  cumulative = 0
  let whitePoint = 255
  for (let i = 255; i >= 0; i--) {
    if ((luminanceHist[i] ?? 0) > 0) {
      cumulative += luminanceHist[i] ?? 0
      if (cumulative > threshold) {
        whitePoint = i
        break
      }
    }
  }

  const range = whitePoint - blackPoint
  const contrastRatio = blackPoint > 0 ? whitePoint / blackPoint : (whitePoint > 0 ? 255 : 1)

  // キー判定 (平均輝度ベース)
  const keyValue = meanLuminance / 255
  let key: 'low' | 'normal' | 'high'
  if (keyValue < 0.35) {
    key = 'low'
  } else if (keyValue > 0.65) {
    key = 'high'
  } else {
    key = 'normal'
  }

  return { contrastRatio, range, key, keyValue }
}

/**
 * トーナルゾーンを計算
 */
function computeTonalZones(luminanceHist: Uint32Array, totalPixels: number): TonalZoneStats {
  // ゾーン定義: shadows (0-85), midtones (86-170), highlights (171-255)
  const zones = [
    { range: [0, 85] as [number, number], count: 0, sum: 0 },
    { range: [86, 170] as [number, number], count: 0, sum: 0 },
    { range: [171, 255] as [number, number], count: 0, sum: 0 },
  ]

  for (let i = 0; i < 256; i++) {
    const count = luminanceHist[i] ?? 0
    if (i <= 85) {
      zones[0]!.count += count
      zones[0]!.sum += i * count
    } else if (i <= 170) {
      zones[1]!.count += count
      zones[1]!.sum += i * count
    } else {
      zones[2]!.count += count
      zones[2]!.sum += i * count
    }
  }

  const createZoneStats = (zone: typeof zones[0]): ZoneStats => ({
    range: zone.range,
    percentage: totalPixels > 0 ? zone.count / totalPixels : 0,
    mean: zone.count > 0 ? zone.sum / zone.count : (zone.range[0] + zone.range[1]) / 2,
  })

  return {
    shadows: createZoneStats(zones[0]!),
    midtones: createZoneStats(zones[1]!),
    highlights: createZoneStats(zones[2]!),
  }
}

/**
 * 彩度統計を計算
 */
function computeSaturationStats(
  saturationHist: Uint32Array,
  saturationValues: number[],
  totalPixels: number
): SaturationStats {
  if (totalPixels === 0) {
    return { mean: 0, median: 0, stdDev: 0, histogram: saturationHist }
  }

  // 平均
  const mean = saturationValues.reduce((a, b) => a + b, 0) / totalPixels

  // 中央値
  const sorted = [...saturationValues].sort((a, b) => a - b)
  const median = totalPixels % 2 === 0
    ? (sorted[totalPixels / 2 - 1]! + sorted[totalPixels / 2]!) / 2
    : sorted[Math.floor(totalPixels / 2)]!

  // 標準偏差
  const variance = saturationValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / totalPixels
  const stdDev = Math.sqrt(variance)

  return { mean, median, stdDev, histogram: saturationHist }
}
