import type { Oklch } from '@practice/color'
import { apcaFromOklch, $APCA, $Oklch } from '@practice/color'

/**
 * NeutralSelection
 *
 * Pure domain logic for selecting optimal neutral colors based on APCA contrast.
 * This module is independent of PrimitivePalette structure for testability.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A neutral color entry with its identifier
 */
export type NeutralEntry = {
  key: string
  color: Oklch
}

/**
 * Result of neutral selection with metadata
 */
export type NeutralSelectionResult = {
  /** Selected neutral key */
  key: string
  /** APCA Lc value (absolute) */
  absLc: number
  /** How the selection was made */
  method: 'last-passing' | 'fallback-best' | 'reverse-apca'
}

/**
 * Search direction for neutral selection
 * - 'dark-first': N9 → N0 (for light surfaces)
 * - 'light-first': N0 → N9 (for dark surfaces)
 */
export type SearchOrder = 'dark-first' | 'light-first'

// ============================================================================
// APCA Target Thresholds (Lc values)
// ============================================================================

/**
 * APCA Lc thresholds for different text roles
 * Based on APCA-W3 guidelines
 */
export const APCA_INK_TARGETS = {
  /** Body text (14-16px) - highest readability requirement */
  title: 60,       // Large text / strong emphasis
  /** Body text - standard readability */
  body: 75,        // Body text
  /** Meta text - secondary information */
  meta: 60,        // Large text equivalent
  /** Link text - same as body for accessibility */
  linkText: 75,    // Body text
  /** Highlight text - accent color emphasis (currently fixed to A) */
  highlight: 75,   // Body text equivalent
  /** Border - subtle UI element */
  border: 30,      // Non-text
  /** Divider - subtle separator */
  divider: 30,     // Same as border
} as const

/**
 * Reduced targets for disabled states
 */
export const APCA_DISABLED_TARGETS = {
  title: 45,
  body: 45,
  meta: 30,
  linkText: 45,
  highlight: 45,
  border: 15,
  divider: 15,
} as const

export type InkRole = keyof typeof APCA_INK_TARGETS

// ============================================================================
// Core Selection Logic
// ============================================================================

/**
 * Calculate APCA contrast between a neutral (as text) and surface (as background)
 */
const getApcaContrast = (neutral: Oklch, surface: Oklch): number => {
  const result = apcaFromOklch(neutral, surface)
  return result.absLc
}

/**
 * Select the optimal neutral color for text on a given surface.
 *
 * Algorithm:
 * 1. Search neutrals in specified order (dark-first or light-first)
 * 2. Track the last neutral that meets the target (just before contrast drops)
 * 3. If none meet target, return the neutral with highest contrast
 *
 * @param neutrals - Array of neutral colors to choose from
 * @param surface - Background surface color
 * @param targetLc - Minimum APCA Lc value required
 * @param order - Search direction ('dark-first' for light surfaces, 'light-first' for dark)
 * @returns Selection result with key, contrast value, and method used
 */
export const selectNeutralByApca = (
  neutrals: NeutralEntry[],
  surface: Oklch,
  targetLc: number,
  order: SearchOrder
): NeutralSelectionResult => {
  // Order neutrals based on search direction
  const ordered = order === 'dark-first'
    ? [...neutrals].sort((a, b) => a.color.L - b.color.L)  // darkest first (low L)
    : [...neutrals].sort((a, b) => b.color.L - a.color.L)  // lightest first (high L)

  let lastPassingKey: string | null = null
  let lastPassingLc = 0
  let bestKey = ordered[0]?.key ?? ''
  let bestLc = 0

  for (const { key, color } of ordered) {
    const absLc = getApcaContrast(color, surface)

    // Track best contrast found (for fallback)
    if (absLc > bestLc) {
      bestLc = absLc
      bestKey = key
    }

    if (absLc >= targetLc) {
      lastPassingKey = key
      lastPassingLc = absLc
    } else if (lastPassingKey !== null) {
      // Found first failure after some passes - return last passing
      return {
        key: lastPassingKey,
        absLc: lastPassingLc,
        method: 'last-passing',
      }
    }
  }

  // If we found any passing key, return the last one
  if (lastPassingKey !== null) {
    return {
      key: lastPassingKey,
      absLc: lastPassingLc,
      method: 'last-passing',
    }
  }

  // Fallback: return the neutral with highest contrast
  return {
    key: bestKey,
    absLc: bestLc,
    method: 'fallback-best',
  }
}

/**
 * Select the neutral closest to a target Lc value (for subtle elements like borders)
 *
 * @param neutrals - Array of neutral colors to choose from
 * @param surface - Background surface color
 * @param targetLc - Target APCA Lc value to match
 * @returns Selection result
 */
export const selectNeutralClosestToApca = (
  neutrals: NeutralEntry[],
  surface: Oklch,
  targetLc: number
): NeutralSelectionResult => {
  let bestKey = neutrals[0]?.key ?? ''
  let bestLc = 0
  let bestDiff = Infinity

  for (const { key, color } of neutrals) {
    const absLc = getApcaContrast(color, surface)
    const diff = Math.abs(absLc - targetLc)

    if (diff < bestDiff) {
      bestDiff = diff
      bestKey = key
      bestLc = absLc
    }
  }

  return {
    key: bestKey,
    absLc: bestLc,
    method: 'fallback-best', // Always "closest" match
  }
}

/**
 * Convert Oklch color to Y (luminance) value for APCA calculation
 */
const oklchToY = (color: Oklch): number => {
  const srgb = $Oklch.toSrgb(color)
  return $APCA.srgbToY(srgb)
}

/**
 * Select the optimal neutral color using reverse APCA calculation.
 *
 * Instead of iterating through neutrals and checking contrast, this function:
 * 1. Calculates the required text Y value from background Y and target Lc
 * 2. Finds the neutral whose Y value is closest to the required value
 *
 * This approach is more accurate for image/gradient backgrounds where
 * the "representative Y" is extracted from actual pixel data.
 *
 * @param neutrals - Array of neutral colors to choose from
 * @param bgY - Background luminance Y value (0-1)
 * @param targetLc - Target APCA Lc value
 * @returns Selection result with key, actual Lc, and method
 */
export const selectNeutralByReverseApca = (
  neutrals: NeutralEntry[],
  bgY: number,
  targetLc: number
): NeutralSelectionResult => {
  // Calculate required text Y using reverse APCA
  const requiredTextY = $APCA.reverseForTextY(bgY, targetLc)

  if (requiredTextY === null) {
    // Infeasible target - fallback to best contrast
    let bestKey = neutrals[0]?.key ?? ''
    let bestLc = 0

    for (const { key, color } of neutrals) {
      const neutralY = oklchToY(color)
      const absLc = Math.abs($APCA.fromY(neutralY, bgY))

      if (absLc > bestLc) {
        bestLc = absLc
        bestKey = key
      }
    }

    return {
      key: bestKey,
      absLc: bestLc,
      method: 'fallback-best',
    }
  }

  // Find neutral with Y closest to requiredTextY
  let bestKey = neutrals[0]?.key ?? ''
  let bestDiff = Infinity
  let bestY = 0

  for (const { key, color } of neutrals) {
    const neutralY = oklchToY(color)
    const diff = Math.abs(neutralY - requiredTextY)

    if (diff < bestDiff) {
      bestDiff = diff
      bestKey = key
      bestY = neutralY
    }
  }

  // Calculate actual Lc for the selected neutral
  const actualLc = Math.abs($APCA.fromY(bestY, bgY))

  return {
    key: bestKey,
    absLc: actualLc,
    method: 'reverse-apca',
  }
}

// ============================================================================
// Histogram-based Selection (Worst-case Guarantee)
// ============================================================================

/**
 * Region bounds for luminance map analysis
 */
export type AnalysisRegion = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Luminance map for background analysis
 */
export type LuminanceMapInput = {
  data: Float32Array
  width: number
  height: number
}

/**
 * Extended result with histogram-based selection
 * Note: This is a standalone type (not extending NeutralSelectionResult)
 * to avoid type intersection issues with the 'method' discriminant.
 */
export type NeutralHistogramResult = {
  /** Selected neutral key */
  key: string
  /** APCA Lc value (absolute) */
  absLc: number
  /** How the selection was made */
  method: 'histogram-soft' | 'histogram-fallback'
  /** Minimum guaranteed Lc (based on threshold) */
  guaranteedLc: number
}

/**
 * Calculate minimum guaranteed score from histogram.
 * Returns the lower bound of the first bin that exceeds the threshold.
 */
const calculateMinScore = (bins: number[], thresholdPercent: number): number => {
  for (let i = 0; i < bins.length; i++) {
    if (bins[i]! >= thresholdPercent) {
      return i * 10
    }
  }
  return 100
}

/**
 * Build APCA score histogram for a neutral color against background region.
 */
const buildHistogram = (
  textY: number,
  luminanceMap: LuminanceMapInput,
  region?: AnalysisRegion
): number[] => {
  const bins = new Array(10).fill(0)
  let totalPixels = 0

  const startX = region?.x ?? 0
  const startY = region?.y ?? 0
  const endX = region ? startX + region.width : luminanceMap.width
  const endY = region ? startY + region.height : luminanceMap.height

  const clampedStartX = Math.max(0, Math.floor(startX))
  const clampedStartY = Math.max(0, Math.floor(startY))
  const clampedEndX = Math.min(luminanceMap.width, Math.ceil(endX))
  const clampedEndY = Math.min(luminanceMap.height, Math.ceil(endY))

  for (let y = clampedStartY; y < clampedEndY; y++) {
    for (let x = clampedStartX; x < clampedEndX; x++) {
      const bgY = luminanceMap.data[y * luminanceMap.width + x]!
      const score = $APCA.fromY(textY, bgY)
      const absScore = Math.abs(score)

      const clamped = Math.min(Math.max(absScore, 0), 100)
      const binIndex = Math.min(Math.floor(clamped / 10), 9)
      bins[binIndex]++
      totalPixels++
    }
  }

  // Convert to percentages
  if (totalPixels > 0) {
    for (let i = 0; i < bins.length; i++) {
      bins[i] = (bins[i] / totalPixels) * 100
    }
  }

  return bins
}

/**
 * Select the optimal neutral color using histogram-based worst-case analysis.
 *
 * Algorithm:
 * 1. For each neutral, calculate APCA histogram against all background pixels
 * 2. Determine the "minimum guaranteed Lc" (score where threshold% of pixels pass)
 * 3. Filter neutrals that meet the target Lc
 * 4. Return the softest contrast (closest to background) that still guarantees readability
 *
 * This approach ensures worst-case pixels are readable, not just average pixels.
 *
 * @param neutrals - Array of neutral colors to choose from
 * @param luminanceMap - Background luminance map
 * @param targetLc - Minimum required APCA Lc value
 * @param region - Optional region to analyze (defaults to entire map)
 * @param thresholdPercent - Percentage of pixels allowed to fail (default 2%)
 * @returns Selection result with guaranteed Lc
 */
export const selectNeutralByHistogram = (
  neutrals: NeutralEntry[],
  luminanceMap: LuminanceMapInput,
  targetLc: number,
  region?: AnalysisRegion,
  thresholdPercent: number = 2
): NeutralHistogramResult => {
  // Calculate mean background Y to determine sort order
  let sumY = 0
  let count = 0
  const startX = region?.x ?? 0
  const startY = region?.y ?? 0
  const endX = region ? startX + region.width : luminanceMap.width
  const endY = region ? startY + region.height : luminanceMap.height

  for (let y = Math.max(0, Math.floor(startY)); y < Math.min(luminanceMap.height, Math.ceil(endY)); y++) {
    for (let x = Math.max(0, Math.floor(startX)); x < Math.min(luminanceMap.width, Math.ceil(endX)); x++) {
      sumY += luminanceMap.data[y * luminanceMap.width + x]!
      count++
    }
  }
  const meanBgY = count > 0 ? sumY / count : 0.5
  const isLightBg = meanBgY > 0.5

  // Sort neutrals: soft contrast first (closest to background brightness)
  // For light backgrounds: light neutrals first (high L)
  // For dark backgrounds: dark neutrals first (low L)
  const sorted = [...neutrals].sort((a, b) =>
    isLightBg ? b.color.L - a.color.L : a.color.L - b.color.L
  )

  // Evaluate each neutral
  type Candidate = { key: string; textY: number; guaranteedLc: number }
  const candidates: Candidate[] = []
  let bestFallback: Candidate | null = null

  for (const { key, color } of sorted) {
    const textY = oklchToY(color)
    const histogram = buildHistogram(textY, luminanceMap, region)
    const guaranteedLc = calculateMinScore(histogram, thresholdPercent)

    const candidate = { key, textY, guaranteedLc }

    if (guaranteedLc >= targetLc) {
      candidates.push(candidate)
    }

    // Track best fallback (highest guaranteed Lc)
    if (!bestFallback || guaranteedLc > bestFallback.guaranteedLc) {
      bestFallback = candidate
    }
  }

  // Return the first candidate (softest that meets target)
  if (candidates.length > 0) {
    const selected = candidates[0]!
    return {
      key: selected.key,
      absLc: selected.guaranteedLc,
      guaranteedLc: selected.guaranteedLc,
      method: 'histogram-soft',
    }
  }

  // Fallback: return the one with highest guaranteed Lc
  if (bestFallback) {
    return {
      key: bestFallback.key,
      absLc: bestFallback.guaranteedLc,
      guaranteedLc: bestFallback.guaranteedLc,
      method: 'histogram-fallback',
    }
  }

  // Should never happen, but handle empty neutrals
  return {
    key: '',
    absLc: 0,
    guaranteedLc: 0,
    method: 'histogram-fallback',
  }
}

// ============================================================================
// Namespace Export
// ============================================================================

export const $NeutralSelection = {
  selectByApca: selectNeutralByApca,
  selectClosestToApca: selectNeutralClosestToApca,
  selectByReverseApca: selectNeutralByReverseApca,
  selectByHistogram: selectNeutralByHistogram,
  TARGETS: APCA_INK_TARGETS,
  DISABLED_TARGETS: APCA_DISABLED_TARGETS,
}
