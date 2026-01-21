import { describe, it, expect, vi } from 'vitest'
import { createTimelineInMemoryRepository } from './TimelineInMemoryRepository'
import type { Timeline } from '../Timeline'
import type { Track, TrackId, ParamId } from '../Track'
import type { Phase, PhaseId } from '../Phase'

const createMockTrack = (id: string): Track => ({
  id: id as TrackId,
  name: `Track ${id}`,
  clock: 'Global',
  phaseId: 'phase-1' as PhaseId,
  targetParam: `param-${id}` as ParamId,
  expression: 'div(t, 1000)',
})

const createMockPhase = (id: string): Phase => ({
  id: id as PhaseId,
  type: 'Opening',
  duration: 1000,
})

describe('TimelineInMemoryRepository', () => {
  it('should return default timeline when no initial provided', () => {
    const repo = createTimelineInMemoryRepository()

    expect(repo.get()).toEqual({
      tracks: [],
      phases: [],
      loopType: 'forward',
    })
  })

  it('should return initial timeline via get()', () => {
    const initialTimeline: Timeline = {
      tracks: [createMockTrack('track-1')],
      phases: [createMockPhase('phase-1')],
      loopType: 'forward',
    }
    const repo = createTimelineInMemoryRepository({ initialTimeline })

    expect(repo.get()).toBe(initialTimeline)
  })

  it('should update timeline via set()', () => {
    const repo = createTimelineInMemoryRepository()

    const newTimeline: Timeline = {
      tracks: [],
      phases: [],
      loopType: 'pingpong',
    }
    repo.set(newTimeline)

    expect(repo.get()).toBe(newTimeline)
  })

  it('should notify subscribers on set()', () => {
    const repo = createTimelineInMemoryRepository()

    const subscriber = vi.fn()
    repo.subscribe(subscriber)

    repo.set({ tracks: [], phases: [], loopType: 'forward' })

    expect(subscriber).toHaveBeenCalled()
  })

  it('should allow unsubscribing', () => {
    const repo = createTimelineInMemoryRepository()

    const subscriber = vi.fn()
    const unsubscribe = repo.subscribe(subscriber)

    unsubscribe()
    repo.set({ tracks: [], phases: [], loopType: 'forward' })

    expect(subscriber).not.toHaveBeenCalled()
  })

  // Track Operations
  it('should add track', () => {
    const repo = createTimelineInMemoryRepository()

    const track = createMockTrack('track-1')
    repo.addTrack(track)

    expect(repo.get().tracks).toHaveLength(1)
    expect(repo.get().tracks[0]).toEqual(track)
  })

  it('should update track', () => {
    const track = createMockTrack('track-1')
    const repo = createTimelineInMemoryRepository({
      initialTimeline: { tracks: [track], phases: [], loopType: 'forward' },
    })

    repo.updateTrack('track-1', { expression: 'osc(t, 2000)' })

    expect(repo.get().tracks[0].expression).toBe('osc(t, 2000)')
  })

  it('should remove track', () => {
    const track = createMockTrack('track-1')
    const repo = createTimelineInMemoryRepository({
      initialTimeline: { tracks: [track], phases: [], loopType: 'forward' },
    })

    repo.removeTrack('track-1')

    expect(repo.get().tracks).toHaveLength(0)
  })

  // Phase Operations
  it('should add phase', () => {
    const repo = createTimelineInMemoryRepository()

    const phase = createMockPhase('phase-1')
    repo.addPhase(phase)

    expect(repo.get().phases).toHaveLength(1)
    expect(repo.get().phases[0]).toEqual(phase)
  })

  it('should update phase', () => {
    const phase = createMockPhase('phase-1')
    const repo = createTimelineInMemoryRepository({
      initialTimeline: { tracks: [], phases: [phase], loopType: 'forward' },
    })

    repo.updatePhase('phase-1', { duration: 2000 })

    expect(repo.get().phases[0].duration).toBe(2000)
  })

  it('should remove phase', () => {
    const phase = createMockPhase('phase-1')
    const repo = createTimelineInMemoryRepository({
      initialTimeline: { tracks: [], phases: [phase], loopType: 'forward' },
    })

    repo.removePhase('phase-1')

    expect(repo.get().phases).toHaveLength(0)
  })

  // Loop Type
  it('should set loop type', () => {
    const repo = createTimelineInMemoryRepository()

    repo.setLoopType('pingpong')

    expect(repo.get().loopType).toBe('pingpong')
  })

  it('should notify subscribers on all operations', () => {
    const repo = createTimelineInMemoryRepository()

    const subscriber = vi.fn()
    repo.subscribe(subscriber)

    repo.addTrack(createMockTrack('track-1'))
    repo.updateTrack('track-1', { expression: 'new' })
    repo.removeTrack('track-1')
    repo.addPhase(createMockPhase('phase-1'))
    repo.updatePhase('phase-1', { duration: 2000 })
    repo.removePhase('phase-1')
    repo.setLoopType('once')

    expect(subscriber).toHaveBeenCalledTimes(7)
  })
})
