import { describe, it, expect } from 'vitest'
import { createPhaseUsecase } from './PhaseUsecase'
import { createTrackUsecase } from './TrackUsecase'
import { createTimelineInMemoryRepository } from '../../Infra/TimelineInMemoryRepository'
import type { PhaseId } from '../../Phase'

describe('PhaseUsecase', () => {
  describe('createPhase', () => {
    it('should create a phase with type and duration', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phase = usecase.createPhase({
        type: 'Opening',
        duration: 3000,
      })

      expect(phase.id).toBeDefined()
      expect(phase.type).toBe('Opening')
      expect(phase.duration).toBe(3000)
    })

    it('should create a phase without duration (infinite loop)', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phase = usecase.createPhase({
        type: 'Loop',
      })

      expect(phase.type).toBe('Loop')
      expect(phase.duration).toBeUndefined()
    })

    it('should add the phase to the repository', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      usecase.createPhase({
        type: 'Opening',
        duration: 3000,
      })

      expect(repository.get().phases).toHaveLength(1)
    })
  })

  describe('getPhase', () => {
    it('should return phase by id', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const createdPhase = usecase.createPhase({
        type: 'Opening',
        duration: 3000,
      })

      const phase = usecase.getPhase(createdPhase.id)

      expect(phase).toEqual(createdPhase)
    })

    it('should return undefined for non-existent phase', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phase = usecase.getPhase('non-existent' as PhaseId)

      expect(phase).toBeUndefined()
    })
  })

  describe('getPhases', () => {
    it('should return all phases', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      usecase.createPhase({ type: 'Opening', duration: 1000 })
      usecase.createPhase({ type: 'Loop' })
      usecase.createPhase({ type: 'Ending', duration: 500 })

      const phases = usecase.getPhases()

      expect(phases).toHaveLength(3)
    })

    it('should return empty array when no phases', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phases = usecase.getPhases()

      expect(phases).toEqual([])
    })
  })

  describe('updatePhaseDuration', () => {
    it('should update phase duration', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phase = usecase.createPhase({
        type: 'Opening',
        duration: 3000,
      })

      usecase.updatePhaseDuration(phase.id, 5000)

      const updated = usecase.getPhase(phase.id)
      expect(updated?.duration).toBe(5000)
    })

    it('should set duration to undefined for infinite loop', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phase = usecase.createPhase({
        type: 'Loop',
        duration: 3000,
      })

      usecase.updatePhaseDuration(phase.id, undefined)

      const updated = usecase.getPhase(phase.id)
      expect(updated?.duration).toBeUndefined()
    })
  })

  describe('updatePhase', () => {
    it('should update phase type', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phase = usecase.createPhase({
        type: 'Opening',
        duration: 3000,
      })

      usecase.updatePhase(phase.id, { type: 'Ending' })

      const updated = usecase.getPhase(phase.id)
      expect(updated?.type).toBe('Ending')
    })

    it('should update multiple properties', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phase = usecase.createPhase({
        type: 'Opening',
        duration: 3000,
      })

      usecase.updatePhase(phase.id, { type: 'Loop', duration: undefined })

      const updated = usecase.getPhase(phase.id)
      expect(updated?.type).toBe('Loop')
      expect(updated?.duration).toBeUndefined()
    })
  })

  describe('deletePhase', () => {
    it('should delete phase from repository', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      const phase = usecase.createPhase({
        type: 'Opening',
        duration: 3000,
      })

      usecase.deletePhase(phase.id)

      expect(usecase.getPhases()).toHaveLength(0)
    })

    it('should cascade delete associated tracks', () => {
      const repository = createTimelineInMemoryRepository()
      const phaseUsecase = createPhaseUsecase({ repository })
      const trackUsecase = createTrackUsecase({ repository })

      const phase1 = phaseUsecase.createPhase({ type: 'Opening', duration: 1000 })
      const phase2 = phaseUsecase.createPhase({ type: 'Loop' })

      trackUsecase.createTrack({ name: 'Track 1', phaseId: phase1.id })
      trackUsecase.createTrack({ name: 'Track 2', phaseId: phase1.id })
      trackUsecase.createTrack({ name: 'Track 3', phaseId: phase2.id })

      expect(trackUsecase.getTracks()).toHaveLength(3)

      phaseUsecase.deletePhase(phase1.id)

      expect(phaseUsecase.getPhases()).toHaveLength(1)
      expect(trackUsecase.getTracks()).toHaveLength(1)
      expect(trackUsecase.getTracks()[0].name).toBe('Track 3')
    })

    it('should only delete specified phase', () => {
      const repository = createTimelineInMemoryRepository()
      const usecase = createPhaseUsecase({ repository })

      usecase.createPhase({ type: 'Opening', duration: 1000 })
      const phase2 = usecase.createPhase({ type: 'Loop' })

      usecase.deletePhase(phase2.id)

      expect(usecase.getPhases()).toHaveLength(1)
      expect(usecase.getPhases()[0].type).toBe('Opening')
    })
  })
})
