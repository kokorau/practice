/**
 * Bezier curve evaluation utilities
 */

import type { BezierPath } from './types'

/** Number of iterations for Newton-Raphson method */
const NEWTON_ITERATIONS = 8

/** Tolerance for Newton-Raphson convergence */
const NEWTON_TOLERANCE = 1e-6

/**
 * Evaluate cubic bezier at parameter t
 */
export const cubicBezier = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const mt = 1 - t
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
}

/**
 * Derivative of cubic bezier at parameter t
 */
export const cubicBezierDerivative = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number => {
  const mt = 1 - t
  return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2)
}

/**
 * Find parameter t for a given x using Newton-Raphson method
 */
export const findTForX = (
  x0: number,
  x1: number,
  x2: number,
  x3: number,
  targetX: number
): number => {
  // Initial guess using linear interpolation
  let t = (targetX - x0) / (x3 - x0)
  t = Math.max(0, Math.min(1, t))

  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const x = cubicBezier(x0, x1, x2, x3, t)
    const error = x - targetX

    if (Math.abs(error) < NEWTON_TOLERANCE) {
      break
    }

    const dx = cubicBezierDerivative(x0, x1, x2, x3, t)
    if (Math.abs(dx) < NEWTON_TOLERANCE) {
      // Derivative too small, use bisection fallback
      break
    }

    t = t - error / dx
    t = Math.max(0, Math.min(1, t))
  }

  return t
}

/**
 * Evaluate a bezier path at a given X position (returns Y)
 */
export const evaluate = (path: BezierPath, targetX: number): number => {
  const { anchors } = path

  // Clamp to valid range
  if (targetX <= 0) return anchors[0]!.y
  if (targetX >= 1) return anchors[anchors.length - 1]!.y

  // Find the segment containing targetX
  let segmentIndex = 0
  for (let i = 0; i < anchors.length - 1; i++) {
    if (targetX >= anchors[i]!.x && targetX <= anchors[i + 1]!.x) {
      segmentIndex = i
      break
    }
  }

  const p0 = anchors[segmentIndex]!
  const p1 = anchors[segmentIndex + 1]!

  // Calculate control points
  const x0 = p0.x
  const y0 = p0.y
  const x1 = p0.x + p0.handleOut.dx
  const y1 = p0.y + p0.handleOut.dy
  const x2 = p1.x + p1.handleIn.dx
  const y2 = p1.y + p1.handleIn.dy
  const x3 = p1.x
  const y3 = p1.y

  // Find t for targetX
  const t = findTForX(x0, x1, x2, x3, targetX)

  // Return Y at this t
  return cubicBezier(y0, y1, y2, y3, t)
}
