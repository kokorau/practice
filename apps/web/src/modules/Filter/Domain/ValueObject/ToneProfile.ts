/**
 * ToneProfile - 画像から抽出した色調プロファイル
 *
 * 統計ベースのアプローチで、各チャンネルの黒点・白点・ガンマを抽出し、
 * それを再現する1D LUTを生成する
 */

import { type Lut1D, $Lut1D } from './Lut1D'

/** 単一チャンネルの色調パラメータ */
export type ChannelTone = {
  /** 黒点 (0-255) - シャドウの切り詰め位置 */
  blackPoint: number
  /** 白点 (0-255) - ハイライトの切り詰め位置 */
  whitePoint: number
  /** ガンマ (0.1-10) - 中間調の明るさ。1.0=リニア、<1=明るく、>1=暗く */
  gamma: number
}

/** RGB各チャンネルの色調プロファイル */
export type ToneProfile = {
  r: ChannelTone
  g: ChannelTone
  b: ChannelTone
}

/** ヒストグラム (各チャンネル256ビン) */
type Histogram = {
  r: Uint32Array
  g: Uint32Array
  b: Uint32Array
}

/** ToneProfile 操作 */
export const $ToneProfile = {
  /** ニュートラル（無変換）プロファイル */
  neutral: (): ToneProfile => ({
    r: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
    g: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
    b: { blackPoint: 0, whitePoint: 255, gamma: 1.0 },
  }),

  /**
   * ImageData から ToneProfile を抽出
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
