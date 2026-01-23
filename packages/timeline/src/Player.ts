import type { Ms } from './Unit'
import type { ParamId, TrackId } from './Track'

export interface FrameState {
  time: Ms
  params: Record<ParamId, number>
  /** Raw intensity values (0-1) for each track */
  intensities: Record<TrackId, number>
}

export interface TimelinePlayer {
  play(): void
  pause(): void
  seek(playhead: Ms): void
  update(engineTime: Ms): FrameState
}
