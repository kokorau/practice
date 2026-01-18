import type { Track } from '../Track'
import type { Ms } from '../Unit'
import { evaluateEnvelope } from './evaluateEnvelope'
import { evaluateGenerator } from './evaluateGenerator'

/**
 * Evaluate track value at given time
 * Returns value in range [0, 1]
 */
export function evaluateTrack(track: Track, time: Ms): number {
  switch (track.mode) {
    case 'Envelope':
      return evaluateEnvelope(track.envelope, time)
    case 'Generator':
      return evaluateGenerator(track.generator, time)
    default:
      return 0
  }
}
