/**
 * TrackUsecase - Track CRUD操作のユースケース
 */

import type { TimelineRepository } from '../ports/TimelineRepository'
import type { Track, TrackId, ClockType, BezierPath } from '../../Track'
import { generateTrackId } from '../../Track'
import type { PhaseId } from '../../Phase'

export interface TrackUsecaseDeps {
  repository: TimelineRepository
}

export interface CreateTrackParams {
  name: string
  phaseId: PhaseId
  clock?: ClockType
  expression?: string
  bezierPath?: BezierPath
}

export interface TrackUsecase {
  createTrack(params: CreateTrackParams): Track
  getTrack(trackId: TrackId): Track | undefined
  getTracks(): Track[]
  getTracksByPhase(phaseId: PhaseId): Track[]
  updateTrack(trackId: TrackId, updates: Partial<Omit<Track, 'id'>>): void
  deleteTrack(trackId: TrackId): void
}

export const createTrackUsecase = (deps: TrackUsecaseDeps): TrackUsecase => {
  const { repository } = deps

  return {
    createTrack(params: CreateTrackParams): Track {
      const track: Track = {
        id: generateTrackId(),
        name: params.name,
        phaseId: params.phaseId,
        clock: params.clock ?? 'Phase',
        expression: params.expression ?? 'osc(t, 4000)',
        bezierPath: params.bezierPath,
      }
      repository.addTrack(track)
      return track
    },

    getTrack(trackId: TrackId): Track | undefined {
      const timeline = repository.get()
      return timeline.tracks.find((track) => track.id === trackId)
    },

    getTracks(): Track[] {
      const timeline = repository.get()
      return timeline.tracks
    },

    getTracksByPhase(phaseId: PhaseId): Track[] {
      const timeline = repository.get()
      return timeline.tracks.filter((track) => track.phaseId === phaseId)
    },

    updateTrack(trackId: TrackId, updates: Partial<Omit<Track, 'id'>>): void {
      repository.updateTrack(trackId as string, updates)
    },

    deleteTrack(trackId: TrackId): void {
      repository.removeTrack(trackId as string)
    },
  }
}
