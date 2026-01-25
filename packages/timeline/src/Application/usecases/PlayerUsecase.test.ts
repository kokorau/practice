import { describe, it, expect } from 'vitest'
import { createPlayerUsecase, createTimelinePlayer } from './PlayerUsecase'
import { createTimelineInMemoryRepository } from '../../Infra/TimelineInMemoryRepository'
import type { Timeline } from '../../Timeline'
import type { PhaseId } from '../../Phase'
import type { TrackId } from '../../Track'

describe('PlayerUsecase', () => {
  const createTestTimeline = (): Timeline => ({
    loopType: 'forward',
    phases: [{ id: 'phase-1' as PhaseId, type: 'Opening', duration: 4000 }],
    tracks: [
      {
        id: 'track-opacity' as TrackId,
        name: 'Opacity',
        clock: 'Global',
        phaseId: 'phase-1' as PhaseId,
        expression: 'div(t, 4000)',
      },
      {
        id: 'track-pulse' as TrackId,
        name: 'Pulse',
        clock: 'Global',
        phaseId: 'phase-1' as PhaseId,
        expression: 'osc(t, 1000)',
      },
    ],
  })

  describe('createPlayerUsecase', () => {
    it('creates a player from repository timeline', () => {
      const repository = createTimelineInMemoryRepository({
        initialTimeline: createTestTimeline(),
      })
      const usecase = createPlayerUsecase({ repository })

      const player = usecase.createPlayer()

      const state = player.update(0)
      expect(state.time).toBe(0)
      expect(state.intensities).toHaveProperty('track-opacity')
      expect(state.intensities).toHaveProperty('track-pulse')
    })

    it('player reflects current repository state', () => {
      const repository = createTimelineInMemoryRepository({
        initialTimeline: createTestTimeline(),
      })
      const usecase = createPlayerUsecase({ repository })

      const player = usecase.createPlayer()
      expect(player.update(0).intensities['track-opacity']).toBeDefined()
    })
  })

  describe('TimelinePlayer', () => {
    it('creates a player with initial state', () => {
      const player = createTimelinePlayer({
        timeline: createTestTimeline(),
      })

      const state = player.update(0)
      expect(state.time).toBe(0)
      expect(state.intensities).toHaveProperty('track-opacity')
      expect(state.intensities).toHaveProperty('track-pulse')
    })

    it('seek updates playhead', () => {
      const player = createTimelinePlayer({
        timeline: createTestTimeline(),
      })

      player.seek(2000)
      const state = player.update(0)
      expect(state.time).toBe(2000)
    })

    it('seek clamps to valid range', () => {
      const player = createTimelinePlayer({
        timeline: createTestTimeline(),
      })

      player.seek(-100)
      expect(player.update(0).time).toBe(0)

      player.seek(10000)
      expect(player.update(0).time).toBe(4000) // total duration
    })

    it('play advances playhead over time', () => {
      const player = createTimelinePlayer({
        timeline: createTestTimeline(),
      })

      player.play()
      player.update(0) // First frame, sets lastEngineTime
      const state = player.update(500) // 500ms later
      expect(state.time).toBe(500)
    })

    it('pause stops playhead advancement', () => {
      const player = createTimelinePlayer({
        timeline: createTestTimeline(),
      })

      player.play()
      player.update(0)
      player.update(500)
      player.pause()

      const state1 = player.update(1000)
      const state2 = player.update(1500)
      expect(state1.time).toBe(state2.time)
    })

    it('stop resets playhead to 0', () => {
      const player = createTimelinePlayer({
        timeline: createTestTimeline(),
      })

      player.play()
      player.update(0)
      player.update(500)
      player.stop()

      expect(player.update(0).time).toBe(0)
      expect(player.isPlaying()).toBe(false)
    })

    it('isPlaying returns current state', () => {
      const player = createTimelinePlayer({
        timeline: createTestTimeline(),
      })

      expect(player.isPlaying()).toBe(false)
      player.play()
      expect(player.isPlaying()).toBe(true)
      player.pause()
      expect(player.isPlaying()).toBe(false)
    })

    it('loops when loopType is forward', () => {
      const player = createTimelinePlayer({
        timeline: createTestTimeline(),
      })

      player.seek(3900)
      player.play()
      player.update(0)
      const state = player.update(200) // 3900 + 200 = 4100 > 4000
      expect(state.time).toBe(100) // wrapped
    })

    it('stops at end when loopType is once', () => {
      const timeline = createTestTimeline()
      timeline.loopType = 'once'

      const player = createTimelinePlayer({ timeline })

      player.seek(3900)
      player.play()
      player.update(0)
      const state = player.update(200)
      expect(state.time).toBe(4000) // clamped to end
    })

    it('evaluates linear DSL expression', () => {
      const timeline: Timeline = {
        loopType: 'forward',
        phases: [{ id: 'phase-1' as PhaseId, type: 'Opening', duration: 4000 }],
        tracks: [
          {
            id: 'track-test' as TrackId,
            name: 'Test',
            clock: 'Global',
            phaseId: 'phase-1' as PhaseId,
            expression: 'div(t, 4000)',
          },
        ],
      }

      const player = createTimelinePlayer({ timeline })

      player.seek(0)
      expect(player.update(0).intensities['track-test']).toBe(0)

      player.seek(2000)
      expect(player.update(0).intensities['track-test']).toBe(0.5)

      player.seek(4000)
      expect(player.update(0).intensities['track-test']).toBe(1)
    })

    it('evaluates oscillator DSL expression', () => {
      const timeline: Timeline = {
        loopType: 'forward',
        phases: [{ id: 'phase-1' as PhaseId, type: 'Opening', duration: 4000 }],
        tracks: [
          {
            id: 'track-pulse' as TrackId,
            name: 'Pulse',
            clock: 'Global',
            phaseId: 'phase-1' as PhaseId,
            expression: 'osc(t, 1000)',
          },
        ],
      }

      const player = createTimelinePlayer({ timeline })

      player.seek(0)
      expect(player.update(0).intensities['track-pulse']).toBeCloseTo(0.5, 5)

      player.seek(250)
      expect(player.update(0).intensities['track-pulse']).toBeCloseTo(1, 5)
    })

    it('handles Phase clock type', () => {
      const timeline: Timeline = {
        loopType: 'forward',
        phases: [
          { id: 'phase-opening' as PhaseId, type: 'Opening', duration: 1000 },
          { id: 'phase-loop' as PhaseId, type: 'Loop', duration: 2000 },
        ],
        tracks: [
          {
            id: 'track-opening' as TrackId,
            name: 'Opening Track',
            clock: 'Phase',
            phaseId: 'phase-opening' as PhaseId,
            expression: 'div(t, 1000)',
          },
          {
            id: 'track-loop' as TrackId,
            name: 'Loop Track',
            clock: 'Phase',
            phaseId: 'phase-loop' as PhaseId,
            expression: 'div(t, 2000)',
          },
        ],
      }

      const player = createTimelinePlayer({ timeline })

      player.seek(500)
      expect(player.update(0).intensities['track-opening']).toBeCloseTo(0.5, 5)
      expect(player.update(0).intensities['track-loop']).toBeCloseTo(0, 5)

      player.seek(1000)
      expect(player.update(0).intensities['track-opening']).toBeCloseTo(1, 5)
      expect(player.update(0).intensities['track-loop']).toBeCloseTo(0, 5)

      player.seek(2000)
      expect(player.update(0).intensities['track-opening']).toBeCloseTo(1, 5)
      expect(player.update(0).intensities['track-loop']).toBeCloseTo(0.5, 5)
    })
  })
})
