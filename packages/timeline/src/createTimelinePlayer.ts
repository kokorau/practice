import type { Timeline } from './Timeline'
import type { TimelinePlayer, FrameState } from './Player'
import type { ParamId, TrackId } from './Track'
import type { Ms } from './Unit'
import type { PhaseId } from './Phase'
import { evaluate, parse } from '@practice/dsl'

export interface CreateTimelinePlayerOptions {
  timeline: Timeline
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
  const { timeline } = options

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

    // Evaluate all tracks
    const params: Record<ParamId, number> = {}
    const intensities: Record<TrackId, number> = {}

    for (const track of timeline.tracks) {
      // Get phase boundary for this track
      const boundary = phaseBoundaries.get(track.phaseId)
      if (!boundary) continue

      // Determine track evaluation time based on phase state
      let trackTime: Ms

      if (playhead < boundary.startMs) {
        // Phase hasn't started yet - use initial value (evaluate at time 0)
        trackTime = 0
      } else if (playhead >= boundary.endMs) {
        // Phase has ended - use final value (evaluate at phase duration)
        trackTime = boundary.duration
      } else {
        // Currently in this phase - evaluate at phase-relative time
        trackTime = playhead - boundary.startMs
      }

      // Get or parse AST
      const ast = track._cachedAst ?? parse(track.expression)

      // Evaluate the DSL expression with time context
      const value = evaluate(ast, { t: trackTime })
      params[track.targetParam] = value
      // Store the evaluated value as intensity for this track
      intensities[track.id] = value
    }

    return {
      time: playhead,
      params,
      intensities,
    }
  }

  return { play, pause, seek, update }
}
