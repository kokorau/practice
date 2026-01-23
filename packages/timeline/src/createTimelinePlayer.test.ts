import { describe, it, expect } from 'vitest'
import { createTimelinePlayer } from './createTimelinePlayer'
import type { Timeline } from './Timeline'
import type { PhaseId, TrackId } from './index'

describe('createTimelinePlayer', () => {
  // Test timeline with a single phase covering 4000ms for simplicity
  const createTestTimeline = (): Timeline => ({
    loopType: 'forward',
    phases: [
      { id: 'phase-1' as PhaseId, type: 'Opening', duration: 4000 },
    ],
    tracks: [
      {
        id: 'track-opacity' as TrackId,
        name: 'Opacity',
        clock: 'Global',
        phaseId: 'phase-1' as PhaseId,
        // Linear interpolation: 0 at t=0, 1 at t=4000
        expression: 'div(t, 4000)',
      },
      {
        id: 'track-pulse' as TrackId,
        name: 'Pulse',
        clock: 'Global',
        phaseId: 'phase-1' as PhaseId,
        // Oscillates 0-1 with period 1000ms
        expression: 'osc(t, 1000)',
      },
    ],
  })

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
          // Linear interpolation: 0 at t=0, 1 at t=4000
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
          // osc outputs 0-1 sine wave
          expression: 'osc(t, 1000)',
        },
      ],
    }

    const player = createTimelinePlayer({ timeline })

    // osc at time 0 should be 0.5 (sine starts at 0, normalized to 0-1)
    player.seek(0)
    expect(player.update(0).intensities['track-pulse']).toBeCloseTo(0.5, 5)

    // osc at time 250 (quarter period) should be 1 (sine peak)
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
          // Linear interpolation over 1000ms phase
          expression: 'div(t, 1000)',
        },
        {
          id: 'track-loop' as TrackId,
          name: 'Loop Track',
          clock: 'Phase',
          phaseId: 'phase-loop' as PhaseId,
          // Linear interpolation over 2000ms phase
          expression: 'div(t, 2000)',
        },
      ],
    }

    const player = createTimelinePlayer({ timeline })

    // In Opening phase (0-1000ms)
    player.seek(500)
    expect(player.update(0).intensities['track-opening']).toBeCloseTo(0.5, 5) // midway through Opening
    expect(player.update(0).intensities['track-loop']).toBeCloseTo(0, 5) // Loop hasn't started, initial value

    // At end of Opening phase
    player.seek(1000)
    expect(player.update(0).intensities['track-opening']).toBeCloseTo(1, 5) // final value of Opening
    expect(player.update(0).intensities['track-loop']).toBeCloseTo(0, 5) // Loop just started

    // In Loop phase (1000-3000ms)
    player.seek(2000)
    expect(player.update(0).intensities['track-opening']).toBeCloseTo(1, 5) // Opening ended, stays at final value
    expect(player.update(0).intensities['track-loop']).toBeCloseTo(0.5, 5) // 1000ms into Loop phase
  })
})
