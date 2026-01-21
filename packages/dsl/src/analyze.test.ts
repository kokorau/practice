import { describe, it, expect } from 'vitest'
import { parse } from './parser'
import { extractPeriod, extractAllPeriods } from './analyze'

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
