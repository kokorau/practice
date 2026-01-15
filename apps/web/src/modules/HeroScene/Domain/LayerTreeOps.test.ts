import { describe, it, expect } from 'vitest'
import { findLayerInTree, updateLayerInTree, removeLayerFromTree } from './LayerTreeOps'
import type { LayerNodeConfig, GroupLayerNodeConfig, SurfaceLayerNodeConfig } from './HeroViewConfig'

// Test helpers
const createSurfaceLayer = (id: string, name: string = 'Surface'): SurfaceLayerNodeConfig => ({
  type: 'surface',
  id,
  name,
  visible: true,
  surface: { type: 'solid', color: 'B' },
  modifiers: [],
})

const createGroupLayer = (id: string, children: LayerNodeConfig[], name: string = 'Group'): GroupLayerNodeConfig => ({
  type: 'group',
  id,
  name,
  visible: true,
  expanded: true,
  children,
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
})
