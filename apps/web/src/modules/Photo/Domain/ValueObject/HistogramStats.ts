import type { Histogram } from './Histogram'

export type ChannelStats = {
  mean: number           // 0-255 平均値
  shadows: number        // 0-85 の割合 (0-1)
  midtones: number       // 86-170 の割合 (0-1)
  highlights: number     // 171-255 の割合 (0-1)
  clippedBlack: number   // 0 の割合 (0-1) 黒潰れ
  clippedWhite: number   // 255 の割合 (0-1) 白飛び
}

export type HistogramStats = {
  r: ChannelStats
  g: ChannelStats
  b: ChannelStats
  luminance: ChannelStats  // OKLAB L (perceptually uniform)
}

const calcChannelStats = (channel: Uint32Array): ChannelStats => {
  let total = 0
  let sum = 0
  let shadows = 0
  let midtones = 0
  let highlights = 0

  for (let i = 0; i < 256; i++) {
    const count = channel[i] ?? 0
    total += count
    sum += i * count

    if (i <= 85) {
      shadows += count
    } else if (i <= 170) {
      midtones += count
    } else {
      highlights += count
    }
  }

  if (total === 0) {
    return {
      mean: 0,
      shadows: 0,
      midtones: 0,
      highlights: 0,
      clippedBlack: 0,
      clippedWhite: 0,
    }
  }

  return {
    mean: sum / total,
    shadows: shadows / total,
    midtones: midtones / total,
    highlights: highlights / total,
    clippedBlack: (channel[0] ?? 0) / total,
    clippedWhite: (channel[255] ?? 0) / total,
  }
}

export const $HistogramStats = {
  create: (histogram: Histogram): HistogramStats => {
    return {
      r: calcChannelStats(histogram.r),
      g: calcChannelStats(histogram.g),
      b: calcChannelStats(histogram.b),
      luminance: calcChannelStats(histogram.luminance),
    }
  },
}
