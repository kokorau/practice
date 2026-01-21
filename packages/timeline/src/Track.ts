import type { PhaseId } from './Phase'
import type { AstNode } from '@practice/dsl'

export type TrackId = string & { readonly __brand: unique symbol }
export type ParamId = string

export type ClockType = 'Global' | 'Phase' | 'Loop'

/**
 * DSL-based Track definition
 *
 * Each track directly outputs a final parameter value via DSL expression.
 * The expression should use `t` as the time variable (in milliseconds).
 *
 * @example
 * // Oscillating value between 30 and 60
 * { targetParam: 'stripe-angle', expression: 'range(osc(t, 4000), 30, 60)' }
 *
 * // Linear interpolation from 0.1 to 0.45 over 3 seconds
 * { targetParam: 'mask-radius', expression: 'range(smoothstep(0, 3000, t), 0.1, 0.45)' }
 */
export interface DslTrack {
  id: TrackId
  name: string
  clock: ClockType
  /** Phase this track belongs to. Times are relative to phase start. */
  phaseId: PhaseId
  /** Target parameter to bind the track output to */
  targetParam: ParamId
  /** DSL expression that outputs the final parameter value. Use `t` for time in ms. */
  expression: string
  /** Internal: cached AST for the expression (populated by prepareTimeline) */
  _cachedAst?: AstNode
}

export type Track = DslTrack
