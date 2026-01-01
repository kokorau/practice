import type { Oklch } from '@practice/color'
import { apcaFromOklch } from '@practice/color'

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
  method: 'last-passing' | 'fallback-best'
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

// ============================================================================
// Namespace Export
// ============================================================================

export const $NeutralSelection = {
  selectByApca: selectNeutralByApca,
  selectClosestToApca: selectNeutralClosestToApca,
  TARGETS: APCA_INK_TARGETS,
  DISABLED_TARGETS: APCA_DISABLED_TARGETS,
}
