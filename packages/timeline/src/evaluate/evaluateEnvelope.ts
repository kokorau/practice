import type { Envelope, ControlPoint } from '../Envelope'
import type { Ms } from '../Unit'

/**
 * Evaluate envelope value at given time
 * Returns value in range [0, 1] (or extrapolated if outside control points)
 */
export function evaluateEnvelope(envelope: Envelope, time: Ms): number {
  const { points, interpolation } = envelope

  if (points.length === 0) {
    return 0
  }

  if (points.length === 1) {
    return points[0]!.value
  }

  // Sort points by time (defensive)
  const sorted = [...points].sort((a, b) => a.time - b.time)

  // Before first point
  if (time <= sorted[0]!.time) {
    return sorted[0]!.value
  }

  // After last point
  if (time >= sorted[sorted.length - 1]!.time) {
    return sorted[sorted.length - 1]!.value
  }

  // Find surrounding points
  let p0: ControlPoint = sorted[0]!
  let p1: ControlPoint = sorted[1]!

  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i]!.time && time <= sorted[i + 1]!.time) {
      p0 = sorted[i]!
      p1 = sorted[i + 1]!
      break
    }
  }

  // Calculate interpolation factor (0 to 1)
  const duration = p1.time - p0.time
  const t = duration === 0 ? 0 : (time - p0.time) / duration

  if (interpolation === 'Linear') {
    return lerp(p0.value, p1.value, t)
  }

  // Bezier (cubic ease-in-out for now)
  return lerp(p0.value, p1.value, cubicEaseInOut(t))
}

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Cubic ease-in-out (simple bezier approximation)
 */
function cubicEaseInOut(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}
