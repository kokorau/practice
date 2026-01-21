import type { Ms } from './Unit'
import type { ParamId } from './Track'

export interface FrameState {
  time: Ms
  params: Record<ParamId, number>
}

export interface TimelinePlayer {
  play(): void
  pause(): void
  seek(playhead: Ms): void
  update(engineTime: Ms): FrameState
}
