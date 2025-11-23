import type { Photo } from './Photo'
import { type Histogram, $Histogram } from './Histogram'
import { type HistogramStats, $HistogramStats } from './HistogramStats'

export type PhotoAnalysis = {
  histogram: Histogram
  stats: HistogramStats
}

export const $PhotoAnalysis = {
  create: (photo: Photo): PhotoAnalysis => {
    const histogram = $Histogram.create(photo)
    return {
      histogram,
      stats: $HistogramStats.create(histogram),
    }
  },
}
