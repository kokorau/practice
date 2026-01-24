import { describe, it, expect } from 'vitest'
import { isProcessorTarget, hasProcessorBelow } from './useProcessorTargetHelper'
import type { LayerNodeConfig, NormalizedSurfaceConfig, NormalizedMaskConfig } from '@practice/section-visual'
import { $PropertyValue } from '@practice/section-visual'

// Helper functions to create mock layers
const createMockSurface = (id: string, name: string): LayerNodeConfig => ({
  type: 'surface',
  id,
  name,
  visible: true,
  surface: { id: 'solid', params: {} } as NormalizedSurfaceConfig,
  colors: { primary: 'B', secondary: 'auto' },
})

const createMockGroup = (id: string, name: string, children: LayerNodeConfig[]): LayerNodeConfig => ({
  type: 'group',
  id,
  name,
  visible: true,
  children,
})

const createMockProcessor = (id: string, name: string): LayerNodeConfig => ({
  type: 'processor',
  id,
  name,
  visible: true,
  modifiers: [
    {
      type: 'mask',
      enabled: true,
      shape: {
        id: 'circle',
        params: {
          centerX: $PropertyValue.static(0.5),
          centerY: $PropertyValue.static(0.5),
          radius: $PropertyValue.static(0.3),
          cutout: $PropertyValue.static(false),
        },
      } as NormalizedMaskConfig,
      invert: false,
      feather: 0,
    },
  ],
})

describe('useProcessorTargetHelper', () => {
  describe('isProcessorTarget', () => {
    it('returns false for empty layers', () => {
      expect(isProcessorTarget([], 0)).toBe(false)
    })

    it('returns false for processor layer itself', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockProcessor('processor-1', 'Processor'),
      ]
      expect(isProcessorTarget(layers, 1)).toBe(false)
    })

    it('returns true for first non-processor before a processor', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockProcessor('processor-1', 'Processor'),
      ]
      expect(isProcessorTarget(layers, 0)).toBe(true)
    })

    it('returns false for non-first elements before processor', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockSurface('surface-2', 'Surface 2'),
        createMockProcessor('processor-1', 'Processor'),
      ]
      expect(isProcessorTarget(layers, 0)).toBe(true)  // first target
      expect(isProcessorTarget(layers, 1)).toBe(false) // not first target
    })

    it('returns false when there is no processor after', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockSurface('surface-2', 'Surface 2'),
      ]
      expect(isProcessorTarget(layers, 0)).toBe(false)
      expect(isProcessorTarget(layers, 1)).toBe(false)
    })

    it('returns true for first group before processor', () => {
      const layers: LayerNodeConfig[] = [
        createMockGroup('group-1', 'Group 1', [
          createMockSurface('surface-1', 'Surface 1'),
        ]),
        createMockProcessor('processor-1', 'Processor'),
      ]
      expect(isProcessorTarget(layers, 0)).toBe(true)
    })
  })

  describe('hasProcessorBelow', () => {
    it('returns false for empty layers', () => {
      expect(hasProcessorBelow([], 0)).toBe(false)
    })

    it('returns false for processor layer itself', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockProcessor('processor-1', 'Processor'),
      ]
      expect(hasProcessorBelow(layers, 1)).toBe(false)
    })

    it('returns false for first target (gets arrow head)', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockProcessor('processor-1', 'Processor'),
      ]
      expect(hasProcessorBelow(layers, 0)).toBe(false)
    })

    it('returns true for non-first elements before processor', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockSurface('surface-2', 'Surface 2'),
        createMockProcessor('processor-1', 'Processor'),
      ]
      expect(hasProcessorBelow(layers, 0)).toBe(false) // first target (arrow head)
      expect(hasProcessorBelow(layers, 1)).toBe(true)  // vertical line
    })

    it('returns false when there is no processor after', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockSurface('surface-2', 'Surface 2'),
      ]
      expect(hasProcessorBelow(layers, 0)).toBe(false)
      expect(hasProcessorBelow(layers, 1)).toBe(false)
    })

    it('returns true for multiple elements before processor', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockGroup('group-1', 'Group 1', []),
        createMockSurface('surface-2', 'Surface 2'),
        createMockProcessor('processor-1', 'Processor'),
      ]
      expect(hasProcessorBelow(layers, 0)).toBe(false) // first target
      expect(hasProcessorBelow(layers, 1)).toBe(true)  // middle
      expect(hasProcessorBelow(layers, 2)).toBe(true)  // last before processor
    })
  })

  describe('integration: multiple processors', () => {
    it('handles layers with processor in the middle', () => {
      const layers: LayerNodeConfig[] = [
        createMockSurface('surface-1', 'Surface 1'),
        createMockProcessor('processor-1', 'Processor 1'),
        createMockSurface('surface-2', 'Surface 2'),
      ]
      // surface-1 is before processor-1
      expect(isProcessorTarget(layers, 0)).toBe(true)
      expect(hasProcessorBelow(layers, 0)).toBe(false)
      // surface-2 is after processor-1, no processor after it
      expect(isProcessorTarget(layers, 2)).toBe(false)
      expect(hasProcessorBelow(layers, 2)).toBe(false)
    })
  })
})
