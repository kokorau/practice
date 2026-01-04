/**
 * APCA contrast score histogram data
 * 10 bins representing score ranges: 0-10, 10-20, ..., 90-100
 */
export type ContrastHistogram = {
  /** Percentage of pixels in each score bin (0-100%) */
  bins: number[]
  /** Total number of analyzed pixels */
  totalPixels: number
}

/**
 * Result of contrast analysis for a text region
 */
export type ContrastAnalysisResult = {
  /** Minimum guaranteed APCA Lc score (based on threshold percentage) */
  score: number
  /** Histogram distribution of APCA scores */
  histogram: ContrastHistogram
  /** Text color Y (luminance) value */
  textY: number
}

/**
 * Calculate the minimum guaranteed score from histogram
 * Returns the lowest score bin where cumulative percentage exceeds threshold
 *
 * @param histogram - Score distribution histogram
 * @param thresholdPercent - Percentage threshold (e.g., 2 means 2% of pixels can be below the score)
 * @returns Minimum guaranteed APCA Lc score (0-100)
 */
export function calculateMinimumScore(
  histogram: ContrastHistogram,
  thresholdPercent: number
): number {
  for (let i = 0; i < histogram.bins.length; i++) {
    if (histogram.bins[i]! >= thresholdPercent) {
      return i * 10 // Return lower bound of the range
    }
  }
  return 100 // All ranges below threshold, max score
}

/**
 * Create an empty histogram with 10 bins
 */
export function createEmptyHistogram(): ContrastHistogram {
  return {
    bins: new Array(10).fill(0),
    totalPixels: 0,
  }
}

export const $ContrastScore = {
  calculateMinimumScore,
  createEmptyHistogram,
}
