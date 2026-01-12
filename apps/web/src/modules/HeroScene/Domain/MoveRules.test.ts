import { describe, it, expect } from 'vitest'
import {
  getMaskedNodes,
  findApplicableMask,
  isNodeMasked,
  moveModifier,
} from './MoveRules'
import {
  createBaseLayer,
  createSurfaceLayer,
  createGroup,
  createMaskNode,
  findNode,
  isLayer,
  isGroup,
  type SceneNode,
  type Layer,
} from './LayerNode'
import { createEffectPlaceholder, createMaskModifier } from './Modifier'

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

  describe('moveModifier', () => {
    // Helper to create a layer with specific modifiers
    const createLayerWithModifiers = (id: string, modifierCount: number): Layer => ({
      ...createSurfaceLayer(id, solidSurface),
      modifiers: Array.from({ length: modifierCount }, () => createEffectPlaceholder()),
    })

    describe('same node reordering', () => {
      it('should reorder modifier within same node (move forward)', () => {
        const layer = createLayerWithModifiers('layer-1', 3)
        // Add unique identifiers to track movement
        layer.modifiers = [
          { ...createEffectPlaceholder(), hasEffect: true },
          { ...createMaskModifier(), enabled: true },
          { ...createEffectPlaceholder(), hasEffect: true },
        ]
        const nodes: SceneNode[] = [layer]

        // Move index 0 to position 2
        const result = moveModifier(nodes, '0', 'layer-1', 'layer-1', 2)

        const updatedLayer = findNode(result, 'layer-1')
        expect(isLayer(updatedLayer!)).toBe(true)
        if (isLayer(updatedLayer!)) {
          expect(updatedLayer.modifiers).toHaveLength(3)
          // After moving index 0 to position 2, the mask should be first
          expect(updatedLayer.modifiers[0]?.type).toBe('mask')
        }
      })

      it('should reorder modifier within same node (move backward)', () => {
        const layer = createLayerWithModifiers('layer-1', 3)
        layer.modifiers = [
          { ...createEffectPlaceholder(), hasEffect: true },
          { ...createMaskModifier(), enabled: true },
          { ...createEffectPlaceholder(), hasEffect: true },
        ]
        const nodes: SceneNode[] = [layer]

        // Move index 2 to position 0
        const result = moveModifier(nodes, '2', 'layer-1', 'layer-1', 0)

        const updatedLayer = findNode(result, 'layer-1')
        if (isLayer(updatedLayer!)) {
          expect(updatedLayer.modifiers).toHaveLength(3)
          // Effect should now be first
          expect(updatedLayer.modifiers[0]?.type).toBe('effect')
          expect(updatedLayer.modifiers[1]?.type).toBe('effect')
          expect(updatedLayer.modifiers[2]?.type).toBe('mask')
        }
      })
    })

    describe('move between nodes', () => {
      it('should move Effect to another node modifiers', () => {
        const layer1: Layer = {
          ...createSurfaceLayer('layer-1', solidSurface),
          modifiers: [createEffectPlaceholder(), createEffectPlaceholder()],
        }
        const layer2: Layer = {
          ...createSurfaceLayer('layer-2', solidSurface),
          modifiers: [createEffectPlaceholder()],
        }
        const nodes: SceneNode[] = [layer1, layer2]

        // Move modifier at index 0 from layer-1 to layer-2 at position 1
        const result = moveModifier(nodes, '0', 'layer-1', 'layer-2', 1)

        const updatedLayer1 = findNode(result, 'layer-1')
        const updatedLayer2 = findNode(result, 'layer-2')

        if (isLayer(updatedLayer1!) && isLayer(updatedLayer2!)) {
          expect(updatedLayer1.modifiers).toHaveLength(1)
          expect(updatedLayer2.modifiers).toHaveLength(2)
        }
      })

      it('should move Mask modifier to another node modifiers', () => {
        const layer1: Layer = {
          ...createSurfaceLayer('layer-1', solidSurface),
          modifiers: [createMaskModifier(), createEffectPlaceholder()],
        }
        const layer2: Layer = {
          ...createSurfaceLayer('layer-2', solidSurface),
          modifiers: [createEffectPlaceholder()],
        }
        const nodes: SceneNode[] = [layer1, layer2]

        // Move mask modifier (index 0) from layer-1 to layer-2 at position 0
        const result = moveModifier(nodes, '0', 'layer-1', 'layer-2', 0)

        const updatedLayer1 = findNode(result, 'layer-1')
        const updatedLayer2 = findNode(result, 'layer-2')

        if (isLayer(updatedLayer1!) && isLayer(updatedLayer2!)) {
          expect(updatedLayer1.modifiers).toHaveLength(1)
          expect(updatedLayer1.modifiers[0]?.type).toBe('effect')
          expect(updatedLayer2.modifiers).toHaveLength(2)
          expect(updatedLayer2.modifiers[0]?.type).toBe('mask')
        }
      })
    })

    describe('nested nodes', () => {
      it('should move modifier between nested nodes', () => {
        const layer1: Layer = {
          ...createSurfaceLayer('layer-1', solidSurface),
          modifiers: [createEffectPlaceholder(), createEffectPlaceholder()],
        }
        const layer2: Layer = {
          ...createSurfaceLayer('layer-2', solidSurface),
          modifiers: [],
        }
        const nodes: SceneNode[] = [
          createGroup('group-1', [layer1, layer2]),
        ]

        const result = moveModifier(nodes, '0', 'layer-1', 'layer-2', 0)

        const group = findNode(result, 'group-1')
        if (isGroup(group!)) {
          const updatedLayer1 = group.children.find(c => c.id === 'layer-1')
          const updatedLayer2 = group.children.find(c => c.id === 'layer-2')

          if (isLayer(updatedLayer1!) && isLayer(updatedLayer2!)) {
            expect(updatedLayer1.modifiers).toHaveLength(1)
            expect(updatedLayer2.modifiers).toHaveLength(1)
          }
        }
      })

      it('should move modifier from nested to root level node', () => {
        const nestedLayer: Layer = {
          ...createSurfaceLayer('nested-layer', solidSurface),
          modifiers: [createEffectPlaceholder()],
        }
        const rootLayer: Layer = {
          ...createSurfaceLayer('root-layer', solidSurface),
          modifiers: [],
        }
        const nodes: SceneNode[] = [
          createGroup('group-1', [nestedLayer]),
          rootLayer,
        ]

        const result = moveModifier(nodes, '0', 'nested-layer', 'root-layer', 0)

        const group = findNode(result, 'group-1')
        const updatedRootLayer = findNode(result, 'root-layer')

        if (isGroup(group!) && isLayer(updatedRootLayer!)) {
          const updatedNestedLayer = group.children.find(c => c.id === 'nested-layer')
          if (isLayer(updatedNestedLayer!)) {
            expect(updatedNestedLayer.modifiers).toHaveLength(0)
            expect(updatedRootLayer.modifiers).toHaveLength(1)
          }
        }
      })
    })

    describe('edge cases', () => {
      it('should return original nodes if source node not found', () => {
        const nodes: SceneNode[] = [createSurfaceLayer('layer-1', solidSurface)]

        const result = moveModifier(nodes, '0', 'non-existent', 'layer-1', 0)

        expect(result).toBe(nodes)
      })

      it('should return original nodes if target node not found', () => {
        const layer: Layer = {
          ...createSurfaceLayer('layer-1', solidSurface),
          modifiers: [createEffectPlaceholder()],
        }
        const nodes: SceneNode[] = [layer]

        const result = moveModifier(nodes, '0', 'layer-1', 'non-existent', 0)

        expect(result).toBe(nodes)
      })

      it('should return original nodes if modifier index is invalid', () => {
        const layer: Layer = {
          ...createSurfaceLayer('layer-1', solidSurface),
          modifiers: [createEffectPlaceholder()],
        }
        const nodes: SceneNode[] = [layer]

        const result = moveModifier(nodes, '99', 'layer-1', 'layer-1', 0)

        expect(result).toBe(nodes)
      })

      it('should return original nodes if target is MaskNode (no modifiers)', () => {
        const layer: Layer = {
          ...createSurfaceLayer('layer-1', solidSurface),
          modifiers: [createEffectPlaceholder()],
        }
        const nodes: SceneNode[] = [
          layer,
          createMaskNode('mask-1'),
        ]

        const result = moveModifier(nodes, '0', 'layer-1', 'mask-1', 0)

        expect(result).toBe(nodes)
      })

      it('should clamp position to valid range', () => {
        const layer1: Layer = {
          ...createSurfaceLayer('layer-1', solidSurface),
          modifiers: [createEffectPlaceholder()],
        }
        const layer2: Layer = {
          ...createSurfaceLayer('layer-2', solidSurface),
          modifiers: [],
        }
        const nodes: SceneNode[] = [layer1, layer2]

        // Position 100 should be clamped to end of array
        const result = moveModifier(nodes, '0', 'layer-1', 'layer-2', 100)

        const updatedLayer2 = findNode(result, 'layer-2')
        if (isLayer(updatedLayer2!)) {
          expect(updatedLayer2.modifiers).toHaveLength(1)
        }
      })
    })
  })
})
