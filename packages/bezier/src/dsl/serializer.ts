/**
 * SVG path serializer
 * Converts BezierPath to SVG path string
 */

import type { BezierPath } from '../types'

export type SerializeOptions = {
  /** Number of decimal places for coordinates (default: 4) */
  precision?: number
  /** Use S (smooth) command when possible (default: true) */
  useSmooth?: boolean
}

const round = (n: number, precision: number): number => {
  const factor = Math.pow(10, precision)
  return Math.round(n * factor) / factor
}

const formatNum = (n: number, precision: number): string => {
  const rounded = round(n, precision)
  // Remove trailing zeros after decimal point
  return rounded.toString()
}

/**
 * Check if two handles are negatives of each other (smooth constraint)
 */
const areSmoothHandles = (
  handleInDx: number,
  handleInDy: number,
  handleOutDx: number,
  handleOutDy: number,
  tolerance: number = 1e-6
): boolean => {
  // For smooth: handleOut = -handleIn, i.e., handleIn + handleOut = 0
  return (
    Math.abs(handleInDx + handleOutDx) < tolerance &&
    Math.abs(handleInDy + handleOutDy) < tolerance
  )
}

/**
 * Serialize a BezierPath to SVG path string
 */
export const serialize = (path: BezierPath, options: SerializeOptions = {}): string => {
  const { precision = 4, useSmooth = true } = options
  const { anchors } = path

  if (anchors.length < 2) {
    return ''
  }

  const parts: string[] = []

  // Move to first point
  const first = anchors[0]!
  parts.push(`M ${formatNum(first.x, precision)} ${formatNum(first.y, precision)}`)

  // Process each segment
  for (let i = 0; i < anchors.length - 1; i++) {
    const p0 = anchors[i]!
    const p1 = anchors[i + 1]!

    // Calculate control points
    const cp1x = p0.x + p0.handleOut.dx
    const cp1y = p0.y + p0.handleOut.dy
    const cp2x = p1.x + p1.handleIn.dx
    const cp2y = p1.y + p1.handleIn.dy

    // Check if we can use L command (straight line)
    const isLine =
      Math.abs(p0.handleOut.dx) < 1e-6 &&
      Math.abs(p0.handleOut.dy) < 1e-6 &&
      Math.abs(p1.handleIn.dx) < 1e-6 &&
      Math.abs(p1.handleIn.dy) < 1e-6

    if (isLine) {
      parts.push(`L ${formatNum(p1.x, precision)} ${formatNum(p1.y, precision)}`)
      continue
    }

    // Check if we can use S command (smooth curve)
    // S command requires that cp1 is the reflection of the previous cp2
    // prev cp2 = p0 + p0.handleIn (from previous segment)
    // cp1 = p0 + p0.handleOut (for current segment)
    // For S: cp1 = 2*p0 - prevCp2 = p0 - p0.handleIn
    // So p0.handleOut = -p0.handleIn
    let canUseSmooth = false
    if (useSmooth && i > 0) {
      canUseSmooth = areSmoothHandles(
        p0.handleIn.dx,
        p0.handleIn.dy,
        p0.handleOut.dx,
        p0.handleOut.dy
      )
    }

    if (canUseSmooth) {
      parts.push(
        `S ${formatNum(cp2x, precision)} ${formatNum(cp2y, precision)} ` +
          `${formatNum(p1.x, precision)} ${formatNum(p1.y, precision)}`
      )
    } else {
      parts.push(
        `C ${formatNum(cp1x, precision)} ${formatNum(cp1y, precision)} ` +
          `${formatNum(cp2x, precision)} ${formatNum(cp2y, precision)} ` +
          `${formatNum(p1.x, precision)} ${formatNum(p1.y, precision)}`
      )
    }
  }

  return parts.join(' ')
}
