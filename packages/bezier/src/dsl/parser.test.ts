import { describe, it, expect } from 'vitest'
import { tokenize } from './tokenizer'
import { parse, tryParse } from './parser'
import { serialize } from './serializer'
import { evaluate } from '../evaluate'

describe('tokenizer', () => {
  it('should tokenize basic M C command', () => {
    const tokens = tokenize('M 0 0 C 0.4 0 0.6 1 1 1')

    expect(tokens.map((t) => t.type)).toEqual([
      'COMMAND',
      'NUMBER',
      'NUMBER',
      'COMMAND',
      'NUMBER',
      'NUMBER',
      'NUMBER',
      'NUMBER',
      'NUMBER',
      'NUMBER',
      'EOF',
    ])
  })

  it('should handle commas as separators', () => {
    const tokens = tokenize('M 0,0 C 0.4,0 0.6,1 1,1')

    expect(tokens.filter((t) => t.type === 'NUMBER')).toHaveLength(8)
  })

  it('should handle negative numbers', () => {
    const tokens = tokenize('M 0 -0.5 C 0.4 -0.2 0.6 1.5 1 1')

    const numbers = tokens.filter((t) => t.type === 'NUMBER').map((t) => parseFloat(t.value))
    expect(numbers).toContain(-0.5)
    expect(numbers).toContain(-0.2)
    expect(numbers).toContain(1.5)
  })

  it('should handle numbers without leading zero', () => {
    const tokens = tokenize('M 0 0 C .4 0 .6 1 1 1')

    const numbers = tokens.filter((t) => t.type === 'NUMBER').map((t) => parseFloat(t.value))
    expect(numbers).toContain(0.4)
    expect(numbers).toContain(0.6)
  })

  it('should throw on invalid characters', () => {
    expect(() => tokenize('M 0 0 X 1 1')).toThrow()
  })
})

describe('parser', () => {
  it('should parse simple ease-in-out curve', () => {
    const path = parse('M 0 0 C 0.42 0 0.58 1 1 1')

    expect(path.anchors).toHaveLength(2)
    expect(path.anchors[0]!.x).toBe(0)
    expect(path.anchors[0]!.y).toBe(0)
    expect(path.anchors[0]!.handleOut.dx).toBeCloseTo(0.42)
    expect(path.anchors[0]!.handleOut.dy).toBe(0)
    expect(path.anchors[1]!.x).toBe(1)
    expect(path.anchors[1]!.y).toBe(1)
    expect(path.anchors[1]!.handleIn.dx).toBeCloseTo(-0.42)
    expect(path.anchors[1]!.handleIn.dy).toBe(0)
  })

  it('should parse multi-segment path', () => {
    const path = parse('M 0 0 C 0.2 0 0.3 0.5 0.5 0.5 C 0.7 0.5 0.8 1 1 1')

    expect(path.anchors).toHaveLength(3)
    expect(path.anchors[1]!.x).toBeCloseTo(0.5)
    expect(path.anchors[1]!.y).toBeCloseTo(0.5)
  })

  it('should parse S (smooth) command', () => {
    const path = parse('M 0 0 C 0.2 0 0.3 0.5 0.5 0.5 S 0.8 1 1 1')

    expect(path.anchors).toHaveLength(3)
    // S command should calculate cp1 as reflection of prev cp2
    // prev cp2 = (0.3, 0.5), current = (0.5, 0.5)
    // cp1 = 2*(0.5, 0.5) - (0.3, 0.5) = (0.7, 0.5)
    // handleOut of middle anchor = cp1 - (0.5, 0.5) = (0.2, 0)
    expect(path.anchors[1]!.handleOut.dx).toBeCloseTo(0.2)
    expect(path.anchors[1]!.handleOut.dy).toBeCloseTo(0)
  })

  it('should parse L (line) command', () => {
    const path = parse('M 0 0 L 1 1')

    expect(path.anchors).toHaveLength(2)
    expect(path.anchors[0]!.handleOut.dx).toBe(0)
    expect(path.anchors[0]!.handleOut.dy).toBe(0)
    expect(path.anchors[1]!.handleIn.dx).toBe(0)
    expect(path.anchors[1]!.handleIn.dy).toBe(0)
    expect(path.anchors[1]!.handleMode).toBe('corner')
  })

  it('should parse relative commands', () => {
    const path = parse('m 0 0 c 0.42 0 0.58 1 1 1')

    expect(path.anchors).toHaveLength(2)
    expect(path.anchors[1]!.x).toBe(1)
    expect(path.anchors[1]!.y).toBe(1)
  })

  it('should throw on invalid X monotonicity', () => {
    // Path where anchor x goes 0 -> 0.8 -> 0.5 -> 1 (0.5 < 0.8 is invalid)
    expect(() => parse('M 0 0 C 0.2 0 0.7 0.5 0.8 0.5 C 0.4 0.5 0.45 1 0.5 1 C 0.7 1 0.9 1 1 1')).toThrow()
  })

  it('should throw on missing M command', () => {
    expect(() => parse('C 0.42 0 0.58 1 1 1')).toThrow()
  })

  it('should return error result with tryParse', () => {
    const result = tryParse('M 0 0 X 1 1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeDefined()
    }
  })
})

describe('serializer', () => {
  it('should serialize simple path', () => {
    const path = parse('M 0 0 C 0.42 0 0.58 1 1 1')
    const serialized = serialize(path)

    expect(serialized).toContain('M 0 0')
    expect(serialized).toContain('C')
  })

  it('should use S command for smooth transitions', () => {
    // Create a path where handleOut = -handleIn at middle anchor
    // For smooth: at anchor[1], handleOut should equal -handleIn
    // Using C command: M 0 0 C cp1x cp1y cp2x cp2y x y
    // For anchor at (0.5, 0.5) with handleIn = (-0.2, -0.1) and handleOut = (0.2, 0.1)
    // prev segment: C 0.1 0 0.3 0.4 0.5 0.5 -> handleIn = (0.3-0.5, 0.4-0.5) = (-0.2, -0.1)
    // next segment: C 0.7 0.6 0.9 1 1 1 -> handleOut = (0.7-0.5, 0.6-0.5) = (0.2, 0.1)
    const path = parse('M 0 0 C 0.1 0 0.3 0.4 0.5 0.5 C 0.7 0.6 0.9 1 1 1')
    const serialized = serialize(path, { useSmooth: true })

    // The serializer should detect the smooth transition and use S command
    expect(serialized).toMatch(/S\s/)
  })

  it('should serialize without S command when useSmooth is false', () => {
    const path = parse('M 0 0 C 0.1 0 0.2 0.5 0.5 0.5 S 0.9 1 1 1')
    const serialized = serialize(path, { useSmooth: false })

    expect(serialized).not.toMatch(/S\s/)
    expect(serialized).toMatch(/C.*C/)
  })

  it('should use L command for straight lines', () => {
    const path = parse('M 0 0 L 1 1')
    const serialized = serialize(path)

    expect(serialized).toContain('L')
  })

  it('should respect precision option', () => {
    const path = parse('M 0 0 C 0.333333 0 0.666666 1 1 1')
    const serialized = serialize(path, { precision: 2 })

    expect(serialized).toContain('0.33')
    expect(serialized).not.toContain('0.333')
  })
})

describe('round-trip', () => {
  it('should parse and serialize back to equivalent path', () => {
    const original = 'M 0 0 C 0.42 0 0.58 1 1 1'
    const path = parse(original)
    const serialized = serialize(path)
    const reparsed = parse(serialized)

    // Anchors should be equivalent
    expect(reparsed.anchors.length).toBe(path.anchors.length)

    for (let i = 0; i < path.anchors.length; i++) {
      expect(reparsed.anchors[i]!.x).toBeCloseTo(path.anchors[i]!.x, 4)
      expect(reparsed.anchors[i]!.y).toBeCloseTo(path.anchors[i]!.y, 4)
    }
  })

  it('should produce same evaluation results after round-trip', () => {
    const original = 'M 0 0 C 0.25 0.1 0.25 1 1 1'
    const path = parse(original)
    const serialized = serialize(path)
    const reparsed = parse(serialized)

    // Evaluation should produce same results
    for (let x = 0; x <= 1; x += 0.1) {
      expect(evaluate(reparsed, x)).toBeCloseTo(evaluate(path, x), 4)
    }
  })

  it('should handle multi-segment paths', () => {
    const original = 'M 0 0 C 0.1 0 0.2 0.5 0.5 0.5 C 0.8 0.5 0.9 1 1 1'
    const path = parse(original)
    const serialized = serialize(path, { useSmooth: false })
    const reparsed = parse(serialized)

    expect(reparsed.anchors.length).toBe(3)

    for (let x = 0; x <= 1; x += 0.1) {
      expect(evaluate(reparsed, x)).toBeCloseTo(evaluate(path, x), 4)
    }
  })
})
