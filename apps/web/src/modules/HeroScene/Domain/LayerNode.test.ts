import { describe, expect, it } from 'vitest'
import {
  canMoveSceneNode,
  canMoveModifier,
  moveModifier,
  createGroup,
  createLayer,
  type Group,
  type Layer,
  moveSceneNode,
  type SceneNode,
  type ModifierDropPosition,
} from './LayerNode'
import { createEffectPlaceholder, createMaskModifier } from './Modifier'

// Helper to create test layers
const createTestLayer = (id: string): SceneNode =>
  createLayer(id, 'surface', [], { name: `Layer ${id}` })

// Helper to create test layers with modifiers
const createTestLayerWithModifiers = (id: string, modifierCount: number): Layer => {
  const modifiers = []
  for (let i = 0; i < modifierCount; i++) {
    modifiers.push(i % 2 === 0 ? createEffectPlaceholder() : createMaskModifier())
  }
  return createLayer(id, 'surface', [], { name: `Layer ${id}`, modifiers })
}

describe('canMoveSceneNode', () => {
  describe('basic validation', () => {
    it('returns false when source node does not exist', () => {
      const nodes: SceneNode[] = [createTestLayer('a')]
      const result = canMoveSceneNode(nodes, 'nonexistent', { type: 'before', targetId: 'a' })
      expect(result).toBe(false)
    })

    it('returns false when target node does not exist', () => {
      const nodes: SceneNode[] = [createTestLayer('a')]
      const result = canMoveSceneNode(nodes, 'a', { type: 'before', targetId: 'nonexistent' })
      expect(result).toBe(false)
    })

    it('returns false when moving node to itself', () => {
      const nodes: SceneNode[] = [createTestLayer('a')]
      const result = canMoveSceneNode(nodes, 'a', { type: 'before', targetId: 'a' })
      expect(result).toBe(false)
    })
  })

  describe('into position validation', () => {
    it('returns false when trying to move into a layer (not a group)', () => {
      const nodes: SceneNode[] = [createTestLayer('a'), createTestLayer('b')]
      const result = canMoveSceneNode(nodes, 'a', { type: 'into', targetId: 'b' })
      expect(result).toBe(false)
    })

    it('returns true when moving into a group', () => {
      const nodes: SceneNode[] = [
        createTestLayer('a'),
        createGroup('g1', [createTestLayer('b')]),
      ]
      const result = canMoveSceneNode(nodes, 'a', { type: 'into', targetId: 'g1' })
      expect(result).toBe(true)
    })
  })

  describe('circular reference check', () => {
    it('returns false when moving a group into its own child', () => {
      const childLayer = createTestLayer('child')
      const parentGroup = createGroup('parent', [childLayer])
      const nodes: SceneNode[] = [parentGroup]

      const result = canMoveSceneNode(nodes, 'parent', { type: 'into', targetId: 'child' })
      expect(result).toBe(false)
    })

    it('returns false when moving a group into its nested descendant', () => {
      const deepChild = createTestLayer('deep')
      const innerGroup = createGroup('inner', [deepChild])
      const outerGroup = createGroup('outer', [innerGroup])
      const nodes: SceneNode[] = [outerGroup]

      // Try to move outer group into inner group (its child)
      expect(canMoveSceneNode(nodes, 'outer', { type: 'into', targetId: 'inner' })).toBe(false)
      // Try to move outer group before deep child (inside its descendant)
      expect(canMoveSceneNode(nodes, 'outer', { type: 'before', targetId: 'deep' })).toBe(false)
    })

    it('allows moving a group into a sibling group', () => {
      const group1 = createGroup('g1', [createTestLayer('a')])
      const group2 = createGroup('g2', [createTestLayer('b')])
      const nodes: SceneNode[] = [group1, group2]

      const result = canMoveSceneNode(nodes, 'g1', { type: 'into', targetId: 'g2' })
      expect(result).toBe(true)
    })
  })

  describe('valid moves', () => {
    it('allows moving layer to scene root (before)', () => {
      const group = createGroup('g1', [createTestLayer('a')])
      const nodes: SceneNode[] = [createTestLayer('b'), group]

      const result = canMoveSceneNode(nodes, 'a', { type: 'before', targetId: 'b' })
      expect(result).toBe(true)
    })

    it('allows moving layer to scene root (after)', () => {
      const group = createGroup('g1', [createTestLayer('a')])
      const nodes: SceneNode[] = [createTestLayer('b'), group]

      const result = canMoveSceneNode(nodes, 'a', { type: 'after', targetId: 'b' })
      expect(result).toBe(true)
    })

    it('allows moving layer into group', () => {
      const nodes: SceneNode[] = [
        createTestLayer('a'),
        createGroup('g1', [createTestLayer('b')]),
      ]

      const result = canMoveSceneNode(nodes, 'a', { type: 'into', targetId: 'g1' })
      expect(result).toBe(true)
    })

    it('allows moving group to scene root', () => {
      const innerGroup = createGroup('inner', [createTestLayer('a')])
      const outerGroup = createGroup('outer', [innerGroup])
      const nodes: SceneNode[] = [createTestLayer('b'), outerGroup]

      const result = canMoveSceneNode(nodes, 'inner', { type: 'before', targetId: 'b' })
      expect(result).toBe(true)
    })
  })
})

describe('moveSceneNode', () => {
  describe('invalid moves', () => {
    it('returns original nodes when move is invalid', () => {
      const nodes: SceneNode[] = [createTestLayer('a')]
      const result = moveSceneNode(nodes, 'a', { type: 'before', targetId: 'a' })
      expect(result).toBe(nodes)
    })

    it('returns original nodes when source does not exist', () => {
      const nodes: SceneNode[] = [createTestLayer('a')]
      const result = moveSceneNode(nodes, 'nonexistent', { type: 'before', targetId: 'a' })
      expect(result).toBe(nodes)
    })
  })

  describe('move at root level', () => {
    it('moves node before target at root level', () => {
      const nodes: SceneNode[] = [
        createTestLayer('a'),
        createTestLayer('b'),
        createTestLayer('c'),
      ]

      const result = moveSceneNode(nodes, 'c', { type: 'before', targetId: 'a' })

      expect(result.map(n => n.id)).toEqual(['c', 'a', 'b'])
    })

    it('moves node after target at root level', () => {
      const nodes: SceneNode[] = [
        createTestLayer('a'),
        createTestLayer('b'),
        createTestLayer('c'),
      ]

      const result = moveSceneNode(nodes, 'a', { type: 'after', targetId: 'c' })

      expect(result.map(n => n.id)).toEqual(['b', 'c', 'a'])
    })
  })

  describe('move into group', () => {
    it('moves layer into group as last child', () => {
      const nodes: SceneNode[] = [
        createTestLayer('a'),
        createGroup('g1', [createTestLayer('b')]),
      ]

      const result = moveSceneNode(nodes, 'a', { type: 'into', targetId: 'g1' })

      expect(result.length).toBe(1)
      const group = result[0] as Group
      expect(group.id).toBe('g1')
      expect(group.children.map(c => c.id)).toEqual(['b', 'a'])
    })

    it('moves layer into nested group', () => {
      const innerGroup = createGroup('inner', [createTestLayer('b')])
      const outerGroup = createGroup('outer', [innerGroup])
      const nodes: SceneNode[] = [createTestLayer('a'), outerGroup]

      const result = moveSceneNode(nodes, 'a', { type: 'into', targetId: 'inner' })

      expect(result.length).toBe(1)
      const outer = result[0] as Group
      expect(outer.id).toBe('outer')
      const inner = outer.children[0] as Group
      expect(inner.children.map(c => c.id)).toEqual(['b', 'a'])
    })
  })

  describe('move out of group', () => {
    it('moves layer from group to root level', () => {
      const nodes: SceneNode[] = [
        createTestLayer('a'),
        createGroup('g1', [createTestLayer('b'), createTestLayer('c')]),
      ]

      const result = moveSceneNode(nodes, 'b', { type: 'before', targetId: 'a' })

      expect(result.map(n => n.id)).toEqual(['b', 'a', 'g1'])
      const group = result[2] as Group
      expect(group.children.map(c => c.id)).toEqual(['c'])
    })
  })

  describe('move between groups', () => {
    it('moves layer from one group to another', () => {
      const nodes: SceneNode[] = [
        createGroup('g1', [createTestLayer('a')]),
        createGroup('g2', [createTestLayer('b')]),
      ]

      const result = moveSceneNode(nodes, 'a', { type: 'into', targetId: 'g2' })

      const g1 = result[0] as Group
      const g2 = result[1] as Group
      expect(g1.children).toEqual([])
      expect(g2.children.map(c => c.id)).toEqual(['b', 'a'])
    })
  })

  describe('move group', () => {
    it('moves group to root level', () => {
      const innerGroup = createGroup('inner', [createTestLayer('a')])
      const outerGroup = createGroup('outer', [innerGroup, createTestLayer('b')])
      const nodes: SceneNode[] = [createTestLayer('c'), outerGroup]

      const result = moveSceneNode(nodes, 'inner', { type: 'before', targetId: 'c' })

      expect(result.map(n => n.id)).toEqual(['inner', 'c', 'outer'])
      const outer = result[2] as Group
      expect(outer.children.map(c => c.id)).toEqual(['b'])
    })

    it('moves group into another group', () => {
      const nodes: SceneNode[] = [
        createGroup('g1', [createTestLayer('a')]),
        createGroup('g2', [createTestLayer('b')]),
      ]

      const result = moveSceneNode(nodes, 'g1', { type: 'into', targetId: 'g2' })

      expect(result.length).toBe(1)
      const g2 = result[0] as Group
      expect(g2.id).toBe('g2')
      expect(g2.children.map(c => c.id)).toEqual(['b', 'g1'])
    })
  })

  describe('before/after within group', () => {
    it('reorders nodes within a group using before', () => {
      const group = createGroup('g1', [
        createTestLayer('a'),
        createTestLayer('b'),
        createTestLayer('c'),
      ])
      const nodes: SceneNode[] = [group]

      const result = moveSceneNode(nodes, 'c', { type: 'before', targetId: 'a' })

      const g1 = result[0] as Group
      expect(g1.children.map(c => c.id)).toEqual(['c', 'a', 'b'])
    })

    it('reorders nodes within a group using after', () => {
      const group = createGroup('g1', [
        createTestLayer('a'),
        createTestLayer('b'),
        createTestLayer('c'),
      ])
      const nodes: SceneNode[] = [group]

      const result = moveSceneNode(nodes, 'a', { type: 'after', targetId: 'c' })

      const g1 = result[0] as Group
      expect(g1.children.map(c => c.id)).toEqual(['b', 'c', 'a'])
    })
  })

  describe('immutability', () => {
    it('returns a new array, not mutating the original', () => {
      const nodes: SceneNode[] = [
        createTestLayer('a'),
        createTestLayer('b'),
      ]

      const result = moveSceneNode(nodes, 'b', { type: 'before', targetId: 'a' })

      expect(result).not.toBe(nodes)
      expect(nodes.map(n => n.id)).toEqual(['a', 'b'])
    })

    it('creates new group objects when modifying children', () => {
      const group = createGroup('g1', [createTestLayer('a'), createTestLayer('b')])
      const nodes: SceneNode[] = [createTestLayer('c'), group]

      const result = moveSceneNode(nodes, 'c', { type: 'into', targetId: 'g1' })

      expect(result[0]).not.toBe(group)
    })
  })
})

// ============================================================
// Modifier Move Tests
// ============================================================

describe('canMoveModifier', () => {
  describe('basic validation', () => {
    it('returns false when source node does not exist', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 2)]
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 0 }
      const result = canMoveModifier(nodes, 'nonexistent', 0, position)
      expect(result).toBe(false)
    })

    it('returns false when target node does not exist', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 2)]
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'nonexistent', targetIndex: 0 }
      const result = canMoveModifier(nodes, 'a', 0, position)
      expect(result).toBe(false)
    })

    it('returns false when source modifier index is out of bounds (negative)', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 2)]
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 0 }
      const result = canMoveModifier(nodes, 'a', -1, position)
      expect(result).toBe(false)
    })

    it('returns false when source modifier index is out of bounds (too high)', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 2)]
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 0 }
      const result = canMoveModifier(nodes, 'a', 5, position)
      expect(result).toBe(false)
    })

    it('returns false when target index is out of bounds', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 2)]
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 10 }
      const result = canMoveModifier(nodes, 'a', 0, position)
      expect(result).toBe(false)
    })
  })

  describe('same node no-op detection', () => {
    it('returns false when moving to same position (before itself)', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 3)]
      // Moving index 1 before index 1 is a no-op
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 1 }
      const result = canMoveModifier(nodes, 'a', 1, position)
      expect(result).toBe(false)
    })

    it('returns false when moving to immediately after itself', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 3)]
      // Moving index 1 after index 1 is a no-op
      const position: ModifierDropPosition = { type: 'after', targetNodeId: 'a', targetIndex: 1 }
      const result = canMoveModifier(nodes, 'a', 1, position)
      expect(result).toBe(false)
    })

    it('returns true when moving first element to after last (index 0 after index 2)', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 3)]
      // Moving index 0 after index 2 should be valid
      const position: ModifierDropPosition = { type: 'after', targetNodeId: 'a', targetIndex: 2 }
      const result = canMoveModifier(nodes, 'a', 0, position)
      expect(result).toBe(true)
    })

    it('returns true when moving last element to before first (index 2 before index 0)', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 3)]
      // Moving index 2 before index 0 should be valid
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 0 }
      const result = canMoveModifier(nodes, 'a', 2, position)
      expect(result).toBe(true)
    })
  })

  describe('cross-node moves', () => {
    it('returns true when moving modifier to different node', () => {
      const nodes: SceneNode[] = [
        createTestLayerWithModifiers('a', 2),
        createTestLayerWithModifiers('b', 1),
      ]
      const position: ModifierDropPosition = { type: 'after', targetNodeId: 'b', targetIndex: 0 }
      const result = canMoveModifier(nodes, 'a', 0, position)
      expect(result).toBe(true)
    })
  })
})

describe('moveModifier', () => {
  describe('invalid moves', () => {
    it('returns original nodes when move is invalid (no-op)', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 2)]
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 1 }
      // Moving index 1 before index 1 is no-op
      const result = moveModifier(nodes, 'a', 1, position)
      expect(result).toBe(nodes)
    })

    it('returns original nodes when source does not exist', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 2)]
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 0 }
      const result = moveModifier(nodes, 'nonexistent', 0, position)
      expect(result).toBe(nodes)
    })
  })

  describe('same node reorder', () => {
    it('verifies test helper creates correct modifiers', () => {
      const layer = createTestLayerWithModifiers('test', 3)
      // Verify: i=0 → effect, i=1 → mask, i=2 → effect
      expect(layer.modifiers[0].type).toBe('effect')
      expect(layer.modifiers[1].type).toBe('mask')
      expect(layer.modifiers[2].type).toBe('effect')
    })

    it('moves modifier before target in same node', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 3)]
      // Original: [effect(0), mask(1), effect(2)]
      // Move index 2 before index 0
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'a', targetIndex: 0 }
      const result = moveModifier(nodes, 'a', 2, position)

      // Should return a new array
      expect(result).not.toBe(nodes)

      const layer = result[0] as Layer
      expect(layer.modifiers.length).toBe(3)
      // After moving index 2 before index 0:
      // [effect(2), effect(0), mask(1)]
      expect(layer.modifiers[0].type).toBe('effect')
      expect(layer.modifiers[1].type).toBe('effect')
      expect(layer.modifiers[2].type).toBe('mask')
    })

    it('moves modifier after target in same node', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 3)]
      // Original: [effect(0), mask(1), effect(2)]
      // Move index 0 after index 2
      const position: ModifierDropPosition = { type: 'after', targetNodeId: 'a', targetIndex: 2 }
      const result = moveModifier(nodes, 'a', 0, position)

      // Should return a new array
      expect(result).not.toBe(nodes)

      const layer = result[0] as Layer
      expect(layer.modifiers.length).toBe(3)
      // After moving index 0 after index 2:
      // [mask(1), effect(2), effect(0)]
      expect(layer.modifiers[0].type).toBe('mask')
      expect(layer.modifiers[1].type).toBe('effect')
      expect(layer.modifiers[2].type).toBe('effect')
    })
  })

  describe('cross-node move', () => {
    it('moves modifier from one node to another', () => {
      const nodes: SceneNode[] = [
        createTestLayerWithModifiers('a', 2),
        createTestLayerWithModifiers('b', 1),
      ]
      // Move modifier 0 from node 'a' to after modifier 0 in node 'b'
      const position: ModifierDropPosition = { type: 'after', targetNodeId: 'b', targetIndex: 0 }
      const result = moveModifier(nodes, 'a', 0, position)

      const layerA = result[0] as Layer
      const layerB = result[1] as Layer

      expect(layerA.modifiers.length).toBe(1)
      expect(layerB.modifiers.length).toBe(2)
      // The moved modifier (effect) should be at index 1 in node b
      expect(layerB.modifiers[1].type).toBe('effect')
    })

    it('moves modifier to beginning of another node', () => {
      const nodes: SceneNode[] = [
        createTestLayerWithModifiers('a', 1),
        createTestLayerWithModifiers('b', 2),
      ]
      // Move modifier 0 from node 'a' before modifier 0 in node 'b'
      const position: ModifierDropPosition = { type: 'before', targetNodeId: 'b', targetIndex: 0 }
      const result = moveModifier(nodes, 'a', 0, position)

      const layerA = result[0] as Layer
      const layerB = result[1] as Layer

      expect(layerA.modifiers.length).toBe(0)
      expect(layerB.modifiers.length).toBe(3)
      // The moved modifier (effect) should be at index 0 in node b
      expect(layerB.modifiers[0].type).toBe('effect')
    })
  })

  describe('immutability', () => {
    it('returns a new array, not mutating the original', () => {
      const nodes: SceneNode[] = [createTestLayerWithModifiers('a', 3)]
      const originalModifiers = [...(nodes[0] as Layer).modifiers]

      const position: ModifierDropPosition = { type: 'after', targetNodeId: 'a', targetIndex: 2 }
      const result = moveModifier(nodes, 'a', 0, position)

      expect(result).not.toBe(nodes)
      expect((nodes[0] as Layer).modifiers).toEqual(originalModifiers)
    })
  })
})
