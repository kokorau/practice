/**
 * ImageAnalysis - 画像の詳細統計解析
 *
 * ヒストグラム統計、ダイナミックレンジ、トーナルゾーン、彩度、クリッピングを分析
 */

// ============================================
// 型定義
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

// ============================================
// ImageAnalysis 操作
// ============================================

export const $ImageAnalysis = {
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

// ============================================
// ヘルパー関数
// ============================================

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
