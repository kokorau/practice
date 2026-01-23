/**
 * Lookup table (LUT) generation and evaluation for bezier paths
 */

import type { BezierPath } from './types'
import { evaluate } from './evaluate'

/**
 * Convert bezier path to 256-point lookup table (for easing functions)
 */
export const toLut = (path: BezierPath): Float32Array => {
  const lut = new Float32Array(256)

  for (let i = 0; i < 256; i++) {
    const x = i / 255
    lut[i] = evaluate(path, x)
  }

  return lut
}

/**
 * Convert to 256-point lookup table, clamped to 0-1
 */
export const toLutClamped = (path: BezierPath): Float32Array => {
  const lut = new Float32Array(256)

  for (let i = 0; i < 256; i++) {
    const x = i / 255
    const y = evaluate(path, x)
    lut[i] = Math.max(0, Math.min(1, y))
  }

  return lut
}

/**
 * Evaluate using LUT with linear interpolation
 */
export const evaluateLut = (lut: Float32Array, x: number): number => {
  // Clamp to [0, 1]
  x = Math.max(0, Math.min(1, x))

  // Scale to LUT index
  const scaledX = x * 255
  const index = Math.floor(scaledX)

  // Handle edge case
  if (index >= 255) return lut[255]!

  // Linear interpolation between samples
  const t = scaledX - index
  return lut[index]! * (1 - t) + lut[index + 1]! * t
}
