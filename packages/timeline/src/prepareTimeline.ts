import type { Timeline } from './Timeline'
import type { DslTrack } from './Track'
import { parse } from '@practice/dsl'

/**
 * Prepare a timeline for playback by parsing all DSL expressions
 *
 * This function pre-parses all track expressions into AST nodes and caches them
 * on the track objects. This is an optimization to avoid repeated parsing
 * during playback.
 *
 * @param timeline The timeline to prepare
 * @returns The same timeline object with cached ASTs (mutates in place)
 */
export function prepareTimeline(timeline: Timeline): Timeline {
  for (const track of timeline.tracks) {
    if (!track._cachedAst) {
      track._cachedAst = parse(track.expression)
    }
  }
  return timeline
}

/**
 * Prepare a single track by parsing its DSL expression
 *
 * @param track The track to prepare
 * @returns The same track object with cached AST (mutates in place)
 */
export function prepareTrack(track: DslTrack): DslTrack {
  if (!track._cachedAst) {
    track._cachedAst = parse(track.expression)
  }
  return track
}
