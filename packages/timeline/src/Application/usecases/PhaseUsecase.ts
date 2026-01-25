/**
 * PhaseUsecase - Phase CRUD操作とduration変更のユースケース
 */

import type { TimelineRepository } from '../ports/TimelineRepository'
import type { Phase, PhaseId, PhaseType } from '../../Phase'
import type { Ms } from '../../Unit'

export interface PhaseUsecaseDeps {
  repository: TimelineRepository
}

export interface CreatePhaseParams {
  type: PhaseType
  duration?: Ms
}

export interface PhaseUsecase {
  createPhase(params: CreatePhaseParams): Phase
  getPhase(phaseId: PhaseId): Phase | undefined
  getPhases(): Phase[]
  updatePhaseDuration(phaseId: PhaseId, duration: Ms | undefined): void
  updatePhase(phaseId: PhaseId, updates: Partial<Omit<Phase, 'id'>>): void
  deletePhase(phaseId: PhaseId): void
}

export const createPhaseUsecase = (deps: PhaseUsecaseDeps): PhaseUsecase => {
  const { repository } = deps

  return {
    createPhase(params: CreatePhaseParams): Phase {
      const phase: Phase = {
        id: crypto.randomUUID() as PhaseId,
        type: params.type,
        duration: params.duration,
      }
      repository.addPhase(phase)
      return phase
    },

    getPhase(phaseId: PhaseId): Phase | undefined {
      const timeline = repository.get()
      return timeline.phases.find((phase) => phase.id === phaseId)
    },

    getPhases(): Phase[] {
      const timeline = repository.get()
      return timeline.phases
    },

    updatePhaseDuration(phaseId: PhaseId, duration: Ms | undefined): void {
      repository.updatePhase(phaseId as string, { duration })
    },

    updatePhase(phaseId: PhaseId, updates: Partial<Omit<Phase, 'id'>>): void {
      repository.updatePhase(phaseId as string, updates)
    },

    deletePhase(phaseId: PhaseId): void {
      // カスケード削除: 紐づくTrackも削除
      const timeline = repository.get()
      const tracksToDelete = timeline.tracks.filter(
        (track) => track.phaseId === phaseId
      )
      for (const track of tracksToDelete) {
        repository.removeTrack(track.id as string)
      }
      repository.removePhase(phaseId as string)
    },
  }
}
