import { describe, it, expect } from 'vitest'
import {
  canMoveBaseLayer,
  canDropBeforeBaseLayer,
  canPlaceMaskInBaseLayer,
  canDropIntoNonGroup,
  validateMove,
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

  describe('canMoveBaseLayer', () => {
    it('should reject moving base layer', () => {
      const baseLayer = createBaseLayer(solidSurface)
      const result = canMoveBaseLayer(baseLayer)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('BaseLayer')
    })

    it('should allow moving surface layer', () => {
      const surfaceLayer = createSurfaceLayer('surface-1', solidSurface)
      const result = canMoveBaseLayer(surfaceLayer)
      expect(result.valid).toBe(true)
    })

    it('should allow moving group', () => {
      const group = createGroup('group-1')
      const result = canMoveBaseLayer(group)
      expect(result.valid).toBe(true)
    })

    it('should allow moving mask node', () => {
      const maskNode = createMaskNode('mask-1')
      const result = canMoveBaseLayer(maskNode)
      expect(result.valid).toBe(true)
    })
  })

  describe('canDropBeforeBaseLayer', () => {
    it('should reject dropping before base layer', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createSurfaceLayer('surface-1', solidSurface),
      ]
      const result = canDropBeforeBaseLayer(nodes, 'base', 'before')
      expect(result.valid).toBe(false)
    })

    it('should allow dropping after base layer', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createSurfaceLayer('surface-1', solidSurface),
      ]
      const result = canDropBeforeBaseLayer(nodes, 'base', 'after')
      expect(result.valid).toBe(true)
    })

    it('should allow dropping before non-base layer', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createSurfaceLayer('surface-1', solidSurface),
      ]
      const result = canDropBeforeBaseLayer(nodes, 'surface-1', 'before')
      expect(result.valid).toBe(true)
    })
  })

  describe('canPlaceMaskInBaseLayer', () => {
    it('should reject placing mask into base layer', () => {
      const baseLayer = createBaseLayer(solidSurface)
      const maskNode = createMaskNode('mask-1')
      const nodes: SceneNode[] = [baseLayer]

      const result = canPlaceMaskInBaseLayer(nodes, maskNode, 'base', 'into')
      expect(result.valid).toBe(false)
    })

    it('should allow placing non-mask into base layer', () => {
      const baseLayer = createBaseLayer(solidSurface)
      const surfaceLayer = createSurfaceLayer('surface-1', solidSurface)
      const nodes: SceneNode[] = [baseLayer]

      const result = canPlaceMaskInBaseLayer(nodes, surfaceLayer, 'base', 'into')
      expect(result.valid).toBe(true)
    })

    it('should allow placing mask into regular group', () => {
      const group = createGroup('group-1')
      const maskNode = createMaskNode('mask-1')
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        group,
      ]

      const result = canPlaceMaskInBaseLayer(nodes, maskNode, 'group-1', 'into')
      expect(result.valid).toBe(true)
    })
  })

  describe('canDropIntoNonGroup', () => {
    it('should reject dropping into non-group', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createSurfaceLayer('surface-1', solidSurface),
      ]
      const result = canDropIntoNonGroup(nodes, 'surface-1', 'into')
      expect(result.valid).toBe(false)
    })

    it('should allow dropping into group', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createGroup('group-1'),
      ]
      const result = canDropIntoNonGroup(nodes, 'group-1', 'into')
      expect(result.valid).toBe(true)
    })

    it('should allow before/after position on any node', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createSurfaceLayer('surface-1', solidSurface),
      ]
      expect(canDropIntoNonGroup(nodes, 'surface-1', 'before').valid).toBe(true)
      expect(canDropIntoNonGroup(nodes, 'surface-1', 'after').valid).toBe(true)
    })
  })

  describe('validateMove', () => {
    it('should validate complex move scenarios', () => {
      const nodes: SceneNode[] = [
        createBaseLayer(solidSurface),
        createGroup('group-1', [
          createSurfaceLayer('surface-1', solidSurface),
        ]),
      ]

      // Cannot move base layer
      expect(validateMove(nodes, 'base', 'group-1', 'into').valid).toBe(false)

      // Can move surface into group
      expect(validateMove(nodes, 'surface-1', 'group-1', 'into').valid).toBe(true)
    })

    it('should return error for non-existent source', () => {
      const nodes: SceneNode[] = [createBaseLayer(solidSurface)]
      const result = validateMove(nodes, 'non-existent', 'base', 'after')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not found')
    })
  })

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
