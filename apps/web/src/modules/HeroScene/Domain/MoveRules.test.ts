import { describe, it, expect } from 'vitest'
import {
  getMaskedNodes,
  findApplicableMask,
  isNodeMasked,
  ensureBaseLayerFirst,
  isValidLayerStructure,
} from './MoveRules'
import {
  createBaseLayer,
  createSurfaceLayer,
  createGroup,
  createMaskNode,
  type SceneNode,
} from './LayerNode'

describe('MoveRules', () => {
  // Helper to create a solid surface
  const solidSurface = { type: 'solid' as const, color: '#000' }

  describe('getMaskedNodes', () => {
    it('should return nodes after mask', () => {
      const children: SceneNode[] = [
        createSurfaceLayer('surface-1', solidSurface),
        createMaskNode('mask-1'),
        createSurfaceLayer('surface-2', solidSurface),
        createSurfaceLayer('surface-3', solidSurface),
      ]

      const masked = getMaskedNodes(children, 'mask-1')
      expect(masked).toHaveLength(2)
      expect(masked[0]?.id).toBe('surface-2')
      expect(masked[1]?.id).toBe('surface-3')
    })

    it('should return empty array if mask not found', () => {
      const children: SceneNode[] = [
        createSurfaceLayer('surface-1', solidSurface),
      ]

      const masked = getMaskedNodes(children, 'non-existent')
      expect(masked).toHaveLength(0)
    })

    it('should return empty array if mask is last', () => {
      const children: SceneNode[] = [
        createSurfaceLayer('surface-1', solidSurface),
        createMaskNode('mask-1'),
      ]

      const masked = getMaskedNodes(children, 'mask-1')
      expect(masked).toHaveLength(0)
    })
  })

  describe('findApplicableMask', () => {
    it('should find mask before target node', () => {
      const children: SceneNode[] = [
        createMaskNode('mask-1'),
        createSurfaceLayer('surface-1', solidSurface),
        createSurfaceLayer('surface-2', solidSurface),
      ]

      const mask = findApplicableMask(children, 'surface-2')
      expect(mask?.id).toBe('mask-1')
    })

    it('should return undefined if no mask before target', () => {
      const children: SceneNode[] = [
        createSurfaceLayer('surface-1', solidSurface),
        createMaskNode('mask-1'),
      ]

      const mask = findApplicableMask(children, 'surface-1')
      expect(mask).toBeUndefined()
    })

    it('should find nearest mask when multiple exist', () => {
      const children: SceneNode[] = [
        createMaskNode('mask-1'),
        createSurfaceLayer('surface-1', solidSurface),
        createMaskNode('mask-2'),
        createSurfaceLayer('surface-2', solidSurface),
      ]

      const mask = findApplicableMask(children, 'surface-2')
      expect(mask?.id).toBe('mask-2')
    })
  })

  describe('isNodeMasked', () => {
    it('should return true for masked node', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createGroup('group-1', [
          createMaskNode('mask-1'),
          createSurfaceLayer('surface-1', solidSurface),
        ]),
      ]

      expect(isNodeMasked(nodes, 'surface-1')).toBe(true)
    })

    it('should return false for non-masked node', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createGroup('group-1', [
          createSurfaceLayer('surface-1', solidSurface),
          createMaskNode('mask-1'),
        ]),
      ]

      expect(isNodeMasked(nodes, 'surface-1')).toBe(false)
    })

    it('should return false for root level node', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createSurfaceLayer('surface-1', solidSurface),
      ]

      expect(isNodeMasked(nodes, 'surface-1')).toBe(false)
    })
  })

  describe('ensureBaseLayerFirst', () => {
    it('should move base layer to index 0', () => {
      const nodes: SceneNode[] = [
        createSurfaceLayer('surface-1', solidSurface),
        createBaseLayer(solidSurface),
      ]

      const fixed = ensureBaseLayerFirst(nodes)
      expect(fixed[0]?.id).toBe('base')
      expect(fixed).toHaveLength(2)
    })

    it('should not modify already valid structure', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createSurfaceLayer('surface-1', solidSurface),
      ]

      const fixed = ensureBaseLayerFirst(nodes)
      expect(fixed).toEqual(nodes)
    })

    it('should handle empty array', () => {
      const nodes: SceneNode[] = []
      const fixed = ensureBaseLayerFirst(nodes)
      expect(fixed).toHaveLength(0)
    })
  })

  describe('isValidLayerStructure', () => {
    it('should return true for valid structure', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createSurfaceLayer('surface-1', solidSurface),
      ]

      expect(isValidLayerStructure(nodes)).toBe(true)
    })

    it('should return false for invalid structure', () => {
      const nodes: SceneNode[] = [
        createSurfaceLayer('surface-1', solidSurface),
        createBaseLayer(solidSurface),
      ]

      expect(isValidLayerStructure(nodes)).toBe(false)
    })

    it('should return true for empty array', () => {
      expect(isValidLayerStructure([])).toBe(true)
    })
  })
})
