/**
 * LayerTreeOps
 *
 * Pure utility functions for operating on LayerNodeConfig trees.
 * These are immutable tree operations used by repository implementations.
 */

import type {
  LayerNodeConfig,
  GroupLayerNodeConfig,
  ProcessorNodeConfig,
  SurfaceLayerNodeConfig,
  BaseLayerNodeConfig,
  TextLayerNodeConfig,
  ImageLayerNodeConfig,
  Model3DLayerNodeConfig,
  ProcessorConfig,
  MaskProcessorConfig,
} from './HeroViewConfig'

// ============================================================
// Drop Position Types
// ============================================================

/**
 * Drop position for drag & drop operations
 *
 * - before: Insert before the target node (same parent)
 * - after: Insert after the target node (same parent)
 * - into: Insert as last child of target group
 */
export type LayerDropPosition =
  | { type: 'before'; targetId: string }
  | { type: 'after'; targetId: string }
  | { type: 'into'; targetId: string }

/**
 * Modifier drop position for drag & drop operations
 *
 * - before: Insert before the target modifier at the specified index
 * - after: Insert after the target modifier at the specified index
 */
export type ModifierDropPosition =
  | { type: 'before'; targetNodeId: string; targetIndex: number }
  | { type: 'after'; targetNodeId: string; targetIndex: number }

// ============================================================
// Type Guards
// ============================================================

/**
 * Check if layer is a Group
 */
export const isGroupLayerConfig = (layer: LayerNodeConfig): layer is GroupLayerNodeConfig =>
  layer.type === 'group'

/**
 * Check if layer is a Processor
 */
export const isProcessorLayerConfig = (layer: LayerNodeConfig): layer is ProcessorNodeConfig =>
  layer.type === 'processor'

/**
 * Check if layer is a Surface layer
 */
export const isSurfaceLayerConfig = (layer: LayerNodeConfig): layer is SurfaceLayerNodeConfig =>
  layer.type === 'surface'

/**
 * Check if layer is a Base layer
 */
export const isBaseLayerConfig = (layer: LayerNodeConfig): layer is BaseLayerNodeConfig =>
  layer.type === 'base'

/**
 * Check if layer is a Text layer
 */
export const isTextLayerConfig = (layer: LayerNodeConfig): layer is TextLayerNodeConfig =>
  layer.type === 'text'

/**
 * Check if layer is an Image layer
 */
export const isImageLayerConfig = (layer: LayerNodeConfig): layer is ImageLayerNodeConfig =>
  layer.type === 'image'

/**
 * Check if layer is a 3D Model layer
 */
export const isModel3DLayerConfig = (layer: LayerNodeConfig): layer is Model3DLayerNodeConfig =>
  layer.type === 'model3d'

/**
 * Check if processor config is a mask
 */
export const isMaskProcessorConfig = (config: ProcessorConfig): config is MaskProcessorConfig =>
  config.type === 'mask'

// ============================================================
// Tree Query Functions
// ============================================================

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

/**
 * Find the parent of a layer by ID
 * Returns null if the layer is at root level, undefined if not found
 */
export const findParentLayerInTree = (
  layers: LayerNodeConfig[],
  targetId: string,
  parent: GroupLayerNodeConfig | null = null
): GroupLayerNodeConfig | null | undefined => {
  for (const layer of layers) {
    if (layer.id === targetId) return parent
    if (isGroupLayerConfig(layer)) {
      const found = findParentLayerInTree(layer.children, targetId, layer)
      if (found !== undefined) return found
    }
  }
  return undefined
}

/**
 * Flatten layers to a list (for iteration, depth-first order)
 */
export const flattenLayersInTree = (layers: LayerNodeConfig[]): LayerNodeConfig[] => {
  const result: LayerNodeConfig[] = []
  for (const layer of layers) {
    result.push(layer)
    if (isGroupLayerConfig(layer)) {
      result.push(...flattenLayersInTree(layer.children))
    }
  }
  return result
}

// ============================================================
// Layer Move Functions
// ============================================================

/**
 * Get all descendant IDs of a layer (recursive)
 * Only Groups have children
 */
const getDescendantIds = (layer: LayerNodeConfig): string[] => {
  if (!isGroupLayerConfig(layer)) return []
  const ids: string[] = []
  for (const child of layer.children) {
    ids.push(child.id)
    ids.push(...getDescendantIds(child))
  }
  return ids
}

/**
 * Check if a layer can be moved to the specified position
 *
 * Rules:
 * - Cannot move a layer to itself
 * - Cannot move a group into its own descendant (circular reference)
 * - Target must exist
 * - 'into' position target must be a group
 */
export const canMoveLayerInTree = (
  layers: LayerNodeConfig[],
  layerId: string,
  position: LayerDropPosition
): boolean => {
  const sourceLayer = findLayerInTree(layers, layerId)
  if (!sourceLayer) return false

  const targetLayer = findLayerInTree(layers, position.targetId)
  if (!targetLayer) return false

  // Cannot move to itself
  if (layerId === position.targetId) return false

  // 'into' position requires target to be a group
  if (position.type === 'into' && !isGroupLayerConfig(targetLayer)) return false

  // Check circular reference: cannot move a group into its own descendant
  if (isGroupLayerConfig(sourceLayer)) {
    const descendantIds = getDescendantIds(sourceLayer)
    if (descendantIds.includes(position.targetId)) return false
  }

  return true
}

/**
 * Move a layer to a new position
 *
 * @param layers - Current layer tree
 * @param layerId - ID of the layer to move
 * @param position - Target position
 * @returns New layer tree with the layer moved, or original tree if move is invalid
 */
export const moveLayerInTree = (
  layers: LayerNodeConfig[],
  layerId: string,
  position: LayerDropPosition
): LayerNodeConfig[] => {
  // Validate the move
  if (!canMoveLayerInTree(layers, layerId, position)) return layers

  const layerToMove = findLayerInTree(layers, layerId)
  if (!layerToMove) return layers

  // Step 1: Remove the layer from its current position
  const layersWithoutSource = removeLayerFromTree(layers, layerId)

  // Step 2: Insert at new position
  return insertLayerInTree(layersWithoutSource, layerToMove, position)
}

/**
 * Insert a layer at the specified position
 */
export const insertLayerInTree = (
  layers: LayerNodeConfig[],
  layerToInsert: LayerNodeConfig,
  position: LayerDropPosition
): LayerNodeConfig[] => {
  if (position.type === 'into') {
    // Insert as last child of target group
    return insertIntoGroup(layers, layerToInsert, position.targetId)
  }

  // Insert before or after target
  return insertBeforeOrAfter(layers, layerToInsert, position.targetId, position.type)
}

/**
 * Insert layer as last child of a group
 */
const insertIntoGroup = (
  layers: LayerNodeConfig[],
  layerToInsert: LayerNodeConfig,
  targetGroupId: string
): LayerNodeConfig[] => {
  return layers.map(layer => {
    if (layer.id === targetGroupId && isGroupLayerConfig(layer)) {
      return {
        ...layer,
        children: [...layer.children, layerToInsert],
      }
    }
    if (isGroupLayerConfig(layer)) {
      return {
        ...layer,
        children: insertIntoGroup(layer.children, layerToInsert, targetGroupId),
      }
    }
    return layer
  })
}

/**
 * Insert layer before or after target (at same level)
 */
const insertBeforeOrAfter = (
  layers: LayerNodeConfig[],
  layerToInsert: LayerNodeConfig,
  targetId: string,
  type: 'before' | 'after'
): LayerNodeConfig[] => {
  // Check if target is at this level
  const targetIndex = layers.findIndex(l => l.id === targetId)

  if (targetIndex !== -1) {
    // Target found at this level - insert here
    const insertIndex = type === 'before' ? targetIndex : targetIndex + 1
    return [
      ...layers.slice(0, insertIndex),
      layerToInsert,
      ...layers.slice(insertIndex),
    ]
  }

  // Target not at this level - search in children
  return layers.map(layer => {
    if (isGroupLayerConfig(layer)) {
      return {
        ...layer,
        children: insertBeforeOrAfter(layer.children, layerToInsert, targetId, type),
      }
    }
    return layer
  })
}

// ============================================================
// Group Wrap Functions
// ============================================================

/**
 * Create a new GroupLayerNodeConfig
 */
export const createGroupLayerConfig = (
  id: string,
  children: LayerNodeConfig[] = [],
  options?: Partial<Omit<GroupLayerNodeConfig, 'type' | 'id' | 'children'>>
): GroupLayerNodeConfig => ({
  type: 'group',
  id,
  name: options?.name ?? 'Group',
  visible: options?.visible ?? true,
  children,
  filters: options?.filters,
})

/**
 * Wrap a layer in a new group
 * Creates a new Group containing the target layer and replaces the layer with the group
 */
export const wrapLayerInGroupInTree = (
  layers: LayerNodeConfig[],
  targetId: string,
  groupId?: string
): LayerNodeConfig[] => {
  const targetLayer = findLayerInTree(layers, targetId)
  if (!targetLayer) return layers

  const newGroupId = groupId ?? `group-${Date.now()}`
  const newGroup = createGroupLayerConfig(newGroupId, [targetLayer], { name: 'Group' })

  // Replace target layer with new group (recursive)
  const replaceWithGroup = (layerList: LayerNodeConfig[]): LayerNodeConfig[] => {
    return layerList.map(layer => {
      if (layer.id === targetId) {
        return newGroup
      }
      if (isGroupLayerConfig(layer)) {
        return {
          ...layer,
          children: replaceWithGroup(layer.children),
        }
      }
      return layer
    })
  }

  return replaceWithGroup(layers)
}

// ============================================================
// Modifier Move Functions
// ============================================================

/**
 * Check if a modifier can be moved to the specified position
 *
 * Rules:
 * - Source layer must exist and be a Processor
 * - Target layer must exist and be a Processor
 * - Modifier must exist at source index
 * - Cannot drop at the exact same position
 */
export const canMoveModifierInTree = (
  layers: LayerNodeConfig[],
  sourceNodeId: string,
  sourceModifierIndex: number,
  position: ModifierDropPosition
): boolean => {
  const sourceLayer = findLayerInTree(layers, sourceNodeId)
  if (!sourceLayer || !isProcessorLayerConfig(sourceLayer)) return false

  const targetLayer = findLayerInTree(layers, position.targetNodeId)
  if (!targetLayer || !isProcessorLayerConfig(targetLayer)) return false

  // Check if modifier exists at source index
  if (sourceModifierIndex < 0 || sourceModifierIndex >= sourceLayer.modifiers.length) {
    return false
  }

  // Check if target index is valid
  const targetModifiersCount = targetLayer.modifiers.length
  if (position.targetIndex < 0 || position.targetIndex > targetModifiersCount) {
    return false
  }

  // If same node, check if it's a no-op move
  if (sourceNodeId === position.targetNodeId) {
    const effectiveTargetIndex = position.type === 'before'
      ? position.targetIndex
      : position.targetIndex + 1

    // Same position (accounting for removal shift)
    if (effectiveTargetIndex === sourceModifierIndex ||
        effectiveTargetIndex === sourceModifierIndex + 1) {
      return false
    }
  }

  return true
}

/**
 * Move a modifier to a new position
 *
 * @param layers - Current layer tree
 * @param sourceNodeId - ID of the layer containing the modifier
 * @param sourceModifierIndex - Index of the modifier to move
 * @param position - Target position
 * @returns New layer tree with the modifier moved, or original tree if move is invalid
 */
export const moveModifierInTree = (
  layers: LayerNodeConfig[],
  sourceNodeId: string,
  sourceModifierIndex: number,
  position: ModifierDropPosition
): LayerNodeConfig[] => {
  // Validate the move
  if (!canMoveModifierInTree(layers, sourceNodeId, sourceModifierIndex, position)) {
    return layers
  }

  const sourceLayer = findLayerInTree(layers, sourceNodeId)
  if (!sourceLayer || !isProcessorLayerConfig(sourceLayer)) return layers

  const modifierToMove = sourceLayer.modifiers[sourceModifierIndex]
  if (!modifierToMove) return layers

  // Same node move (reorder within modifiers array)
  if (sourceNodeId === position.targetNodeId) {
    const newModifiers = [...sourceLayer.modifiers]

    // Remove from source
    newModifiers.splice(sourceModifierIndex, 1)

    // Calculate insert index (accounting for the removal)
    let insertIndex = position.type === 'before'
      ? position.targetIndex
      : position.targetIndex + 1

    // Adjust for removal if necessary
    if (sourceModifierIndex < insertIndex) {
      insertIndex -= 1
    }

    // Insert at new position
    newModifiers.splice(insertIndex, 0, modifierToMove)

    return updateLayerInTree(layers, sourceNodeId, { modifiers: newModifiers } as Partial<ProcessorNodeConfig>)
  }

  // Cross-node move
  // Step 1: Remove modifier from source node
  const layersWithoutSourceModifier = updateLayerInTree(layers, sourceNodeId, {
    modifiers: sourceLayer.modifiers.filter((_, i) => i !== sourceModifierIndex),
  } as Partial<ProcessorNodeConfig>)

  // Step 2: Add modifier to target node
  const targetLayer = findLayerInTree(layersWithoutSourceModifier, position.targetNodeId)
  if (!targetLayer || !isProcessorLayerConfig(targetLayer)) return layers

  const targetModifiers = [...targetLayer.modifiers]
  const insertIndex = position.type === 'before'
    ? position.targetIndex
    : position.targetIndex + 1

  targetModifiers.splice(insertIndex, 0, modifierToMove)

  return updateLayerInTree(layersWithoutSourceModifier, position.targetNodeId, {
    modifiers: targetModifiers,
  } as Partial<ProcessorNodeConfig>)
}
