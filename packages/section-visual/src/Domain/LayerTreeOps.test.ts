import { describe, it, expect } from 'vitest'
import {
  findLayerInTree,
  updateLayerInTree,
  removeLayerFromTree,
  findParentLayerInTree,
  flattenLayersInTree,
  canMoveLayerInTree,
  moveLayerInTree,
  insertLayerInTree,
  wrapLayerInGroupInTree,
  canMoveModifierInTree,
  moveModifierInTree,
  isGroupLayerConfig,
  isProcessorLayerConfig,
  isSurfaceLayerConfig,
} from './LayerTreeOps'
import type {
  LayerNodeConfig,
  GroupLayerNodeConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
} from './HeroViewConfig'

// Test helpers
const createSurfaceLayer = (id: string, name: string = 'Surface'): SurfaceLayerNodeConfig => ({
  type: 'surface',
  id,
  name,
  visible: true,
  surface: { id: 'solid', params: {} },
})

const createGroupLayer = (id: string, children: LayerNodeConfig[], name: string = 'Group'): GroupLayerNodeConfig => ({
  type: 'group',
  id,
  name,
  visible: true,
  children,
})

const createProcessorLayer = (id: string, name: string = 'Processor'): ProcessorNodeConfig => ({
  type: 'processor',
  id,
  name,
  visible: true,
  modifiers: [
    { type: 'effect', id: 'blur', params: { radius: 8 } },
    { type: 'mask', enabled: true, shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.4, cutout: false }, feather: 0 },
  ],
})

describe('LayerTreeOps', () => {
  describe('findLayerInTree', () => {
    it('finds a layer at the root level', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      const found = findLayerInTree(layers, 'layer-1')
      expect(found).toBeDefined()
      expect(found?.id).toBe('layer-1')
    })

    it('finds a layer nested in a group', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('nested-layer'),
        ]),
      ]

      const found = findLayerInTree(layers, 'nested-layer')
      expect(found).toBeDefined()
      expect(found?.id).toBe('nested-layer')
    })

    it('finds a layer deeply nested', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createGroupLayer('group-2', [
            createSurfaceLayer('deep-layer'),
          ]),
        ]),
      ]

      const found = findLayerInTree(layers, 'deep-layer')
      expect(found).toBeDefined()
      expect(found?.id).toBe('deep-layer')
    })

    it('returns undefined for non-existent layer', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      const found = findLayerInTree(layers, 'non-existent')
      expect(found).toBeUndefined()
    })

    it('returns undefined for empty tree', () => {
      const found = findLayerInTree([], 'any-id')
      expect(found).toBeUndefined()
    })
  })

  describe('updateLayerInTree', () => {
    it('updates a layer at the root level', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1', 'Original'),
      ]

      const updated = updateLayerInTree(layers, 'layer-1', { name: 'Updated' })

      expect(updated[0].name).toBe('Updated')
      expect(updated).not.toBe(layers) // Immutable
    })

    it('updates a nested layer', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('nested-layer', 'Original'),
        ]),
      ]

      const updated = updateLayerInTree(layers, 'nested-layer', { name: 'Updated' })
      const group = updated[0] as GroupLayerNodeConfig

      expect(group.children[0].name).toBe('Updated')
    })

    it('updates visibility', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      const updated = updateLayerInTree(layers, 'layer-1', { visible: false })

      expect(updated[0].visible).toBe(false)
    })

    it('preserves other layers unchanged', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1', 'Layer 1'),
        createSurfaceLayer('layer-2', 'Layer 2'),
      ]

      const updated = updateLayerInTree(layers, 'layer-1', { name: 'Updated' })

      expect(updated[0].name).toBe('Updated')
      expect(updated[1].name).toBe('Layer 2')
    })

    it('returns unchanged array if layer not found', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      const updated = updateLayerInTree(layers, 'non-existent', { name: 'Updated' })

      expect(updated[0].name).toBe('Surface')
    })
  })

  describe('removeLayerFromTree', () => {
    it('removes a layer at the root level', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      const updated = removeLayerFromTree(layers, 'layer-1')

      expect(updated).toHaveLength(1)
      expect(updated[0].id).toBe('layer-2')
    })

    it('removes a nested layer', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('nested-1'),
          createSurfaceLayer('nested-2'),
        ]),
      ]

      const updated = removeLayerFromTree(layers, 'nested-1')
      const group = updated[0] as GroupLayerNodeConfig

      expect(group.children).toHaveLength(1)
      expect(group.children[0].id).toBe('nested-2')
    })

    it('removes a deeply nested layer', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createGroupLayer('group-2', [
            createSurfaceLayer('deep-layer'),
          ]),
        ]),
      ]

      const updated = removeLayerFromTree(layers, 'deep-layer')
      const outerGroup = updated[0] as GroupLayerNodeConfig
      const innerGroup = outerGroup.children[0] as GroupLayerNodeConfig

      expect(innerGroup.children).toHaveLength(0)
    })

    it('preserves other layers', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
        createSurfaceLayer('layer-3'),
      ]

      const updated = removeLayerFromTree(layers, 'layer-2')

      expect(updated).toHaveLength(2)
      expect(updated[0].id).toBe('layer-1')
      expect(updated[1].id).toBe('layer-3')
    })

    it('returns unchanged array if layer not found', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      const updated = removeLayerFromTree(layers, 'non-existent')

      expect(updated).toHaveLength(1)
    })

    it('is immutable', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      const updated = removeLayerFromTree(layers, 'layer-1')

      expect(updated).not.toBe(layers)
      expect(layers).toHaveLength(2)
    })
  })

  describe('Type Guards', () => {
    it('isGroupLayerConfig correctly identifies groups', () => {
      const group = createGroupLayer('group-1', [])
      const surface = createSurfaceLayer('surface-1')
      const processor = createProcessorLayer('processor-1')

      expect(isGroupLayerConfig(group)).toBe(true)
      expect(isGroupLayerConfig(surface)).toBe(false)
      expect(isGroupLayerConfig(processor)).toBe(false)
    })

    it('isProcessorLayerConfig correctly identifies processors', () => {
      const processor = createProcessorLayer('processor-1')
      const surface = createSurfaceLayer('surface-1')
      const group = createGroupLayer('group-1', [])

      expect(isProcessorLayerConfig(processor)).toBe(true)
      expect(isProcessorLayerConfig(surface)).toBe(false)
      expect(isProcessorLayerConfig(group)).toBe(false)
    })

    it('isSurfaceLayerConfig correctly identifies surface layers', () => {
      const surface = createSurfaceLayer('surface-1')
      const group = createGroupLayer('group-1', [])
      const processor = createProcessorLayer('processor-1')

      expect(isSurfaceLayerConfig(surface)).toBe(true)
      expect(isSurfaceLayerConfig(group)).toBe(false)
      expect(isSurfaceLayerConfig(processor)).toBe(false)
    })
  })

  describe('findParentLayerInTree', () => {
    it('returns null for root level layer', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      const parent = findParentLayerInTree(layers, 'layer-1')
      expect(parent).toBeNull()
    })

    it('finds parent of nested layer', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('nested-layer'),
        ]),
      ]

      const parent = findParentLayerInTree(layers, 'nested-layer')
      expect(parent).toBeDefined()
      expect(parent?.id).toBe('group-1')
    })

    it('finds parent of deeply nested layer', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createGroupLayer('group-2', [
            createSurfaceLayer('deep-layer'),
          ]),
        ]),
      ]

      const parent = findParentLayerInTree(layers, 'deep-layer')
      expect(parent).toBeDefined()
      expect(parent?.id).toBe('group-2')
    })

    it('returns undefined for non-existent layer', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      const parent = findParentLayerInTree(layers, 'non-existent')
      expect(parent).toBeUndefined()
    })
  })

  describe('flattenLayersInTree', () => {
    it('flattens root level layers', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      const flat = flattenLayersInTree(layers)
      expect(flat).toHaveLength(2)
      expect(flat[0].id).toBe('layer-1')
      expect(flat[1].id).toBe('layer-2')
    })

    it('flattens nested layers (depth-first)', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('nested-1'),
          createSurfaceLayer('nested-2'),
        ]),
        createSurfaceLayer('layer-2'),
      ]

      const flat = flattenLayersInTree(layers)
      expect(flat).toHaveLength(4)
      expect(flat[0].id).toBe('group-1')
      expect(flat[1].id).toBe('nested-1')
      expect(flat[2].id).toBe('nested-2')
      expect(flat[3].id).toBe('layer-2')
    })

    it('handles deeply nested groups', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createGroupLayer('group-2', [
            createSurfaceLayer('deep-layer'),
          ]),
        ]),
      ]

      const flat = flattenLayersInTree(layers)
      expect(flat).toHaveLength(3)
      expect(flat.map(l => l.id)).toEqual(['group-1', 'group-2', 'deep-layer'])
    })

    it('returns empty array for empty tree', () => {
      const flat = flattenLayersInTree([])
      expect(flat).toHaveLength(0)
    })
  })

  describe('canMoveLayerInTree', () => {
    it('allows moving layer before another', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      expect(canMoveLayerInTree(layers, 'layer-2', { type: 'before', targetId: 'layer-1' })).toBe(true)
    })

    it('allows moving layer after another', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      expect(canMoveLayerInTree(layers, 'layer-1', { type: 'after', targetId: 'layer-2' })).toBe(true)
    })

    it('allows moving layer into a group', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', []),
        createSurfaceLayer('layer-1'),
      ]

      expect(canMoveLayerInTree(layers, 'layer-1', { type: 'into', targetId: 'group-1' })).toBe(true)
    })

    it('disallows moving layer to itself', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      expect(canMoveLayerInTree(layers, 'layer-1', { type: 'before', targetId: 'layer-1' })).toBe(false)
    })

    it('disallows moving into non-group', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      expect(canMoveLayerInTree(layers, 'layer-1', { type: 'into', targetId: 'layer-2' })).toBe(false)
    })

    it('disallows moving group into its own descendant', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createGroupLayer('group-2', [
            createSurfaceLayer('deep-layer'),
          ]),
        ]),
      ]

      expect(canMoveLayerInTree(layers, 'group-1', { type: 'into', targetId: 'group-2' })).toBe(false)
    })

    it('returns false for non-existent source', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      expect(canMoveLayerInTree(layers, 'non-existent', { type: 'before', targetId: 'layer-1' })).toBe(false)
    })

    it('returns false for non-existent target', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      expect(canMoveLayerInTree(layers, 'layer-1', { type: 'before', targetId: 'non-existent' })).toBe(false)
    })
  })

  describe('moveLayerInTree', () => {
    it('moves layer before another at same level', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
        createSurfaceLayer('layer-3'),
      ]

      const moved = moveLayerInTree(layers, 'layer-3', { type: 'before', targetId: 'layer-1' })

      expect(moved).toHaveLength(3)
      expect(moved[0].id).toBe('layer-3')
      expect(moved[1].id).toBe('layer-1')
      expect(moved[2].id).toBe('layer-2')
    })

    it('moves layer after another at same level', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
        createSurfaceLayer('layer-3'),
      ]

      const moved = moveLayerInTree(layers, 'layer-1', { type: 'after', targetId: 'layer-3' })

      expect(moved).toHaveLength(3)
      expect(moved[0].id).toBe('layer-2')
      expect(moved[1].id).toBe('layer-3')
      expect(moved[2].id).toBe('layer-1')
    })

    it('moves layer into a group', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('existing'),
        ]),
        createSurfaceLayer('layer-1'),
      ]

      const moved = moveLayerInTree(layers, 'layer-1', { type: 'into', targetId: 'group-1' })

      expect(moved).toHaveLength(1)
      const group = moved[0] as GroupLayerNodeConfig
      expect(group.children).toHaveLength(2)
      expect(group.children[0].id).toBe('existing')
      expect(group.children[1].id).toBe('layer-1')
    })

    it('moves layer out of a group', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('nested'),
        ]),
        createSurfaceLayer('target'),
      ]

      const moved = moveLayerInTree(layers, 'nested', { type: 'after', targetId: 'target' })

      expect(moved).toHaveLength(3)
      expect(moved[2].id).toBe('nested')
      const group = moved[0] as GroupLayerNodeConfig
      expect(group.children).toHaveLength(0)
    })

    it('returns original tree for invalid move', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      const moved = moveLayerInTree(layers, 'layer-1', { type: 'before', targetId: 'layer-1' })

      expect(moved).toBe(layers)
    })

    it('is immutable', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      const moved = moveLayerInTree(layers, 'layer-2', { type: 'before', targetId: 'layer-1' })

      expect(moved).not.toBe(layers)
      expect(layers[0].id).toBe('layer-1')
      expect(layers[1].id).toBe('layer-2')
    })
  })

  describe('insertLayerInTree', () => {
    it('inserts layer before target', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]
      const newLayer = createSurfaceLayer('new-layer')

      const updated = insertLayerInTree(layers, newLayer, { type: 'before', targetId: 'layer-2' })

      expect(updated).toHaveLength(3)
      expect(updated[0].id).toBe('layer-1')
      expect(updated[1].id).toBe('new-layer')
      expect(updated[2].id).toBe('layer-2')
    })

    it('inserts layer after target', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]
      const newLayer = createSurfaceLayer('new-layer')

      const updated = insertLayerInTree(layers, newLayer, { type: 'after', targetId: 'layer-1' })

      expect(updated).toHaveLength(3)
      expect(updated[0].id).toBe('layer-1')
      expect(updated[1].id).toBe('new-layer')
      expect(updated[2].id).toBe('layer-2')
    })

    it('inserts layer into group', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('existing'),
        ]),
      ]
      const newLayer = createSurfaceLayer('new-layer')

      const updated = insertLayerInTree(layers, newLayer, { type: 'into', targetId: 'group-1' })

      const group = updated[0] as GroupLayerNodeConfig
      expect(group.children).toHaveLength(2)
      expect(group.children[1].id).toBe('new-layer')
    })

    it('inserts into nested group', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createGroupLayer('group-2', []),
        ]),
      ]
      const newLayer = createSurfaceLayer('new-layer')

      const updated = insertLayerInTree(layers, newLayer, { type: 'into', targetId: 'group-2' })

      const outerGroup = updated[0] as GroupLayerNodeConfig
      const innerGroup = outerGroup.children[0] as GroupLayerNodeConfig
      expect(innerGroup.children).toHaveLength(1)
      expect(innerGroup.children[0].id).toBe('new-layer')
    })
  })

  describe('wrapLayerInGroupInTree', () => {
    it('wraps a root level layer in a group', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
        createSurfaceLayer('layer-2'),
      ]

      const wrapped = wrapLayerInGroupInTree(layers, 'layer-1', 'new-group')

      expect(wrapped).toHaveLength(2)
      expect(isGroupLayerConfig(wrapped[0])).toBe(true)
      const group = wrapped[0] as GroupLayerNodeConfig
      expect(group.id).toBe('new-group')
      expect(group.children).toHaveLength(1)
      expect(group.children[0].id).toBe('layer-1')
    })

    it('wraps a nested layer in a group', () => {
      const layers: LayerNodeConfig[] = [
        createGroupLayer('group-1', [
          createSurfaceLayer('nested-1'),
          createSurfaceLayer('nested-2'),
        ]),
      ]

      const wrapped = wrapLayerInGroupInTree(layers, 'nested-1', 'new-group')

      const outerGroup = wrapped[0] as GroupLayerNodeConfig
      expect(outerGroup.children).toHaveLength(2)
      expect(isGroupLayerConfig(outerGroup.children[0])).toBe(true)
      const newGroup = outerGroup.children[0] as GroupLayerNodeConfig
      expect(newGroup.id).toBe('new-group')
      expect(newGroup.children).toHaveLength(1)
      expect(newGroup.children[0].id).toBe('nested-1')
    })

    it('returns original tree if target not found', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      const wrapped = wrapLayerInGroupInTree(layers, 'non-existent', 'new-group')

      expect(wrapped).toBe(layers)
    })

    it('generates group ID if not provided', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('layer-1'),
      ]

      const wrapped = wrapLayerInGroupInTree(layers, 'layer-1')

      expect(isGroupLayerConfig(wrapped[0])).toBe(true)
      const group = wrapped[0] as GroupLayerNodeConfig
      expect(group.id).toMatch(/^group-\d+$/)
    })
  })

  describe('canMoveModifierInTree', () => {
    it('allows reordering modifiers within same processor', () => {
      const layers: LayerNodeConfig[] = [
        createProcessorLayer('processor-1'),
      ]

      // Move modifier from index 1 to before index 0 (swap positions)
      expect(canMoveModifierInTree(layers, 'processor-1', 1, { type: 'before', targetNodeId: 'processor-1', targetIndex: 0 })).toBe(true)
    })

    it('allows moving modifier between processors', () => {
      const processor1 = createProcessorLayer('processor-1')
      const processor2 = createProcessorLayer('processor-2')
      const layers: LayerNodeConfig[] = [processor1, processor2]

      expect(canMoveModifierInTree(layers, 'processor-1', 0, { type: 'before', targetNodeId: 'processor-2', targetIndex: 0 })).toBe(true)
    })

    it('disallows moving to same position', () => {
      const layers: LayerNodeConfig[] = [
        createProcessorLayer('processor-1'),
      ]

      // Moving index 0 to before index 0 is a no-op
      expect(canMoveModifierInTree(layers, 'processor-1', 0, { type: 'before', targetNodeId: 'processor-1', targetIndex: 0 })).toBe(false)
      // Moving index 0 to after index 0 is also a no-op
      expect(canMoveModifierInTree(layers, 'processor-1', 0, { type: 'after', targetNodeId: 'processor-1', targetIndex: 0 })).toBe(false)
    })

    it('disallows moving from non-processor layer', () => {
      const layers: LayerNodeConfig[] = [
        createSurfaceLayer('surface-1'),
        createProcessorLayer('processor-1'),
      ]

      expect(canMoveModifierInTree(layers, 'surface-1', 0, { type: 'before', targetNodeId: 'processor-1', targetIndex: 0 })).toBe(false)
    })

    it('disallows moving to non-processor layer', () => {
      const layers: LayerNodeConfig[] = [
        createProcessorLayer('processor-1'),
        createSurfaceLayer('surface-1'),
      ]

      expect(canMoveModifierInTree(layers, 'processor-1', 0, { type: 'before', targetNodeId: 'surface-1', targetIndex: 0 })).toBe(false)
    })

    it('disallows invalid source index', () => {
      const layers: LayerNodeConfig[] = [
        createProcessorLayer('processor-1'),
      ]

      expect(canMoveModifierInTree(layers, 'processor-1', 10, { type: 'before', targetNodeId: 'processor-1', targetIndex: 0 })).toBe(false)
      expect(canMoveModifierInTree(layers, 'processor-1', -1, { type: 'before', targetNodeId: 'processor-1', targetIndex: 0 })).toBe(false)
    })

    it('disallows invalid target index', () => {
      const layers: LayerNodeConfig[] = [
        createProcessorLayer('processor-1'),
      ]

      expect(canMoveModifierInTree(layers, 'processor-1', 0, { type: 'before', targetNodeId: 'processor-1', targetIndex: 10 })).toBe(false)
      expect(canMoveModifierInTree(layers, 'processor-1', 0, { type: 'before', targetNodeId: 'processor-1', targetIndex: -1 })).toBe(false)
    })
  })

  describe('moveModifierInTree', () => {
    it('reorders modifiers within same processor', () => {
      const layers: LayerNodeConfig[] = [
        createProcessorLayer('processor-1'),
      ]

      // Move modifier from index 1 to before index 0
      const moved = moveModifierInTree(layers, 'processor-1', 1, { type: 'before', targetNodeId: 'processor-1', targetIndex: 0 })

      const processor = moved[0] as ProcessorNodeConfig
      expect(processor.modifiers).toHaveLength(2)
      expect(processor.modifiers[0].type).toBe('mask')
      expect(processor.modifiers[1].type).toBe('effect')
    })

    it('moves modifier between processors', () => {
      const processor1 = createProcessorLayer('processor-1')
      const processor2: ProcessorNodeConfig = {
        ...createProcessorLayer('processor-2'),
        modifiers: [], // Start with empty modifiers
      }
      const layers: LayerNodeConfig[] = [processor1, processor2]

      const moved = moveModifierInTree(layers, 'processor-1', 0, { type: 'before', targetNodeId: 'processor-2', targetIndex: 0 })

      const p1 = moved[0] as ProcessorNodeConfig
      const p2 = moved[1] as ProcessorNodeConfig
      expect(p1.modifiers).toHaveLength(1)
      expect(p2.modifiers).toHaveLength(1)
      expect(p2.modifiers[0].type).toBe('effect')
    })

    it('returns original tree for invalid move', () => {
      const layers: LayerNodeConfig[] = [
        createProcessorLayer('processor-1'),
      ]

      const moved = moveModifierInTree(layers, 'processor-1', 0, { type: 'before', targetNodeId: 'processor-1', targetIndex: 0 })

      expect(moved).toBe(layers)
    })

    it('is immutable', () => {
      const layers: LayerNodeConfig[] = [
        createProcessorLayer('processor-1'),
      ]

      const moved = moveModifierInTree(layers, 'processor-1', 1, { type: 'before', targetNodeId: 'processor-1', targetIndex: 0 })

      expect(moved).not.toBe(layers)
      const originalProcessor = layers[0] as ProcessorNodeConfig
      expect(originalProcessor.modifiers[0].type).toBe('effect')
    })
  })
})
