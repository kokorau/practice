/**
 * TimelineSliceAdapter - SiteRepositoryから特定ページのTimelineへのスライスビュー
 *
 * SiteRepositoryの特定ページのtimelineフィールドに対するTimelineRepository互換のアダプター
 */

import type {
  TimelineRepository,
  TimelineSubscriber,
  TimelineUnsubscribe,
} from '@practice/timeline/Application'
import type { Timeline } from '@practice/timeline'
import type { Track } from '@practice/timeline'
import type { Phase, LoopType } from '@practice/timeline'
import type { SiteRepository } from '../Application/ports/SiteRepository'
import type { PageUuid } from '../Domain/ValueObject/Site'

const createDefaultTimeline = (): Timeline => ({
  tracks: [],
  phases: [],
  loopType: 'none',
})

export const createTimelineSlice = (
  siteRepository: SiteRepository,
  pageId: PageUuid
): TimelineRepository => {
  const getTimeline = (): Timeline => {
    return siteRepository.getTimeline(pageId) ?? createDefaultTimeline()
  }

  return {
    get: (): Timeline => {
      return getTimeline()
    },

    set: (timeline: Timeline): void => {
      siteRepository.updateTimeline(pageId, timeline)
    },

    subscribe: (subscriber: TimelineSubscriber): TimelineUnsubscribe => {
      let lastTimeline = getTimeline()

      return siteRepository.subscribe((site) => {
        const currentTimeline = site.pages[pageId]?.timeline
        // Only notify if timeline actually changed
        if (currentTimeline && currentTimeline !== lastTimeline) {
          lastTimeline = currentTimeline
          subscriber(currentTimeline)
        }
      })
    },

    // Track Operations
    addTrack: (track: Track): void => {
      const timeline = getTimeline()
      siteRepository.updateTimeline(pageId, {
        ...timeline,
        tracks: [...timeline.tracks, track],
      })
    },

    updateTrack: (trackId: string, updates: Partial<Track>): void => {
      const timeline = getTimeline()
      siteRepository.updateTimeline(pageId, {
        ...timeline,
        tracks: timeline.tracks.map((track) =>
          track.id === trackId ? { ...track, ...updates } : track
        ),
      })
    },

    removeTrack: (trackId: string): void => {
      const timeline = getTimeline()
      siteRepository.updateTimeline(pageId, {
        ...timeline,
        tracks: timeline.tracks.filter((track) => track.id !== trackId),
      })
    },

    // Phase Operations
    addPhase: (phase: Phase): void => {
      const timeline = getTimeline()
      siteRepository.updateTimeline(pageId, {
        ...timeline,
        phases: [...timeline.phases, phase],
      })
    },

    updatePhase: (phaseId: string, updates: Partial<Phase>): void => {
      const timeline = getTimeline()
      siteRepository.updateTimeline(pageId, {
        ...timeline,
        phases: timeline.phases.map((phase) =>
          phase.id === phaseId ? { ...phase, ...updates } : phase
        ),
      })
    },

    removePhase: (phaseId: string): void => {
      const timeline = getTimeline()
      siteRepository.updateTimeline(pageId, {
        ...timeline,
        phases: timeline.phases.filter((phase) => phase.id !== phaseId),
      })
    },

    // Loop Type
    setLoopType: (loopType: LoopType): void => {
      const timeline = getTimeline()
      siteRepository.updateTimeline(pageId, {
        ...timeline,
        loopType,
      })
    },
  }
}
