import { describe, it, expect } from 'vitest'
import { parse } from './parser'
import {
  extractReferences,
  extractReferencesFromExpression,
  extractTimelineTrackIds,
  extractTimelineTrackIdsFromExpression,
} from './references'

describe('extractReferences', () => {
  it('extracts short form reference @t', () => {
    const ast = parse('osc(@t, 2000)')
    const refs = extractReferences(ast)
    expect(refs).toEqual([{ key: 't', namespace: null, path: 't' }])
  })

  it('extracts namespaced reference @timeline:track-a', () => {
    const ast = parse('range(@timeline:track-a, 0, 100)')
    const refs = extractReferences(ast)
    expect(refs).toEqual([
      { key: 'timeline:track-a', namespace: 'timeline', path: 'track-a' },
    ])
  })

  it('extracts multiple references', () => {
    const ast = parse('add(@timeline:a, @timeline:b)')
    const refs = extractReferences(ast)
    expect(refs).toEqual([
      { key: 'timeline:a', namespace: 'timeline', path: 'a' },
      { key: 'timeline:b', namespace: 'timeline', path: 'b' },
    ])
  })

  it('extracts mixed short and namespaced references', () => {
    const ast = parse('mul(@t, @timeline:opacity)')
    const refs = extractReferences(ast)
    expect(refs).toEqual([
      { key: 't', namespace: null, path: 't' },
      { key: 'timeline:opacity', namespace: 'timeline', path: 'opacity' },
    ])
  })

  it('extracts references from nested expressions', () => {
    const ast = parse('range(mul(@timeline:track-mask, 2), @timeline:min, @timeline:max)')
    const refs = extractReferences(ast)
    expect(refs).toEqual([
      { key: 'timeline:track-mask', namespace: 'timeline', path: 'track-mask' },
      { key: 'timeline:min', namespace: 'timeline', path: 'min' },
      { key: 'timeline:max', namespace: 'timeline', path: 'max' },
    ])
  })

  it('extracts references from binary expressions', () => {
    const ast = parse('@timeline:a + @timeline:b')
    const refs = extractReferences(ast)
    expect(refs).toEqual([
      { key: 'timeline:a', namespace: 'timeline', path: 'a' },
      { key: 'timeline:b', namespace: 'timeline', path: 'b' },
    ])
  })

  it('extracts references from unary expressions', () => {
    const ast = parse('-@timeline:x')
    const refs = extractReferences(ast)
    expect(refs).toEqual([
      { key: 'timeline:x', namespace: 'timeline', path: 'x' },
    ])
  })

  it('returns empty array for expressions without references', () => {
    const ast = parse('add(t, mul(5, 10))')
    const refs = extractReferences(ast)
    expect(refs).toEqual([])
  })

  it('returns empty array for number-only expressions', () => {
    const ast = parse('42')
    const refs = extractReferences(ast)
    expect(refs).toEqual([])
  })

  it('preserves order of references as encountered', () => {
    const ast = parse('add(mul(@timeline:z, @timeline:a), @timeline:m)')
    const refs = extractReferences(ast)
    expect(refs.map((r) => r.path)).toEqual(['z', 'a', 'm'])
  })

  it('includes duplicate references', () => {
    const ast = parse('add(@timeline:x, @timeline:x)')
    const refs = extractReferences(ast)
    expect(refs).toHaveLength(2)
    expect(refs[0]).toEqual({ key: 'timeline:x', namespace: 'timeline', path: 'x' })
    expect(refs[1]).toEqual({ key: 'timeline:x', namespace: 'timeline', path: 'x' })
  })
})

describe('extractReferencesFromExpression', () => {
  it('parses and extracts references from string', () => {
    const refs = extractReferencesFromExpression('range(@timeline:track-mask, 0.1, 0.9)')
    expect(refs).toEqual([
      { key: 'timeline:track-mask', namespace: 'timeline', path: 'track-mask' },
    ])
  })

  it('handles complex expressions', () => {
    const refs = extractReferencesFromExpression('=osc(@t, 2000) * @timeline:amplitude')
    expect(refs).toEqual([
      { key: 't', namespace: null, path: 't' },
      { key: 'timeline:amplitude', namespace: 'timeline', path: 'amplitude' },
    ])
  })

  it('handles expression with operator syntax', () => {
    const refs = extractReferencesFromExpression('@timeline:a * 2 + @timeline:b / 3')
    expect(refs).toEqual([
      { key: 'timeline:a', namespace: 'timeline', path: 'a' },
      { key: 'timeline:b', namespace: 'timeline', path: 'b' },
    ])
  })
})

describe('extractTimelineTrackIds', () => {
  it('extracts track IDs from timeline namespace references', () => {
    const refs = [
      { key: 'timeline:track-a', namespace: 'timeline', path: 'track-a' },
      { key: 't', namespace: null, path: 't' },
      { key: 'timeline:track-b', namespace: 'timeline', path: 'track-b' },
    ]
    const trackIds = extractTimelineTrackIds(refs)
    expect(trackIds).toEqual(['track-a', 'track-b'])
  })

  it('returns unique track IDs', () => {
    const refs = [
      { key: 'timeline:track-a', namespace: 'timeline', path: 'track-a' },
      { key: 'timeline:track-a', namespace: 'timeline', path: 'track-a' },
      { key: 'timeline:track-b', namespace: 'timeline', path: 'track-b' },
    ]
    const trackIds = extractTimelineTrackIds(refs)
    expect(trackIds).toEqual(['track-a', 'track-b'])
  })

  it('ignores non-timeline namespace references', () => {
    const refs = [
      { key: 't', namespace: null, path: 't' },
      { key: 'other:value', namespace: 'other', path: 'value' },
    ]
    const trackIds = extractTimelineTrackIds(refs)
    expect(trackIds).toEqual([])
  })

  it('returns empty array for empty input', () => {
    const trackIds = extractTimelineTrackIds([])
    expect(trackIds).toEqual([])
  })
})

describe('extractTimelineTrackIdsFromExpression', () => {
  it('extracts track IDs directly from expression string', () => {
    const trackIds = extractTimelineTrackIdsFromExpression('range(@timeline:opacity, 0, 1)')
    expect(trackIds).toEqual(['opacity'])
  })

  it('handles multiple timeline references', () => {
    const trackIds = extractTimelineTrackIdsFromExpression(
      'lerp(@timeline:start, @timeline:end, @timeline:progress)'
    )
    expect(trackIds).toEqual(['start', 'end', 'progress'])
  })

  it('filters out non-timeline references', () => {
    const trackIds = extractTimelineTrackIdsFromExpression('mul(@t, @timeline:scale)')
    expect(trackIds).toEqual(['scale'])
  })

  it('returns unique track IDs', () => {
    const trackIds = extractTimelineTrackIdsFromExpression(
      'add(@timeline:x, mul(@timeline:x, 2))'
    )
    expect(trackIds).toEqual(['x'])
  })

  it('returns empty array for expressions without timeline references', () => {
    const trackIds = extractTimelineTrackIdsFromExpression('osc(@t, 2000)')
    expect(trackIds).toEqual([])
  })

  it('handles operator syntax with timeline references', () => {
    const trackIds = extractTimelineTrackIdsFromExpression(
      '@timeline:a + @timeline:b * @timeline:c'
    )
    expect(trackIds).toEqual(['a', 'b', 'c'])
  })
})
