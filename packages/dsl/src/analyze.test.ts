import { describe, it, expect } from 'vitest'
import { parse } from './parser'
import { extractPeriod, extractAllPeriods, analyzeAmplitude } from './analyze'

describe('extractPeriod', () => {
  it('extracts period from osc()', () => {
    const ast = parse('osc(t, 2000)')
    expect(extractPeriod(ast)).toBe(2000)
  })

  it('extracts period from phase()', () => {
    const ast = parse('phase(t, 3000)')
    expect(extractPeriod(ast)).toBe(3000)
  })

  it('extracts period from oscPulse()', () => {
    const ast = parse('oscPulse(t, 1500, 0.5)')
    expect(extractPeriod(ast)).toBe(1500)
  })

  it('extracts period from oscStep()', () => {
    const ast = parse('oscStep(t, 4000, 8)')
    expect(extractPeriod(ast)).toBe(4000)
  })

  it('extracts period from nested expression', () => {
    const ast = parse('range(osc(t, 2000), 0, 100)')
    expect(extractPeriod(ast)).toBe(2000)
  })

  it('extracts period from deeply nested expression', () => {
    const ast = parse('mul(add(1, phase(t, 5000)), 2)')
    expect(extractPeriod(ast)).toBe(5000)
  })

  it('returns first period when multiple exist', () => {
    const ast = parse('add(osc(t, 2000), osc(t, 500))')
    expect(extractPeriod(ast)).toBe(2000)
  })

  it('returns undefined for non-periodic expressions', () => {
    const ast = parse('add(t, 5)')
    expect(extractPeriod(ast)).toBeUndefined()
  })

  it('returns undefined for number-only expressions', () => {
    const ast = parse('42')
    expect(extractPeriod(ast)).toBeUndefined()
  })

  it('returns undefined when period is not a literal number', () => {
    // period is a variable, not extractable statically
    const ast = parse('osc(t, period)')
    expect(extractPeriod(ast)).toBeUndefined()
  })
})

describe('extractAllPeriods', () => {
  it('extracts all periods from expression with multiple osc()', () => {
    const ast = parse('add(osc(t, 4000), osc(t, 500))')
    expect(extractAllPeriods(ast)).toEqual([4000, 500])
  })

  it('extracts periods from mixed periodic functions', () => {
    const ast = parse('mul(osc(t, 2000), phase(t, 1000))')
    expect(extractAllPeriods(ast)).toEqual([2000, 1000])
  })

  it('returns empty array for non-periodic expressions', () => {
    const ast = parse('add(t, mul(t, 2))')
    expect(extractAllPeriods(ast)).toEqual([])
  })

  it('handles deeply nested multiple periods', () => {
    const ast = parse('add(range(osc(t, 3000), 0, 1), mul(oscPulse(t, 500, 0.3), 0.5))')
    expect(extractAllPeriods(ast)).toEqual([3000, 500])
  })
})

describe('analyzeAmplitude', () => {
  it('analyzes simple osc() amplitude', () => {
    const result = analyzeAmplitude('osc(t, 2000)')
    expect(result.min).toBeCloseTo(0, 5)
    expect(result.max).toBeCloseTo(1, 5)
    expect(result.amplitude).toBeCloseTo(0.5, 5)
    expect(result.center).toBeCloseTo(0.5, 5)
    expect(result.period).toBe(2000)
  })

  it('analyzes range(osc()) expression', () => {
    const result = analyzeAmplitude('range(osc(t, 12000), 22, 30)')
    expect(result.min).toBeCloseTo(22, 5)
    expect(result.max).toBeCloseTo(30, 5)
    expect(result.amplitude).toBeCloseTo(4, 5)
    expect(result.center).toBeCloseTo(26, 5)
    expect(result.period).toBe(12000)
  })

  it('analyzes phase() amplitude', () => {
    const result = analyzeAmplitude('phase(t, 1000)')
    expect(result.min).toBeCloseTo(0, 5)
    expect(result.max).toBeCloseTo(1, 1) // phase goes 0 to ~1 (not quite 1 due to sampling)
    expect(result.period).toBe(1000)
  })

  it('analyzes oscPulse() amplitude', () => {
    const result = analyzeAmplitude('oscPulse(t, 500, 0.5)')
    expect(result.min).toBe(0)
    expect(result.max).toBe(1)
    expect(result.amplitude).toBe(0.5)
    expect(result.center).toBe(0.5)
    expect(result.period).toBe(500)
  })

  it('analyzes oscStep() amplitude', () => {
    const result = analyzeAmplitude('oscStep(t, 1000, 4)')
    expect(result.min).toBeCloseTo(0, 5)
    expect(result.max).toBeCloseTo(1, 5)
    expect(result.period).toBe(1000)
  })

  it('computes LCM for multiple periods', () => {
    const result = analyzeAmplitude('add(osc(t, 2000), osc(t, 500))')
    expect(result.period).toBe(2000) // LCM(2000, 500) = 2000
  })

  it('computes LCM for non-divisible periods', () => {
    const result = analyzeAmplitude('add(osc(t, 300), osc(t, 200))')
    expect(result.period).toBe(600) // LCM(300, 200) = 600
  })

  it('uses default period for non-periodic expressions', () => {
    const result = analyzeAmplitude('add(t, 5)')
    expect(result.period).toBe(1000)
  })

  it('handles constant expressions', () => {
    const result = analyzeAmplitude('42')
    expect(result.min).toBe(42)
    expect(result.max).toBe(42)
    expect(result.amplitude).toBe(0)
    expect(result.center).toBe(42)
  })

  it('accepts AST node as input', () => {
    const ast = parse('osc(t, 3000)')
    const result = analyzeAmplitude(ast)
    expect(result.min).toBeCloseTo(0, 5)
    expect(result.max).toBeCloseTo(1, 5)
    expect(result.period).toBe(3000)
  })

  it('accepts custom sample count', () => {
    const result = analyzeAmplitude('osc(t, 1000)', 1000)
    expect(result.min).toBeCloseTo(0, 5)
    expect(result.max).toBeCloseTo(1, 5)
  })

  // Complex patterns
  describe('complex patterns', () => {
    it('analyzes mul(osc, constant) - scaled oscillation', () => {
      const result = analyzeAmplitude('mul(osc(t, 1000), 10)')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(10, 5)
      expect(result.amplitude).toBeCloseTo(5, 5)
      expect(result.center).toBeCloseTo(5, 5)
    })

    it('analyzes sub(constant, osc) - inverted oscillation', () => {
      const result = analyzeAmplitude('sub(1, osc(t, 1000))')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(1, 5)
    })

    it('analyzes negative range', () => {
      const result = analyzeAmplitude('range(osc(t, 1000), -50, -10)')
      expect(result.min).toBeCloseTo(-50, 5)
      expect(result.max).toBeCloseTo(-10, 5)
      expect(result.amplitude).toBeCloseTo(20, 5)
      expect(result.center).toBeCloseTo(-30, 5)
    })

    it('analyzes range crossing zero', () => {
      const result = analyzeAmplitude('range(osc(t, 1000), -100, 100)')
      expect(result.min).toBeCloseTo(-100, 5)
      expect(result.max).toBeCloseTo(100, 5)
      expect(result.amplitude).toBeCloseTo(100, 5)
      expect(result.center).toBeCloseTo(0, 5)
    })

    it('analyzes nested range(range(osc))', () => {
      // Inner range: osc [0,1] -> [0, 0.5]
      // Outer range: [0, 0.5] -> [10, 20] (actually maps 0->10, 0.5->15)
      const result = analyzeAmplitude('range(range(osc(t, 1000), 0, 0.5), 10, 20)')
      expect(result.min).toBeCloseTo(10, 5)
      expect(result.max).toBeCloseTo(15, 5)
    })

    it('analyzes add(osc, osc) with same period - amplitude doubles', () => {
      const result = analyzeAmplitude('add(osc(t, 1000), osc(t, 1000))')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(2, 5)
      expect(result.amplitude).toBeCloseTo(1, 5)
    })

    it('analyzes mul(osc, osc) with same period', () => {
      const result = analyzeAmplitude('mul(osc(t, 1000), osc(t, 1000))')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(1, 5)
    })

    it('analyzes add(osc, osc) with different periods - beating pattern', () => {
      // Two oscillators with different periods create a beating pattern
      const result = analyzeAmplitude('add(osc(t, 1000), osc(t, 1100))', 200)
      expect(result.period).toBe(11000) // LCM(1000, 1100) = 11000
      expect(result.min).toBeCloseTo(0, 1)
      expect(result.max).toBeCloseTo(2, 1)
    })

    it('analyzes osc with offset parameter', () => {
      const result = analyzeAmplitude('osc(t, 2000, 500)')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(1, 5)
      expect(result.period).toBe(2000)
    })

    it('analyzes clamp(osc * 2) - clipped oscillation', () => {
      // osc [0,1] * 2 = [0, 2], clamped to [0, 1]
      const result = analyzeAmplitude('clamp(mul(osc(t, 1000), 2), 0, 1)')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(1, 5)
    })

    it('analyzes smoothstep with osc input', () => {
      const result = analyzeAmplitude('smoothstep(0.2, 0.8, osc(t, 1000))')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(1, 5)
    })

    it('analyzes pow(osc, 2) - squared oscillation', () => {
      const result = analyzeAmplitude('pow(osc(t, 1000), 2)')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(1, 5)
    })

    it('analyzes sin(mul(phase, PI*2)) - sine from phase', () => {
      // phase [0,1) -> sin([0, 2*PI)) -> [-1, 1]
      const result = analyzeAmplitude('sin(mul(phase(t, 1000), mul(PI, 2)))')
      expect(result.min).toBeCloseTo(-1, 1)
      expect(result.max).toBeCloseTo(1, 1)
    })

    it('analyzes complex expression: range(add(osc, mul(osc, 0.5)), 0, 100)', () => {
      // osc [0,1] + osc*0.5 [0,0.5] = [0, 1.5]
      // range([0,1.5], 0, 100) = [0, 150]
      const result = analyzeAmplitude('range(add(osc(t, 1000), mul(osc(t, 1000), 0.5)), 0, 100)')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(150, 5)
    })

    it('analyzes three oscillators with coprime periods', () => {
      const result = analyzeAmplitude('add(add(osc(t, 100), osc(t, 150)), osc(t, 200))', 200)
      expect(result.period).toBe(600) // LCM(100, 150, 200) = 600
      // Three osc functions with different phases won't all reach 0 or 3 simultaneously
      expect(result.min).toBeGreaterThanOrEqual(0)
      expect(result.min).toBeLessThan(1)
      expect(result.max).toBeGreaterThan(2)
      expect(result.max).toBeLessThanOrEqual(3)
    })

    it('analyzes lerp between two osc functions', () => {
      // lerp(osc1, osc2, 0.5) = osc1 + (osc2 - osc1) * 0.5
      const result = analyzeAmplitude('lerp(osc(t, 1000), osc(t, 2000), 0.5)')
      expect(result.period).toBe(2000) // LCM(1000, 2000)
      expect(result.min).toBeGreaterThanOrEqual(0)
      expect(result.max).toBeLessThanOrEqual(1)
    })

    it('analyzes abs(sub(osc, 0.5)) - folded wave', () => {
      // osc [0,1] - 0.5 = [-0.5, 0.5], abs = [0, 0.5]
      const result = analyzeAmplitude('abs(sub(osc(t, 1000), 0.5))')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(0.5, 5)
    })

    it('analyzes max(osc, osc) with phase offset', () => {
      // Two osc with offset create envelope
      const result = analyzeAmplitude('max(osc(t, 1000, 0), osc(t, 1000, 250))')
      expect(result.min).toBeGreaterThanOrEqual(0)
      expect(result.max).toBeCloseTo(1, 5)
    })

    it('analyzes min(osc, constant) - capped oscillation', () => {
      const result = analyzeAmplitude('min(osc(t, 1000), 0.7)')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(0.7, 5)
    })

    it('analyzes div(osc, 2) - halved amplitude', () => {
      const result = analyzeAmplitude('div(osc(t, 1000), 2)')
      expect(result.min).toBeCloseTo(0, 5)
      expect(result.max).toBeCloseTo(0.5, 5)
      expect(result.amplitude).toBeCloseTo(0.25, 5)
    })

    it('analyzes floor(mul(osc, 4)) - quantized steps', () => {
      // osc [0,1] * 4 = [0, 4], floor = [0, 1, 2, 3, 4]
      // osc reaches exactly 1 at t=0, so floor(4) = 4
      const result = analyzeAmplitude('floor(mul(osc(t, 1000), 4))')
      expect(result.min).toBe(0)
      expect(result.max).toBe(4)
    })
  })
})
