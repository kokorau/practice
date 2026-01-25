import { describe, it, expect } from 'vitest'
import { createTrackUsecase } from './TrackUsecase'
import { createTimelineInMemoryRepository } from '../../Infra/TimelineInMemoryRepository'
import type { PhaseId } from '../../Phase'
import type { TrackId } from '../../Track'

describe('TrackUsecase', () => {
  const createTestPhaseId = (id: string = 'phase-1') => id as PhaseId

  describe('createTrack', () => {
    it('should create a track with default values', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const track = usecase.createTrack({
        name: 'Test Track',
        phaseId: createTestPhaseId(),
      })

      expect(track.id).toBeDefined()
      expect(track.name).toBe('Test Track')
      expect(track.phaseId).toBe(createTestPhaseId())
      expect(track.clock).toBe('Phase')
      expect(track.expression).toBe('osc(t, 4000)')
    })

    it('should create a track with custom values', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const track = usecase.createTrack({
        name: 'Custom Track',
        phaseId: createTestPhaseId(),
        clock: 'Global',
        expression: 'smoothstep(0, 3000, t)',
      })

      expect(track.clock).toBe('Global')
      expect(track.expression).toBe('smoothstep(0, 3000, t)')
    })

    it('should add the track to the repository', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      usecase.createTrack({
        name: 'Test Track',
        phaseId: createTestPhaseId(),
      })

      expect(repository.get().tracks).toHaveLength(1)
    })
  })

  describe('getTrack', () => {
    it('should return track by id', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const createdTrack = usecase.createTrack({
        name: 'Test Track',
        phaseId: createTestPhaseId(),
      })

      const track = usecase.getTrack(createdTrack.id)

      expect(track).toEqual(createdTrack)
    })

    it('should return undefined for non-existent track', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const track = usecase.getTrack('non-existent' as TrackId)

      expect(track).toBeUndefined()
    })
  })

  describe('getTracks', () => {
    it('should return all tracks', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      usecase.createTrack({ name: 'Track 1', phaseId: createTestPhaseId() })
      usecase.createTrack({ name: 'Track 2', phaseId: createTestPhaseId() })

      const tracks = usecase.getTracks()

      expect(tracks).toHaveLength(2)
    })

    it('should return empty array when no tracks', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const tracks = usecase.getTracks()

      expect(tracks).toEqual([])
    })
  })

  describe('getTracksByPhase', () => {
    it('should return tracks filtered by phase', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const phase1 = createTestPhaseId('phase-1')
      const phase2 = createTestPhaseId('phase-2')

      usecase.createTrack({ name: 'Track 1', phaseId: phase1 })
      usecase.createTrack({ name: 'Track 2', phaseId: phase2 })
      usecase.createTrack({ name: 'Track 3', phaseId: phase1 })

      const tracks = usecase.getTracksByPhase(phase1)

      expect(tracks).toHaveLength(2)
      expect(tracks.every((t) => t.phaseId === phase1)).toBe(true)
    })

    it('should return empty array when no tracks for phase', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      usecase.createTrack({
        name: 'Track 1',
        phaseId: createTestPhaseId('phase-1'),
      })

      const tracks = usecase.getTracksByPhase(createTestPhaseId('phase-2'))

      expect(tracks).toEqual([])
    })
  })

  describe('updateTrack', () => {
    it('should update track properties', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const track = usecase.createTrack({
        name: 'Track 1',
        phaseId: createTestPhaseId(),
      })

      usecase.updateTrack(track.id, { name: 'Updated Track' })

      const updated = usecase.getTrack(track.id)
      expect(updated?.name).toBe('Updated Track')
    })

    it('should update multiple properties', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const track = usecase.createTrack({
        name: 'Track 1',
        phaseId: createTestPhaseId(),
      })

      usecase.updateTrack(track.id, {
        name: 'Updated Track',
        expression: 'div(t, 1000)',
        clock: 'Loop',
      })

      const updated = usecase.getTrack(track.id)
      expect(updated?.name).toBe('Updated Track')
      expect(updated?.expression).toBe('div(t, 1000)')
      expect(updated?.clock).toBe('Loop')
    })
  })

  describe('deleteTrack', () => {
    it('should delete track from repository', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const track = usecase.createTrack({
        name: 'Track 1',
        phaseId: createTestPhaseId(),
      })

      usecase.deleteTrack(track.id)

      expect(usecase.getTracks()).toHaveLength(0)
    })

    it('should only delete specified track', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createTrackUsecase({ repository })

      const track1 = usecase.createTrack({
        name: 'Track 1',
        phaseId: createTestPhaseId(),
      })
      usecase.createTrack({
        name: 'Track 2',
        phaseId: createTestPhaseId(),
      })

      usecase.deleteTrack(track1.id)

      expect(usecase.getTracks()).toHaveLength(1)
      expect(usecase.getTracks()[0].name).toBe('Track 2')
    })
  })
})
