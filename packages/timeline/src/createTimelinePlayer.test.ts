import { describe, it, expect } from 'vitest'
import { createTimelinePlayer } from './createTimelinePlayer'
import type { Timeline } from './Timeline'
import type { Binding } from './Binding'
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
        mode: 'Envelope',
        envelope: {
          points: [
            { time: 0, value: 0 },
            { time: 4000, value: 1 },
          ],
          interpolation: 'Linear',
        },
      },
      {
        id: 'track-pulse' as TrackId,
        name: 'Pulse',
        clock: 'Global',
        phaseId: 'phase-1' as PhaseId,
        mode: 'Generator',
        generator: { type: 'Sin', period: 1000, offset: 0, params: {} },
      },
    ],
  })

  const createTestBindings = (): Binding[] => [
    {
      targetParam: 'opacity',
      sourceTrack: 'track-opacity' as TrackId,
      map: { min: 0, max: 1 },
    },
    {
      targetParam: 'scale',
      sourceTrack: 'track-pulse' as TrackId,
      map: { min: 0.5, max: 1.5 },
    },
  ]

  it('creates a player with initial state', () => {
    const player = createTimelinePlayer({
      timeline: createTestTimeline(),
      bindings: createTestBindings(),
    })

    const state = player.update(0)
    expect(state.time).toBe(0)
    expect(state.params).toHaveProperty('opacity')
    expect(state.params).toHaveProperty('scale')
  })

  it('seek updates playhead', () => {
    const player = createTimelinePlayer({
      timeline: createTestTimeline(),
      bindings: createTestBindings(),
    })

    player.seek(2000)
    const state = player.update(0)
    expect(state.time).toBe(2000)
  })

  it('seek clamps to valid range', () => {
    const player = createTimelinePlayer({
      timeline: createTestTimeline(),
      bindings: createTestBindings(),
    })

    player.seek(-100)
    expect(player.update(0).time).toBe(0)

    player.seek(10000)
    expect(player.update(0).time).toBe(4000) // total duration
  })

  it('play advances playhead over time', () => {
    const player = createTimelinePlayer({
      timeline: createTestTimeline(),
      bindings: createTestBindings(),
    })

    player.play()
    player.update(0) // First frame, sets lastEngineTime
    const state = player.update(500) // 500ms later
    expect(state.time).toBe(500)
  })

  it('pause stops playhead advancement', () => {
    const player = createTimelinePlayer({
      timeline: createTestTimeline(),
      bindings: createTestBindings(),
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
      bindings: createTestBindings(),
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

    const player = createTimelinePlayer({
      timeline,
      bindings: createTestBindings(),
    })

    player.seek(3900)
    player.play()
    player.update(0)
    const state = player.update(200)
    expect(state.time).toBe(4000) // clamped to end
  })

  it('evaluates envelope track with range mapping', () => {
    const player = createTimelinePlayer({
      timeline: createTestTimeline(),
      bindings: [
        {
          targetParam: 'test',
          sourceTrack: 'track-opacity' as TrackId,
          map: { min: 10, max: 20 },
        },
      ],
    })

    player.seek(0)
    expect(player.update(0).params.test).toBe(10) // 0 -> 10

    player.seek(2000)
    expect(player.update(0).params.test).toBe(15) // 0.5 -> 15

    player.seek(4000)
    expect(player.update(0).params.test).toBe(20) // 1 -> 20
  })

  it('evaluates generator track', () => {
    const player = createTimelinePlayer({
      timeline: createTestTimeline(),
      bindings: [
        {
          targetParam: 'pulse',
          sourceTrack: 'track-pulse' as TrackId,
          map: { min: 0, max: 1 },
        },
      ],
    })

    // Sin wave at time 0 should be 0.5
    player.seek(0)
    expect(player.update(0).params.pulse).toBeCloseTo(0.5, 5)

    // Sin wave at time 250 (quarter period) should be 1
    player.seek(250)
    expect(player.update(0).params.pulse).toBeCloseTo(1, 5)
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
          mode: 'Envelope',
          envelope: {
            points: [
              { time: 0, value: 0 },
              { time: 1000, value: 1 },
            ],
            interpolation: 'Linear',
          },
        },
        {
          id: 'track-loop' as TrackId,
          name: 'Loop Track',
          clock: 'Phase',
          phaseId: 'phase-loop' as PhaseId,
          mode: 'Envelope',
          envelope: {
            points: [
              { time: 0, value: 0 },
              { time: 2000, value: 1 },
            ],
            interpolation: 'Linear',
          },
        },
      ],
    }

    const player = createTimelinePlayer({
      timeline,
      bindings: [
        {
          targetParam: 'opening',
          sourceTrack: 'track-opening' as TrackId,
          map: { min: 0, max: 1 },
        },
        {
          targetParam: 'loop',
          sourceTrack: 'track-loop' as TrackId,
          map: { min: 0, max: 1 },
        },
      ],
    })

    // In Opening phase (0-1000ms)
    player.seek(500)
    expect(player.update(0).params.opening).toBeCloseTo(0.5, 5) // midway through Opening
    expect(player.update(0).params.loop).toBeCloseTo(0, 5) // Loop hasn't started, initial value

    // At end of Opening phase
    player.seek(1000)
    expect(player.update(0).params.opening).toBeCloseTo(1, 5) // final value of Opening
    expect(player.update(0).params.loop).toBeCloseTo(0, 5) // Loop just started

    // In Loop phase (1000-3000ms)
    player.seek(2000)
    expect(player.update(0).params.opening).toBeCloseTo(1, 5) // Opening ended, stays at final value
    expect(player.update(0).params.loop).toBeCloseTo(0.5, 5) // 1000ms into Loop phase (2000ms total)
  })
})
