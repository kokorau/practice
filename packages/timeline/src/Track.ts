import type { PhaseId } from './Phase'
import type { AstNode } from '@practice/dsl'
import type { BezierPath } from '@practice/bezier'

export type { BezierPath, BezierAnchor } from '@practice/bezier'

export type TrackId = string & { readonly __brand: unique symbol }

/**
 * Generate a random 5-character lowercase alphabetic ID
 * Format: [a-z]{5} (e.g., 'abcde', 'xyzab')
 */
const generateRandomId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a new unique TrackId using [a-z]{5} format
 *
 * Use this function when creating new tracks dynamically.
 * For static/mock data, use fixed ID strings as constants.
 *
 * @param existingIds - Optional set of existing track IDs to avoid collisions
 * @param maxAttempts - Maximum number of generation attempts (default: 100)
 *
 * @example
 * const newTrack: Track = {
 *   id: generateTrackId(),
 *   name: 'My Track',
 *   // ...
 * }
 *
 * // With collision check
 * const existingIds = new Set(tracks.map(t => t.id))
 * const id = generateTrackId(existingIds)
 */
export const generateTrackId = (
  existingIds?: Set<TrackId> | Set<string>,
  maxAttempts = 100,
): TrackId => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generateRandomId() as TrackId
    if (!existingIds || !existingIds.has(id as string)) {
      return id
    }
  }
  throw new Error(`Failed to generate unique TrackId after ${maxAttempts} attempts`)
}

export type ClockType = 'Global' | 'Phase' | 'Loop'

/**
 * DSL-based Track definition
 *
 * Each track outputs a normalized intensity (0-1) via DSL expression.
 * The expression should use `t` as the time variable (in milliseconds).
 * The config's RangeExpr references the trackId to map the intensity to a value range.
 *
 * @example
 * // Oscillating intensity 0-1
 * { id: 'track-stripe-angle', expression: 'osc(t, 4000)' }
 *
 * // Linear interpolation 0-1 over 3 seconds
 * { id: 'track-mask-radius', expression: 'smoothstep(0, 3000, t)' }
 *
 * // Custom bezier easing (when bezierPath is set, expression is ignored)
 * { id: 'track-custom', bezierPath: { anchors: [...] }, expression: '' }
 */
export interface DslTrack {
  id: TrackId
  name: string
  clock: ClockType
  /** Phase this track belongs to. Times are relative to phase start. */
  phaseId: PhaseId
  /** DSL expression that outputs a normalized intensity (0-1). Use `t` for time in ms. */
  expression: string
  /** Internal: cached AST for the expression (populated by prepareTimeline) */
  _cachedAst?: AstNode
  /** Optional: Custom bezier easing curve. When set, overrides expression evaluation. */
  bezierPath?: BezierPath
  /** Internal: cached LUT for bezier evaluation (256 samples) */
  _bezierLut?: Float32Array
}

export type Track = DslTrack
