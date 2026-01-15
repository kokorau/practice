/**
 * LayerTreeOps
 *
 * Pure utility functions for operating on LayerNodeConfig trees.
 * These are immutable tree operations used by repository implementations.
 */

import type { LayerNodeConfig, GroupLayerNodeConfig } from './HeroViewConfig'

/**
 * Find a layer by ID in the tree (depth-first search)
 */
export const findLayerInTree = (
  layers: LayerNodeConfig[],
  id: string
): LayerNodeConfig | undefined => {
  for (const layer of layers) {
    if (layer.id === id) return layer
    if (layer.type === 'group') {
      const found = findLayerInTree((layer as GroupLayerNodeConfig).children, id)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Update a layer by ID in the tree (immutable)
 */
export const updateLayerInTree = (
  layers: LayerNodeConfig[],
  id: string,
  updates: Partial<LayerNodeConfig>
): LayerNodeConfig[] => {
  return layers.map(layer => {
    if (layer.id === id) {
      return { ...layer, ...updates } as LayerNodeConfig
    }
    if (layer.type === 'group') {
      const group = layer as GroupLayerNodeConfig
      return {
        ...group,
        children: updateLayerInTree(group.children, id, updates),
      }
    }
    return layer
  })
}

/**
 * Remove a layer by ID from the tree (immutable)
 */
export const removeLayerFromTree = (
  layers: LayerNodeConfig[],
  id: string
): LayerNodeConfig[] => {
  return layers
    .filter(layer => layer.id !== id)
    .map(layer => {
      if (layer.type === 'group') {
        const group = layer as GroupLayerNodeConfig
        return {
          ...group,
          children: removeLayerFromTree(group.children, id),
        }
      }
      return layer
    })
}
