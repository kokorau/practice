import { describe, it, expect } from 'vitest'
import { calculatePhaseLayouts } from './PhaseLayout'
import type { Phase, PhaseId } from './Phase'
import type { Ms } from './Unit'

describe('calculatePhaseLayouts', () => {
  it('calculates layouts for phases with duration', () => {
    const phases: Phase[] = [
      { id: 'phase-1' as PhaseId, type: 'Opening', duration: 5000 as Ms },
      { id: 'phase-2' as PhaseId, type: 'Ending', duration: 3000 as Ms },
    ]

    const layouts = calculatePhaseLayouts(phases, 30000 as Ms)

    expect(layouts).toHaveLength(2)
    expect(layouts[0]).toEqual({
      phaseId: 'phase-1',
      startMs: 0,
      endMs: 5000,
      duration: 5000,
    })
    expect(layouts[1]).toEqual({
      phaseId: 'phase-2',
      startMs: 5000,
      endMs: 8000,
      duration: 3000,
    })
  })

  it('handles infinite phase (undefined duration)', () => {
    const phases: Phase[] = [
      { id: 'phase-1' as PhaseId, type: 'Opening', duration: 5000 as Ms },
      { id: 'phase-2' as PhaseId, type: 'Loop' }, // no duration = infinite
    ]

    const layouts = calculatePhaseLayouts(phases, 30000 as Ms)

    expect(layouts).toHaveLength(2)
    expect(layouts[0]).toEqual({
      phaseId: 'phase-1',
      startMs: 0,
      endMs: 5000,
      duration: 5000,
    })
    expect(layouts[1]).toEqual({
      phaseId: 'phase-2',
      startMs: 5000,
      endMs: 30000,
      duration: 25000, // visibleDuration - startMs
    })
  })

  it('returns empty array for empty phases', () => {
    const layouts = calculatePhaseLayouts([], 30000 as Ms)
    expect(layouts).toEqual([])
  })
})
