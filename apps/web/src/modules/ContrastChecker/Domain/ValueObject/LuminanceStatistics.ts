import type { LuminanceMap } from './LuminanceMap'

/**
 * Region bounds for statistics calculation
 */
export type StatisticsRegion = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Result of representative Y extraction
 */
export type RepresentativeYResult = {
  /** The representative Y value for contrast calculation */
  representativeY: number
  /** The detected polarity based on mean luminance */
  polarity: 'dark-on-light' | 'light-on-dark'
  /** Mean Y value across the region */
  meanY: number
}

/**
 * Calculate percentile value from a sorted array
 * Uses linear interpolation for non-integer indices
 *
 * @param sortedData - Pre-sorted array of values
 * @param percentile - Percentile to calculate (0-100)
 * @returns The value at the specified percentile
 */
export function calculatePercentile(
  sortedData: Float32Array | number[],
  percentile: number
): number {
  if (sortedData.length === 0) return 0

  const p = Math.max(0, Math.min(100, percentile)) / 100
  const index = p * (sortedData.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  if (lower === upper) {
    return sortedData[lower] ?? 0
  }

  const lowerVal = sortedData[lower] ?? 0
  const upperVal = sortedData[upper] ?? 0
  const fraction = index - lower

  return lowerVal + (upperVal - lowerVal) * fraction
}

/**
 * Extract Y values from a luminance map region
 *
 * @param luminanceMap - The luminance map to extract from
 * @param region - Optional region bounds (defaults to entire map)
 * @returns Float32Array of Y values in the region
 */
function extractYValues(
  luminanceMap: LuminanceMap,
  region?: StatisticsRegion
): Float32Array {
  const startX = region?.x ?? 0
  const startY = region?.y ?? 0
  const endX = region ? startX + region.width : luminanceMap.width
  const endY = region ? startY + region.height : luminanceMap.height

  // Clamp bounds
  const clampedStartX = Math.max(0, Math.floor(startX))
  const clampedStartY = Math.max(0, Math.floor(startY))
  const clampedEndX = Math.min(luminanceMap.width, Math.ceil(endX))
  const clampedEndY = Math.min(luminanceMap.height, Math.ceil(endY))

  const width = clampedEndX - clampedStartX
  const height = clampedEndY - clampedStartY

  if (width <= 0 || height <= 0) {
    return new Float32Array(0)
  }

  const values = new Float32Array(width * height)
  let idx = 0

  for (let y = clampedStartY; y < clampedEndY; y++) {
    for (let x = clampedStartX; x < clampedEndX; x++) {
      values[idx++] = luminanceMap.data[y * luminanceMap.width + x] ?? 0
    }
  }

  return values
}

/**
 * Extract representative Y value from a luminance map for contrast calculation
 *
 * Uses percentile-based selection to ensure text contrast works even in
 * worst-case areas:
 * - For light backgrounds (mean Y > 0.5): Uses 10th percentile (darkest areas)
 *   because dark text contrast is worst against darker regions
 * - For dark backgrounds (mean Y <= 0.5): Uses 90th percentile (lightest areas)
 *   because light text contrast is worst against lighter regions
 *
 * @param luminanceMap - The luminance map to analyze
 * @param region - Optional region bounds (defaults to entire map)
 * @returns Representative Y value and detected polarity
 */
export function extractRepresentativeY(
  luminanceMap: LuminanceMap,
  region?: StatisticsRegion
): RepresentativeYResult {
  const values = extractYValues(luminanceMap, region)

  if (values.length === 0) {
    return {
      representativeY: 0.5,
      polarity: 'dark-on-light',
      meanY: 0.5,
    }
  }

  // Calculate mean
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!
  }
  const meanY = sum / values.length

  // Determine polarity and percentile based on mean
  const isLight = meanY > 0.5
  const polarity = isLight ? 'dark-on-light' : 'light-on-dark'

  // Sort for percentile calculation
  const sorted = new Float32Array(values)
  sorted.sort()

  // For light backgrounds, use 10th percentile (worst case for dark text)
  // For dark backgrounds, use 90th percentile (worst case for light text)
  const percentile = isLight ? 10 : 90
  const representativeY = calculatePercentile(sorted, percentile)

  return {
    representativeY,
    polarity,
    meanY,
  }
}

/**
 * Calculate multiple statistics from a luminance map region
 *
 * @param luminanceMap - The luminance map to analyze
 * @param region - Optional region bounds
 * @returns Object with mean, median, min, max, and specific percentiles
 */
export function calculateLuminanceStats(
  luminanceMap: LuminanceMap,
  region?: StatisticsRegion
): {
  mean: number
  median: number
  min: number
  max: number
  p10: number
  p90: number
} {
  const values = extractYValues(luminanceMap, region)

  if (values.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, p10: 0, p90: 0 }
  }

  // Calculate mean
  let sum = 0
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  const mean = sum / values.length

  // Sort for percentiles
  const sorted = new Float32Array(values)
  sorted.sort()

  return {
    mean,
    median: calculatePercentile(sorted, 50),
    min,
    max,
    p10: calculatePercentile(sorted, 10),
    p90: calculatePercentile(sorted, 90),
  }
}

export const $LuminanceStatistics = {
  extractRepresentativeY,
  calculatePercentile,
  calculateStats: calculateLuminanceStats,
}
