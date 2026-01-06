import type { SampleDefinition } from '../SampleDefinition'
import { createSolidSpec } from '@practice/texture'

/** Sand Ripple: Desert wind patterns (void node placeholder) */
export const SandRipple: SampleDefinition = {
  id: 'sand-ripple',
  name: 'Sand Ripple',
  description: 'Desert wind patterns',
  category: 'gradient',
  nodes: [
    {
      id: 'void',
      badge: 'A',
      label: 'Void',
      row: 0,
      params: [],
      createSpec: null,
    },
  ],
  connections: [
    { from: 'void', to: 'output' },
  ],
  createOutputSpec: () => {
    // Placeholder: solid sandy color
    return createSolidSpec({ color: [0.85, 0.75, 0.55, 1] })
  },
}

export const SandRippleSamples: SampleDefinition[] = [SandRipple]
