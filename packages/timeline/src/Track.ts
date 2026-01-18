import type { Envelope } from './Envelope'
import type { Generator } from './Generator'

export type TrackId = string & { readonly __brand: unique symbol }

export type ClockType = 'Global' | 'Phase' | 'Loop'

interface BaseTrack {
  id: TrackId
  name: string
  clock: ClockType
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
