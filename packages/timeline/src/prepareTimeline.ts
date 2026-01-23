import type { Timeline } from './Timeline'
import type { DslTrack } from './Track'
import { parse } from '@practice/dsl'
import { toLut } from '@practice/bezier'

/**
 * Prepare a timeline for playback by parsing all DSL expressions
 * and computing bezier LUTs
 *
 * This function pre-parses all track expressions into AST nodes and caches them
 * on the track objects. For tracks with bezierPath, it computes a LUT for fast
 * evaluation during playback.
 *
 * @param timeline The timeline to prepare
 * @returns The same timeline object with cached ASTs and LUTs (mutates in place)
 */
export function prepareTimeline(timeline: Timeline): Timeline {
  for (const track of timeline.tracks) {
    // Prepare bezier LUT if bezierPath is defined
    if (track.bezierPath && !track._bezierLut) {
      track._bezierLut = toLut(track.bezierPath)
    }

    // Parse DSL expression (used when bezierPath is not defined)
    if (!track.bezierPath && !track._cachedAst && track.expression) {
      track._cachedAst = parse(track.expression)
    }
  }
  return timeline
}

/**
 * Prepare a single track by parsing its DSL expression or computing bezier LUT
 *
 * @param track The track to prepare
 * @returns The same track object with cached AST/LUT (mutates in place)
 */
export function prepareTrack(track: DslTrack): DslTrack {
  // Prepare bezier LUT if bezierPath is defined
  if (track.bezierPath && !track._bezierLut) {
    track._bezierLut = toLut(track.bezierPath)
  }

  // Parse DSL expression (used when bezierPath is not defined)
  if (!track.bezierPath && !track._cachedAst && track.expression) {
    track._cachedAst = parse(track.expression)
  }

  return track
}

/**
 * Invalidate cached bezier LUT for a track (call when bezierPath changes)
 */
export function invalidateBezierLut(track: DslTrack): void {
  track._bezierLut = undefined
}
