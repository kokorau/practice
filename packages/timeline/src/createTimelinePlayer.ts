import type { Timeline } from './Timeline'
import type { TimelinePlayer, FrameState } from './Player'
import type { Binding, ParamId } from './Binding'
import type { Ms } from './Unit'
import { evaluateTrack } from './evaluate'

export interface CreateTimelinePlayerOptions {
  timeline: Timeline
  bindings: Binding[]
}

/**
 * Create a timeline player instance
 */
export function createTimelinePlayer(options: CreateTimelinePlayerOptions): TimelinePlayer {
  const { timeline, bindings } = options

  // Calculate total duration
  const totalDuration = timeline.phases.reduce((sum, p) => sum + p.duration, 0)

  // Internal state
  let playhead: Ms = 0
  let isPlaying = false
  let lastEngineTime: Ms | null = null

  // Build track lookup
  const trackMap = new Map(timeline.tracks.map(t => [t.id, t]))

  function play(): void {
    isPlaying = true
    lastEngineTime = null
  }

  function pause(): void {
    isPlaying = false
    lastEngineTime = null
  }

  function seek(newPlayhead: Ms): void {
    playhead = Math.max(0, Math.min(newPlayhead, totalDuration))
  }

  function update(engineTime: Ms): FrameState {
    // Update playhead if playing
    if (isPlaying) {
      if (lastEngineTime !== null) {
        const delta = engineTime - lastEngineTime
        playhead += delta

        // Handle loop behavior
        if (playhead >= totalDuration) {
          switch (timeline.loopType) {
            case 'forward':
              playhead = playhead % totalDuration
              break
            case 'once':
              playhead = totalDuration
              isPlaying = false
              break
            case 'pingpong':
              // TODO: implement pingpong
              playhead = playhead % totalDuration
              break
          }
        }
      }
      lastEngineTime = engineTime
    }

    // Evaluate all tracks and apply bindings
    const params: Record<ParamId, number> = {}

    for (const binding of bindings) {
      const track = trackMap.get(binding.sourceTrack)
      if (!track) continue

      // Get time based on clock type
      const trackTime = getTrackTime(track.clock, playhead, timeline)

      // Evaluate track
      const rawValue = evaluateTrack(track, trackTime)

      // Apply range mapping
      const { min, max, clamp } = binding.map
      let mappedValue = min + rawValue * (max - min)

      if (clamp) {
        mappedValue = Math.max(min, Math.min(max, mappedValue))
      }

      params[binding.targetParam] = mappedValue
    }

    return {
      time: playhead,
      params,
    }
  }

  return { play, pause, seek, update }
}

/**
 * Get track time based on clock type
 */
function getTrackTime(clock: 'Global' | 'Phase' | 'Loop', playhead: Ms, timeline: Timeline): Ms {
  if (clock === 'Global') {
    return playhead
  }

  // Find current phase
  let accumulated = 0
  for (const phase of timeline.phases) {
    if (playhead < accumulated + phase.duration) {
      const phaseTime = playhead - accumulated

      if (clock === 'Phase') {
        return phaseTime
      }

      // Loop clock: wrap within phase
      if (clock === 'Loop' && phase.type === 'Loop') {
        return phaseTime % phase.duration
      }

      return phaseTime
    }
    accumulated += phase.duration
  }

  return playhead
}
