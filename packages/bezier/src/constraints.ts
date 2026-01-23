/**
 * Bezier path constraints: X monotonicity, handleMode constraints
 */

import type { BezierPath } from './types'

/** Minimum gap between adjacent anchor X values */
const MIN_X_GAP = 0.001

/**
 * Validate that X values are monotonically increasing
 */
export const isValid = (path: BezierPath): boolean => {
  const { anchors } = path
  if (anchors.length < 2) return false

  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i]!.x <= anchors[i - 1]!.x) {
      return false
    }
  }

  // Check that first anchor is at x=0 and last is at x=1
  if (anchors[0]!.x !== 0 || anchors[anchors.length - 1]!.x !== 1) {
    return false
  }

  return true
}

/**
 * Get allowed X range for an anchor (to maintain monotonicity)
 */
export const getXConstraints = (
  path: BezierPath,
  index: number
): { min: number; max: number } => {
  const { anchors } = path

  // First and last anchors are fixed at 0 and 1
  if (index === 0) {
    return { min: 0, max: 0 }
  }
  if (index === anchors.length - 1) {
    return { min: 1, max: 1 }
  }

  const min = anchors[index - 1]!.x + MIN_X_GAP
  const max = anchors[index + 1]!.x - MIN_X_GAP

  return { min, max }
}
