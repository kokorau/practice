import type { Photo } from './Photo'
import { type Histogram, $Histogram } from './Histogram'

export type PhotoAnalysis = {
  histogram: Histogram
}

export const $PhotoAnalysis = {
  create: (photo: Photo): PhotoAnalysis => ({
    histogram: $Histogram.create(photo),
  }),
}
