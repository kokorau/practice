import type { Ms } from './Unit'

export type PhaseId = string & { readonly __brand: unique symbol }

export type PhaseType = 'Opening' | 'Loop' | 'Ending'

export interface Phase {
  id: PhaseId
  type: PhaseType
  duration: Ms
}

export type LoopType = 'forward' | 'once' | 'pingpong'
