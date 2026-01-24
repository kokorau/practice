import { describe, it, expect } from 'vitest'
import { evaluate, parse, tryParse } from './index'

describe('DSL Parser', () => {
  describe('parse', () => {
    it('parses number literal', () => {
      expect(parse('42')).toEqual({ type: 'number', value: 42 })
    })

    it('parses decimal number', () => {
      expect(parse('3.14')).toEqual({ type: 'number', value: 3.14 })
    })

    it('parses negative number', () => {
      expect(parse('-5')).toEqual({
        type: 'unary',
        operator: '-',
        operand: { type: 'number', value: 5 },
      })
    })

    it('parses identifier', () => {
      expect(parse('t')).toEqual({ type: 'identifier', name: 't' })
    })

    it('parses simple function call', () => {
      expect(parse('add(t, 3)')).toEqual({
        type: 'call',
        name: 'add',
        args: [
          { type: 'identifier', name: 't' },
          { type: 'number', value: 3 },
        ],
      })
    })

    it('parses nested function calls', () => {
      expect(parse('mul(sin(t), 10)')).toEqual({
        type: 'call',
        name: 'mul',
        args: [
          {
            type: 'call',
            name: 'sin',
            args: [{ type: 'identifier', name: 't' }],
          },
          { type: 'number', value: 10 },
        ],
      })
    })

    it('ignores whitespace', () => {
      expect(parse('add( t , 3 )')).toEqual(parse('add(t,3)'))
    })
  })

  describe('tryParse', () => {
    it('returns ok: true with ast for valid expression', () => {
      const result = tryParse('range(osc(t, 4000), 0, 100)')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.ast).toEqual({
          type: 'call',
          name: 'range',
          args: [
            {
              type: 'call',
              name: 'osc',
              args: [
                { type: 'identifier', name: 't' },
                { type: 'number', value: 4000 },
              ],
            },
            { type: 'number', value: 0 },
            { type: 'number', value: 100 },
          ],
        })
      }
    })

    it('returns ok: false with error for invalid expression', () => {
      const result = tryParse('add(t,')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('Unexpected')
      }
    })

    it('returns ok: false for empty input', () => {
      const result = tryParse('')
      expect(result.ok).toBe(false)
    })

    it('returns ok: false for invalid token', () => {
      const result = tryParse('foo @@ bar')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBeTruthy()
      }
    })

    it('returns ok: true for simple number', () => {
      const result = tryParse('42')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.ast).toEqual({ type: 'number', value: 42 })
      }
    })

    it('returns ok: true for identifier', () => {
      const result = tryParse('t')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.ast).toEqual({ type: 'identifier', name: 't' })
      }
    })
  })
})

describe('DSL Evaluator', () => {
  describe('basic evaluation', () => {
    it('evaluates number literal', () => {
      expect(evaluate('42', {})).toBe(42)
    })

    it('evaluates identifier from context', () => {
      expect(evaluate('t', { t: 0.5 })).toBe(0.5)
    })

    it('throws on unknown identifier', () => {
      expect(() => evaluate('unknown', {})).toThrow()
    })
  })

  describe('arithmetic', () => {
    it('add(t, 3) with t=2 returns 5', () => {
      expect(evaluate('add(t, 3)', { t: 2 })).toBe(5)
    })

    it('sub(t, 3) with t=5 returns 2', () => {
      expect(evaluate('sub(t, 3)', { t: 5 })).toBe(2)
    })

    it('mul(t, 3) with t=4 returns 12', () => {
      expect(evaluate('mul(t, 3)', { t: 4 })).toBe(12)
    })

    it('div(t, 2) with t=6 returns 3', () => {
      expect(evaluate('div(t, 2)', { t: 6 })).toBe(3)
    })

    it('neg(t) with t=5 returns -5', () => {
      expect(evaluate('neg(t)', { t: 5 })).toBe(-5)
    })
  })

  describe('power and logarithm', () => {
    it('pow(t, 2) with t=3 returns 9', () => {
      expect(evaluate('pow(t, 2)', { t: 3 })).toBe(9)
    })

    it('sqrt(t) with t=16 returns 4', () => {
      expect(evaluate('sqrt(t)', { t: 16 })).toBe(4)
    })

    it('log(t) returns natural logarithm', () => {
      expect(evaluate('log(t)', { t: Math.E })).toBeCloseTo(1)
    })

    it('log10(t) with t=100 returns 2', () => {
      expect(evaluate('log10(t)', { t: 100 })).toBeCloseTo(2)
    })
  })

  describe('trigonometric', () => {
    it('sin(t) with t=0 returns 0', () => {
      expect(evaluate('sin(t)', { t: 0 })).toBeCloseTo(0)
    })

    it('sin(t) with t=PI/2 returns 1', () => {
      expect(evaluate('sin(t)', { t: Math.PI / 2 })).toBeCloseTo(1)
    })

    it('cos(t) with t=0 returns 1', () => {
      expect(evaluate('cos(t)', { t: 0 })).toBeCloseTo(1)
    })

    it('tan(t) with t=0 returns 0', () => {
      expect(evaluate('tan(t)', { t: 0 })).toBeCloseTo(0)
    })

    it('asin(t) with t=1 returns PI/2', () => {
      expect(evaluate('asin(t)', { t: 1 })).toBeCloseTo(Math.PI / 2)
    })

    it('acos(t) with t=1 returns 0', () => {
      expect(evaluate('acos(t)', { t: 1 })).toBeCloseTo(0)
    })

    it('atan(t) with t=1 returns PI/4', () => {
      expect(evaluate('atan(t)', { t: 1 })).toBeCloseTo(Math.PI / 4)
    })
  })

  describe('range and clamp', () => {
    it('range(t, 0, 100) maps 0-1 to 0-100', () => {
      expect(evaluate('range(t, 0, 100)', { t: 0 })).toBe(0)
      expect(evaluate('range(t, 0, 100)', { t: 0.5 })).toBe(50)
      expect(evaluate('range(t, 0, 100)', { t: 1 })).toBe(100)
    })

    it('range(t, -10, 10) maps 0-1 to -10-10', () => {
      expect(evaluate('range(t, -10, 10)', { t: 0.5 })).toBe(0)
    })

    it('clamp(t, 0, 1) clamps value', () => {
      expect(evaluate('clamp(t, 0, 1)', { t: -0.5 })).toBe(0)
      expect(evaluate('clamp(t, 0, 1)', { t: 0.5 })).toBe(0.5)
      expect(evaluate('clamp(t, 0, 1)', { t: 1.5 })).toBe(1)
    })
  })

  describe('utility functions', () => {
    it('min(a, b) returns minimum', () => {
      expect(evaluate('min(a, b)', { a: 3, b: 5 })).toBe(3)
    })

    it('max(a, b) returns maximum', () => {
      expect(evaluate('max(a, b)', { a: 3, b: 5 })).toBe(5)
    })

    it('abs(t) returns absolute value', () => {
      expect(evaluate('abs(t)', { t: -5 })).toBe(5)
    })

    it('floor(t) returns floor', () => {
      expect(evaluate('floor(t)', { t: 3.7 })).toBe(3)
    })

    it('ceil(t) returns ceiling', () => {
      expect(evaluate('ceil(t)', { t: 3.2 })).toBe(4)
    })

    it('round(t) returns rounded value', () => {
      expect(evaluate('round(t)', { t: 3.5 })).toBe(4)
      expect(evaluate('round(t)', { t: 3.4 })).toBe(3)
    })

    it('lerp(a, b, t) linearly interpolates', () => {
      expect(evaluate('lerp(a, b, t)', { a: 0, b: 10, t: 0.5 })).toBe(5)
    })
  })

  describe('complex expressions', () => {
    it('mul(sin(t), range(t, 0, 10))', () => {
      const result = evaluate('mul(sin(t), range(t, 0, 10))', { t: 0.5 })
      expect(result).toBeCloseTo(Math.sin(0.5) * 5)
    })

    it('add(mul(t, 2), pow(t, 2))', () => {
      const result = evaluate('add(mul(t, 2), pow(t, 2))', { t: 3 })
      expect(result).toBe(3 * 2 + 3 * 3) // 6 + 9 = 15
    })
  })

  describe('constants', () => {
    it('PI constant', () => {
      expect(evaluate('PI', {})).toBeCloseTo(Math.PI)
    })

    it('E constant', () => {
      expect(evaluate('E', {})).toBeCloseTo(Math.E)
    })
  })

  describe('noise functions', () => {
    it('noise(t) returns value in [0, 1]', () => {
      for (let t = 0; t < 100; t += 0.1) {
        const result = evaluate('noise(t)', { t })
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(1)
      }
    })

    it('noise(t) is deterministic for same input', () => {
      const result1 = evaluate('noise(t)', { t: 42.5 })
      const result2 = evaluate('noise(t)', { t: 42.5 })
      expect(result1).toBe(result2)
    })

    it('noise(t, seed) produces different values with different seeds', () => {
      const result1 = evaluate('noise(t, seed)', { t: 1, seed: 0 })
      const result2 = evaluate('noise(t, seed)', { t: 1, seed: 100 })
      expect(result1).not.toBe(result2)
    })

    it('fract(t) returns fractional part', () => {
      expect(evaluate('fract(t)', { t: 3.7 })).toBeCloseTo(0.7)
      expect(evaluate('fract(t)', { t: -1.3 })).toBeCloseTo(0.7)
    })

    it('step(edge, t) returns 0 if t < edge, 1 otherwise', () => {
      expect(evaluate('step(edge, t)', { edge: 0.5, t: 0.3 })).toBe(0)
      expect(evaluate('step(edge, t)', { edge: 0.5, t: 0.5 })).toBe(1)
      expect(evaluate('step(edge, t)', { edge: 0.5, t: 0.7 })).toBe(1)
    })
  })

  describe('wave functions', () => {
    it('saw(t) returns sawtooth wave [0, 1]', () => {
      expect(evaluate('saw(t)', { t: 0 })).toBeCloseTo(0)
      expect(evaluate('saw(t)', { t: 0.5 })).toBeCloseTo(0.5)
      expect(evaluate('saw(t)', { t: 0.999 })).toBeCloseTo(0.999)
    })

    it('pulse(t, duty) returns pulse wave', () => {
      expect(evaluate('pulse(t, duty)', { t: 0.3, duty: 0.5 })).toBe(1)
      expect(evaluate('pulse(t, duty)', { t: 0.7, duty: 0.5 })).toBe(0)
    })

    it('tri(t) returns triangle wave [0, 1]', () => {
      expect(evaluate('tri(t)', { t: 0 })).toBeCloseTo(0)
      expect(evaluate('tri(t)', { t: 0.25 })).toBeCloseTo(0.5)
      expect(evaluate('tri(t)', { t: 0.5 })).toBeCloseTo(1)
      expect(evaluate('tri(t)', { t: 0.75 })).toBeCloseTo(0.5)
    })
  })

  describe('periodic wave functions', () => {
    it('phase(t, period) normalizes time to 0-1', () => {
      expect(evaluate('phase(t, period)', { t: 0, period: 1000 })).toBeCloseTo(0)
      expect(evaluate('phase(t, period)', { t: 500, period: 1000 })).toBeCloseTo(0.5)
      expect(evaluate('phase(t, period)', { t: 1000, period: 1000 })).toBeCloseTo(0)
      expect(evaluate('phase(t, period)', { t: 1500, period: 1000 })).toBeCloseTo(0.5)
    })

    it('phase(t, period, offset) applies offset', () => {
      expect(evaluate('phase(t, period, offset)', { t: 0, period: 1000, offset: 250 })).toBeCloseTo(0.25)
      expect(evaluate('phase(t, period, offset)', { t: 0, period: 1000, offset: 500 })).toBeCloseTo(0.5)
    })

    it('osc(t, period) returns sin wave 0-1', () => {
      // sin starts at 0.5 (since (sin(0)+1)/2 = 0.5)
      expect(evaluate('osc(t, period)', { t: 0, period: 1000 })).toBeCloseTo(0.5)
      // at 1/4 period, sin(π/2) = 1 → (1+1)/2 = 1
      expect(evaluate('osc(t, period)', { t: 250, period: 1000 })).toBeCloseTo(1)
      // at 1/2 period, sin(π) = 0 → (0+1)/2 = 0.5
      expect(evaluate('osc(t, period)', { t: 500, period: 1000 })).toBeCloseTo(0.5)
      // at 3/4 period, sin(3π/2) = -1 → (-1+1)/2 = 0
      expect(evaluate('osc(t, period)', { t: 750, period: 1000 })).toBeCloseTo(0)
    })

    it('osc(t, period, offset) applies offset', () => {
      // offset by 1/4 period shifts phase by 90°
      expect(evaluate('osc(t, period, offset)', { t: 0, period: 1000, offset: 250 })).toBeCloseTo(1)
    })

    it('oscPulse(t, period, duty) returns periodic pulse', () => {
      // duty=0.5: first half is 1, second half is 0
      expect(evaluate('oscPulse(t, period, duty)', { t: 0, period: 1000, duty: 0.5 })).toBe(1)
      expect(evaluate('oscPulse(t, period, duty)', { t: 250, period: 1000, duty: 0.5 })).toBe(1)
      expect(evaluate('oscPulse(t, period, duty)', { t: 500, period: 1000, duty: 0.5 })).toBe(0)
      expect(evaluate('oscPulse(t, period, duty)', { t: 750, period: 1000, duty: 0.5 })).toBe(0)
      // next period
      expect(evaluate('oscPulse(t, period, duty)', { t: 1000, period: 1000, duty: 0.5 })).toBe(1)
    })

    it('oscPulse(t, period, offset, duty) applies offset', () => {
      expect(evaluate('oscPulse(t, period, offset, duty)', { t: 0, period: 1000, offset: 500, duty: 0.5 })).toBe(0)
    })

    it('oscStep(t, period, steps) returns quantized wave', () => {
      // 4 steps: 0, 0.333, 0.666, 1
      expect(evaluate('oscStep(t, period, steps)', { t: 0, period: 1000, steps: 4 })).toBeCloseTo(0)
      expect(evaluate('oscStep(t, period, steps)', { t: 250, period: 1000, steps: 4 })).toBeCloseTo(1/3)
      expect(evaluate('oscStep(t, period, steps)', { t: 500, period: 1000, steps: 4 })).toBeCloseTo(2/3)
      expect(evaluate('oscStep(t, period, steps)', { t: 750, period: 1000, steps: 4 })).toBeCloseTo(1)
    })

    it('oscStep(t, period, offset, steps) applies offset', () => {
      expect(evaluate('oscStep(t, period, offset, steps)', { t: 0, period: 1000, offset: 250, steps: 4 })).toBeCloseTo(1/3)
    })
  })
})
