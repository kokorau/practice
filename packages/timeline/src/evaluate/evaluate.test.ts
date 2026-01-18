import { describe, it, expect } from 'vitest'
import { evaluateEnvelope } from './evaluateEnvelope'
import { evaluateGenerator } from './evaluateGenerator'
import { evaluateTrack } from './evaluateTrack'
import type { Envelope } from '../Envelope'
import type { Generator } from '../Generator'
import type { EnvelopeTrack, GeneratorTrack, TrackId } from '../Track'

describe('evaluateEnvelope', () => {
  it('returns 0 for empty envelope', () => {
    const envelope: Envelope = { points: [], interpolation: 'Linear' }
    expect(evaluateEnvelope(envelope, 500)).toBe(0)
  })

  it('returns single point value for single-point envelope', () => {
    const envelope: Envelope = {
      points: [{ time: 1000, value: 0.7 }],
      interpolation: 'Linear',
    }
    expect(evaluateEnvelope(envelope, 0)).toBe(0.7)
    expect(evaluateEnvelope(envelope, 500)).toBe(0.7)
    expect(evaluateEnvelope(envelope, 2000)).toBe(0.7)
  })

  it('interpolates linearly between two points', () => {
    const envelope: Envelope = {
      points: [
        { time: 0, value: 0 },
        { time: 1000, value: 1 },
      ],
      interpolation: 'Linear',
    }
    expect(evaluateEnvelope(envelope, 0)).toBe(0)
    expect(evaluateEnvelope(envelope, 500)).toBe(0.5)
    expect(evaluateEnvelope(envelope, 1000)).toBe(1)
  })

  it('holds value before first point', () => {
    const envelope: Envelope = {
      points: [
        { time: 500, value: 0.3 },
        { time: 1500, value: 0.8 },
      ],
      interpolation: 'Linear',
    }
    expect(evaluateEnvelope(envelope, 0)).toBe(0.3)
    expect(evaluateEnvelope(envelope, 250)).toBe(0.3)
  })

  it('holds value after last point', () => {
    const envelope: Envelope = {
      points: [
        { time: 500, value: 0.3 },
        { time: 1500, value: 0.8 },
      ],
      interpolation: 'Linear',
    }
    expect(evaluateEnvelope(envelope, 2000)).toBe(0.8)
    expect(evaluateEnvelope(envelope, 3000)).toBe(0.8)
  })

  it('handles multiple points', () => {
    const envelope: Envelope = {
      points: [
        { time: 0, value: 0 },
        { time: 1000, value: 1 },
        { time: 2000, value: 0.5 },
      ],
      interpolation: 'Linear',
    }
    expect(evaluateEnvelope(envelope, 500)).toBe(0.5)
    expect(evaluateEnvelope(envelope, 1500)).toBe(0.75)
  })

  it('applies bezier easing', () => {
    const envelope: Envelope = {
      points: [
        { time: 0, value: 0 },
        { time: 1000, value: 1 },
      ],
      interpolation: 'Bezier',
    }
    // Bezier should ease in/out, so midpoint should be different from 0.5
    const midValue = evaluateEnvelope(envelope, 500)
    expect(midValue).toBeGreaterThan(0.4)
    expect(midValue).toBeLessThan(0.6)
    // Start and end should still be exact
    expect(evaluateEnvelope(envelope, 0)).toBe(0)
    expect(evaluateEnvelope(envelope, 1000)).toBe(1)
  })
})

describe('evaluateGenerator', () => {
  describe('Sin', () => {
    it('returns 0.5 at phase 0 (sine starts at 0)', () => {
      const gen: Generator = { type: 'Sin', period: 1000, offset: 0, params: {} }
      expect(evaluateGenerator(gen, 0)).toBeCloseTo(0.5, 5)
    })

    it('returns 1 at quarter period (sine peak)', () => {
      const gen: Generator = { type: 'Sin', period: 1000, offset: 0, params: {} }
      expect(evaluateGenerator(gen, 250)).toBeCloseTo(1, 5)
    })

    it('returns 0 at three-quarter period (sine trough)', () => {
      const gen: Generator = { type: 'Sin', period: 1000, offset: 0, params: {} }
      expect(evaluateGenerator(gen, 750)).toBeCloseTo(0, 5)
    })

    it('respects offset', () => {
      const gen: Generator = { type: 'Sin', period: 1000, offset: 250, params: {} }
      // offset=250 shifts phase by 250ms, so time=0 acts like time=250
      expect(evaluateGenerator(gen, 0)).toBeCloseTo(1, 5)
    })
  })

  describe('Saw', () => {
    it('ramps from 0 to 1 over period', () => {
      const gen: Generator = { type: 'Saw', period: 1000, offset: 0, params: {} }
      expect(evaluateGenerator(gen, 0)).toBeCloseTo(0, 5)
      expect(evaluateGenerator(gen, 500)).toBeCloseTo(0.5, 5)
      expect(evaluateGenerator(gen, 999)).toBeCloseTo(0.999, 3)
    })
  })

  describe('Pulse', () => {
    it('returns 1 below duty, 0 above', () => {
      const gen: Generator = { type: 'Pulse', period: 1000, offset: 0, params: { duty: 0.5 } }
      expect(evaluateGenerator(gen, 0)).toBe(1)
      expect(evaluateGenerator(gen, 400)).toBe(1)
      expect(evaluateGenerator(gen, 500)).toBe(0)
      expect(evaluateGenerator(gen, 900)).toBe(0)
    })

    it('defaults to 50% duty', () => {
      const gen: Generator = { type: 'Pulse', period: 1000, offset: 0, params: {} }
      expect(evaluateGenerator(gen, 400)).toBe(1)
      expect(evaluateGenerator(gen, 600)).toBe(0)
    })
  })

  describe('Step', () => {
    it('quantizes to steps', () => {
      const gen: Generator = { type: 'Step', period: 1000, offset: 0, params: { steps: 4 } }
      expect(evaluateGenerator(gen, 0)).toBeCloseTo(0, 5)
      expect(evaluateGenerator(gen, 250)).toBeCloseTo(1 / 3, 5)
      expect(evaluateGenerator(gen, 500)).toBeCloseTo(2 / 3, 5)
      expect(evaluateGenerator(gen, 750)).toBeCloseTo(1, 5)
    })
  })

  describe('Perlin', () => {
    it('returns value in [0, 1] range', () => {
      const gen: Generator = { type: 'Perlin', period: 1000, offset: 0, params: { seed: 42 } }
      for (let t = 0; t < 2000; t += 100) {
        const value = evaluateGenerator(gen, t)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    })
  })
})

describe('evaluateTrack', () => {
  it('evaluates envelope track', () => {
    const track: EnvelopeTrack = {
      id: 'track-1' as TrackId,
      name: 'Test',
      clock: 'Global',
      mode: 'Envelope',
      envelope: {
        points: [
          { time: 0, value: 0 },
          { time: 1000, value: 1 },
        ],
        interpolation: 'Linear',
      },
    }
    expect(evaluateTrack(track, 500)).toBe(0.5)
  })

  it('evaluates generator track', () => {
    const track: GeneratorTrack = {
      id: 'track-2' as TrackId,
      name: 'Test',
      clock: 'Global',
      mode: 'Generator',
      generator: { type: 'Saw', period: 1000, offset: 0, params: {} },
    }
    expect(evaluateTrack(track, 500)).toBeCloseTo(0.5, 5)
  })
})
