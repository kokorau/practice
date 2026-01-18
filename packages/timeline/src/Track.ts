import type { Envelope } from './Envelope'
import type { Generator } from './Generator'
import type { PhaseId } from './Phase'

export type TrackId = string & { readonly __brand: unique symbol }

export type ClockType = 'Global' | 'Phase' | 'Loop'

interface BaseTrack {
  id: TrackId
  name: string
  clock: ClockType
  /** Phase this track belongs to. Times in envelope are relative to phase start. */
  phaseId: PhaseId
}

export interface EnvelopeTrack extends BaseTrack {
  mode: 'Envelope'
  envelope: Envelope
}

export interface GeneratorTrack extends BaseTrack {
  mode: 'Generator'
  generator: Generator
}

export type Track = EnvelopeTrack | GeneratorTrack
