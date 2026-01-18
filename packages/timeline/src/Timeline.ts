import type { Phase, LoopType } from './Phase'
import type { Track } from './Track'

export interface Timeline {
  tracks: Track[]
  phases: Phase[]
  loopType: LoopType
}
