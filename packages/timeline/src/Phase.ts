import type { Ms } from './Unit'

export type PhaseId = string & { readonly __brand: unique symbol }

export type PhaseType = 'Opening' | 'Loop' | 'Ending'

export interface Phase {
  id: PhaseId
  type: PhaseType
  /** Duration in ms. undefined means infinite (for Loop phase) */
  duration?: Ms
}

export type LoopType = 'forward' | 'once' | 'pingpong'
