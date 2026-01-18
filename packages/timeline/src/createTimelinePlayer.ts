import type { Timeline } from './Timeline'
import type { TimelinePlayer, FrameState } from './Player'
import type { Binding, ParamId } from './Binding'
import type { Ms } from './Unit'
import type { PhaseId } from './Phase'
import { evaluateTrack } from './evaluate'

export interface CreateTimelinePlayerOptions {
  timeline: Timeline
  bindings: Binding[]
}

interface PhaseBoundary {
  startMs: Ms
  endMs: Ms
  duration: Ms
}

/**
 * Create a timeline player instance
 */
export function createTimelinePlayer(options: CreateTimelinePlayerOptions): TimelinePlayer {
  const { timeline, bindings } = options

  // Calculate phase boundaries
  const phaseBoundaries = new Map<PhaseId, PhaseBoundary>()
  let accumulated: Ms = 0
  for (const phase of timeline.phases) {
    const duration = phase.duration ?? Infinity
    phaseBoundaries.set(phase.id, {
      startMs: accumulated,
      endMs: accumulated + duration,
      duration,
    })
    accumulated += duration
  }

  // Calculate total duration (infinite phases contribute Infinity)
  const totalDuration = accumulated

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

      // Get phase boundary for this track
      const boundary = phaseBoundaries.get(track.phaseId)
      if (!boundary) continue

      // Determine track evaluation time based on phase state
      let trackTime: Ms
      let rawValue: number

      if (playhead < boundary.startMs) {
        // Phase hasn't started yet - use initial value (evaluate at time 0)
        trackTime = 0
        rawValue = evaluateTrack(track, trackTime)
      } else if (playhead >= boundary.endMs) {
        // Phase has ended - use final value (evaluate at phase duration)
        trackTime = boundary.duration
        rawValue = evaluateTrack(track, trackTime)
      } else {
        // Currently in this phase - evaluate at phase-relative time
        const phaseRelativeTime = playhead - boundary.startMs

        // For Loop clock, wrap the time within the generator's period
        if (track.clock === 'Loop' && track.mode === 'Generator') {
          trackTime = phaseRelativeTime
        } else {
          trackTime = phaseRelativeTime
        }

        rawValue = evaluateTrack(track, trackTime)
      }

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
