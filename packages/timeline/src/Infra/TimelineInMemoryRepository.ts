/**
 * TimelineInMemoryRepository - タイムラインのインメモリ実装
 */

import type {
  TimelineRepository,
  TimelineSubscriber,
  TimelineUnsubscribe,
} from '../Application/ports/TimelineRepository'
import type { Timeline } from '../Timeline'
import type { Track } from '../Track'
import type { Phase, LoopType } from '../Phase'

export interface CreateTimelineInMemoryRepositoryOptions {
  initialTimeline?: Timeline
}

const createDefaultTimeline = (): Timeline => ({
  tracks: [],
  phases: [],
  loopType: 'none',
})

export const createTimelineInMemoryRepository = (
  options: CreateTimelineInMemoryRepositoryOptions = {}
): TimelineRepository => {
  let timeline: Timeline = options.initialTimeline ?? createDefaultTimeline()
  const subscribers = new Set<TimelineSubscriber>()

  const notifySubscribers = () => {
    for (const callback of subscribers) {
      callback(timeline)
    }
  }

  return {
    get: () => timeline,

    set: (newTimeline: Timeline) => {
      timeline = newTimeline
      notifySubscribers()
    },

    subscribe: (subscriber: TimelineSubscriber): TimelineUnsubscribe => {
      subscribers.add(subscriber)
      return () => {
        subscribers.delete(subscriber)
      }
    },

    // Track Operations
    addTrack: (track: Track) => {
      timeline = {
        ...timeline,
        tracks: [...timeline.tracks, track],
      }
      notifySubscribers()
    },

    updateTrack: (trackId: string, updates: Partial<Track>) => {
      timeline = {
        ...timeline,
        tracks: timeline.tracks.map((track) =>
          track.id === trackId ? { ...track, ...updates } : track
        ),
      }
      notifySubscribers()
    },

    removeTrack: (trackId: string) => {
      timeline = {
        ...timeline,
        tracks: timeline.tracks.filter((track) => track.id !== trackId),
      }
      notifySubscribers()
    },

    // Phase Operations
    addPhase: (phase: Phase) => {
      timeline = {
        ...timeline,
        phases: [...timeline.phases, phase],
      }
      notifySubscribers()
    },

    updatePhase: (phaseId: string, updates: Partial<Phase>) => {
      timeline = {
        ...timeline,
        phases: timeline.phases.map((phase) =>
          phase.id === phaseId ? { ...phase, ...updates } : phase
        ),
      }
      notifySubscribers()
    },

    removePhase: (phaseId: string) => {
      timeline = {
        ...timeline,
        phases: timeline.phases.filter((phase) => phase.id !== phaseId),
      }
      notifySubscribers()
    },

    // Loop Type
    setLoopType: (loopType: LoopType) => {
      timeline = {
        ...timeline,
        loopType,
      }
      notifySubscribers()
    },
  }
}
