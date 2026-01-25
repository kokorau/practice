import type { Ms } from './Unit'

export type PhaseId = string & { readonly __brand: unique symbol }

/**
 * Generate a new unique PhaseId using crypto.randomUUID()
 *
 * Use this function when creating new phases dynamically.
 * For static/mock data, use fixed UUID strings as constants.
 */
export const generatePhaseId = (): PhaseId => crypto.randomUUID() as PhaseId

export type PhaseType = 'Opening' | 'Loop' | 'Ending'

export interface Phase {
  id: PhaseId
  type: PhaseType
  /** Duration in ms. undefined means infinite (for Loop phase) */
  duration?: Ms
}

export type LoopType = 'forward' | 'once' | 'pingpong'
