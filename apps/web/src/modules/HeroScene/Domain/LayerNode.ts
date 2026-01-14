/**
 * Layer & Group Type Definitions
 *
 * Tree-based layer structure for the UI.
 *
 * Structure:
 * - Layer: Drawable unit with sources (surfaces) and modifiers (effects/masks)
 * - Group: Organizational container for children (like Figma's group)
 *
 * New naming convention:
 * - Layer: replaces SurfaceLayerNode, BaseLayerNode, etc.
 * - Group: replaces GroupLayerNode
 * - sources: replaces surface (now supports multiple)
 * - modifiers: replaces processors
 */

import type { Modifier } from './Modifier'
import { createEffectPlaceholder, createMaskModifier } from './Modifier'
import type { TexturePatternSpec } from '@practice/texture'

// ============================================================
// Surface Types (what to render)
// ============================================================

/**
 * Surface - Runtime rendering definition
 *
 * ## Surface vs SurfaceConfig
 *
 * This codebase uses a two-layer type system for surfaces:
 *
 * | Aspect | Surface (this file) | SurfaceConfig (HeroViewConfig.ts) |
 * |--------|---------------------|-----------------------------------|
 * | Purpose | Runtime rendering | JSON serialization/persistence |
 * | Image data | `ImageBitmap \| string` | `imageId: string` |
 * | Pattern | `TexturePatternSpec` | Individual params (width1, angle, etc.) |
 * | Serializable | No (contains runtime objects) | Yes (JSON.stringify safe) |
 *
 * ## Usage Guidelines by Layer
 *
 * - **Domain**: Use `Surface` for runtime logic, `SurfaceConfig` for persistence schemas
 * - **Application**: Use `SurfaceConfig` for usecase inputs/outputs (repository operations)
 * - **Infra**: Use `SurfaceConfig` for storage, convert to `Surface` for rendering
 *
 * ## Conversion Patterns
 *
 * - `SurfaceConfig → Surface`: Infra layer (load from storage, create runtime objects)
 * - `Surface → SurfaceConfig`: Infra layer (save to storage, extract serializable data)
 *
 * @see HeroViewConfig.ts for SurfaceConfig definition
 */
export type Surface =
  | PatternSurface
  | ImageSurface
  | SolidSurface

export interface PatternSurface {
  type: 'pattern'
  /** Texture pattern specification */
  spec: TexturePatternSpec
}

export interface ImageSurface {
  type: 'image'
  /** Image source */
  source: ImageBitmap | string
}

export interface SolidSurface {
  type: 'solid'
  /** Color (CSS color string or palette key) */
  color: string
}

// ============================================================
// Layer Types
// ============================================================

/**
 * Node type discriminator
 */
export type NodeType = 'layer' | 'group' | 'processor'

/**
 * Layer type discriminator
 * @deprecated Use NodeType instead
 */
export type LayerType = 'layer' | 'group'

/**
 * Layer variant for specialized rendering
 */
export type LayerVariant = 'base' | 'surface' | 'text' | 'model3d' | 'image'

/**
 * Base properties for Layer and Group
 */
export interface NodeBase {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Whether the node is visible */
  visible: boolean
  /** Whether the node is expanded in UI */
  expanded: boolean
}

/**
 * Text configuration for text layers
 */
export interface TextConfig {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  color: string
  position: {
    x: number
    y: number
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  }
  rotation: number
}

/**
 * 3D Model configuration
 */
export interface Model3DConfig {
  modelUrl: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
  materialOverrides?: {
    color?: string
    metalness?: number
    roughness?: number
  }
}

/**
 * Layer - a drawable unit
 *
 * Contains:
 * - sources: What to render (surfaces)
 * - modifiers: How to process (effects, masks)
 */
export interface Layer extends NodeBase {
  type: 'layer'
  /** Layer variant for specialized rendering */
  variant: LayerVariant
  /** Surfaces to render (what to draw) */
  sources: Surface[]
  /** Modifiers to apply (effects, masks) */
  modifiers: Modifier[]
  /** Text configuration (when variant is 'text') */
  textConfig?: TextConfig
  /** 3D model configuration (when variant is 'model3d') */
  model3dConfig?: Model3DConfig
}

/**
 * Group - organizational container
 *
 * Contains children (Layer or Group) for organization purposes.
 * Similar to Figma's group functionality.
 */
export interface Group extends NodeBase {
  type: 'group'
  /** Child nodes */
  children: SceneNode[]
  /** Modifiers applied to the entire group */
  modifiers: Modifier[]
}

/**
 * Processor - applies modifiers to nodes above it in the tree
 *
 * Follows Figma-style mask application rules:
 * - A Processor applies its modifiers to all sibling nodes that appear
 *   ABOVE it in the layer panel (lower index = rendered first = affected by processor)
 * - Similar to how Figma masks affect layers above them
 *
 * @see docs/design/processor-target-specification.md for detailed rules
 */
export interface Processor extends NodeBase {
  type: 'processor'
  /** Modifiers to apply (effects, masks) */
  modifiers: Modifier[]
}

/**
 * Scene node union type
 */
export type SceneNode = Layer | Group | Processor

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create a layer
 */
export const createLayer = (
  id: string,
  variant: LayerVariant,
  sources: Surface[],
  options?: Partial<Omit<Layer, 'type' | 'id' | 'variant' | 'sources'>>
): Layer => ({
  id,
  name: getDefaultName(variant),
  visible: true,
  expanded: true,
  ...options,
  type: 'layer',
  variant,
  sources,
  modifiers: options?.modifiers ?? [createEffectPlaceholder()],
})

/**
 * Create a base layer (background)
 */
export const createBaseLayer = (
  surface: Surface,
  options?: Partial<Omit<Layer, 'type' | 'variant' | 'sources'>>
): Layer => createLayer(
  options?.id ?? 'base',
  'base',
  [surface],
  { name: 'Background', ...options }
)

/**
 * Create a surface layer
 */
export const createSurfaceLayer = (
  id: string,
  surface: Surface,
  options?: Partial<Omit<Layer, 'type' | 'variant' | 'sources'>>
): Layer => createLayer(
  id,
  'surface',
  [surface],
  {
    modifiers: [createEffectPlaceholder()],
    ...options,
  }
)

/**
 * Create a text layer
 */
export const createTextLayer = (
  id: string,
  textConfig: TextConfig,
  options?: Partial<Omit<Layer, 'type' | 'variant' | 'sources' | 'textConfig'>>
): Layer => createLayer(
  id,
  'text',
  [],
  {
    name: `Text: ${textConfig.text.slice(0, 20)}`,
    textConfig,
    ...options,
  }
)

/**
 * Create a 3D model layer
 */
export const createModel3DLayer = (
  id: string,
  model3dConfig: Model3DConfig,
  options?: Partial<Omit<Layer, 'type' | 'variant' | 'sources' | 'model3dConfig'>>
): Layer => createLayer(
  id,
  'model3d',
  [],
  {
    name: '3D Model',
    model3dConfig,
    ...options,
  }
)

/**
 * Create an image layer
 */
export const createImageLayer = (
  id: string,
  source: ImageBitmap | string,
  options?: Partial<Omit<Layer, 'type' | 'variant' | 'sources'>>
): Layer => createLayer(
  id,
  'image',
  [{ type: 'image', source }],
  { name: 'Image', ...options }
)

/**
 * Create a group
 */
export const createGroup = (
  id: string,
  children: SceneNode[] = [],
  options?: Partial<Omit<Group, 'type' | 'id' | 'children'>>
): Group => ({
  id,
  name: 'Group',
  visible: true,
  expanded: true,
  ...options,
  type: 'group',
  children,
  modifiers: options?.modifiers ?? [],
})

/**
 * Create a processor
 *
 * Creates a Processor node that applies its modifiers to sibling nodes
 * above it in the layer tree (Figma-style mask application).
 */
export const createProcessor = (
  id: string,
  options?: Partial<Omit<Processor, 'type' | 'id'>>
): Processor => ({
  id,
  name: 'Processor',
  visible: true,
  expanded: true,
  ...options,
  type: 'processor',
  modifiers: options?.modifiers ?? [createMaskModifier()],
})

/**
 * Get default name for a layer variant
 */
const getDefaultName = (variant: LayerVariant): string => {
  switch (variant) {
    case 'base': return 'Background'
    case 'surface': return 'Surface'
    case 'text': return 'Text'
    case 'model3d': return '3D Model'
    case 'image': return 'Image'
    default: return 'Layer'
  }
}

// ============================================================
// Scene Layer ID Mapping
// ============================================================

/**
 * Scene layer IDs used by the rendering engine
 */
export const SCENE_LAYER_IDS = {
  BASE: 'base',
  MASK: 'mask',
} as const

export type SceneLayerId = typeof SCENE_LAYER_IDS[keyof typeof SCENE_LAYER_IDS]

/**
 * Get the scene layer ID for a Layer based on its variant
 * Uses exhaustive switch for type safety
 */
export const getSceneLayerId = (layer: Layer): SceneLayerId => {
  switch (layer.variant) {
    case 'base':
      return SCENE_LAYER_IDS.BASE
    case 'surface':
    case 'text':
    case 'model3d':
    case 'image':
      return SCENE_LAYER_IDS.MASK
    default: {
      // Exhaustive check - this should never be reached
      layer.variant satisfies never
      return SCENE_LAYER_IDS.MASK
    }
  }
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Check if node is a Layer
 */
export const isLayer = (node: SceneNode): node is Layer =>
  node.type === 'layer'

/**
 * Check if node is a Group
 */
export const isGroup = (node: SceneNode): node is Group =>
  node.type === 'group'

/**
 * Check if node is a Processor
 */
export const isProcessor = (node: SceneNode): node is Processor =>
  node.type === 'processor'

/**
 * Check if layer is a base layer
 */
export const isBaseLayer = (node: SceneNode): boolean =>
  isLayer(node) && node.variant === 'base'

/**
 * Check if layer is a surface layer
 */
export const isSurfaceLayer = (node: SceneNode): boolean =>
  isLayer(node) && node.variant === 'surface'

/**
 * Check if layer is a text layer
 */
export const isTextLayer = (node: SceneNode): boolean =>
  isLayer(node) && node.variant === 'text'

/**
 * Check if layer is a 3D model layer
 */
export const isModel3DLayer = (node: SceneNode): boolean =>
  isLayer(node) && node.variant === 'model3d'

/**
 * Check if layer is an image layer
 */
export const isImageLayer = (node: SceneNode): boolean =>
  isLayer(node) && node.variant === 'image'

// ============================================================
// Tree Utility Functions
// ============================================================

/**
 * Find a node by ID (recursive search)
 */
export const findNode = (nodes: SceneNode[], id: string): SceneNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (isGroup(node)) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Update a node by ID (recursive, immutable)
 */
export const updateNode = (
  nodes: SceneNode[],
  id: string,
  updates: Partial<SceneNode>
): SceneNode[] => {
  return nodes.map(node => {
    if (node.id === id) {
      return { ...node, ...updates } as SceneNode
    }
    if (isGroup(node)) {
      return {
        ...node,
        children: updateNode(node.children, id, updates),
      }
    }
    return node
  })
}

/**
 * Remove a node by ID (recursive, immutable)
 */
export const removeNode = (nodes: SceneNode[], id: string): SceneNode[] => {
  return nodes
    .filter(node => node.id !== id)
    .map(node => {
      if (isGroup(node)) {
        return {
          ...node,
          children: removeNode(node.children, id),
        }
      }
      return node
    })
}

/**
 * Flatten nodes to a list (for rendering order)
 */
export const flattenNodes = (nodes: SceneNode[]): SceneNode[] => {
  const result: SceneNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (isGroup(node)) {
      result.push(...flattenNodes(node.children))
    }
  }
  return result
}

// ============================================================
// Tree Manipulation Functions
// ============================================================

/**
 * Find the parent of a node by ID
 * Returns null if the node is at root level, undefined if not found
 */
export const findParentNode = (
  nodes: SceneNode[],
  targetId: string,
  parent: Group | null = null
): Group | null | undefined => {
  for (const node of nodes) {
    if (node.id === targetId) return parent
    if (isGroup(node)) {
      const found = findParentNode(node.children, targetId, node)
      if (found !== undefined) return found
    }
  }
  return undefined
}

/**
 * Wrap a node in a new group
 * Creates a new Group containing the target node and replaces the node with the group
 */
export const wrapNodeInGroup = (
  nodes: SceneNode[],
  targetId: string,
  groupId?: string
): SceneNode[] => {
  const targetNode = findNode(nodes, targetId)
  if (!targetNode) return nodes

  const newGroupId = groupId ?? `group-${Date.now()}`
  const newGroup = createGroup(newGroupId, [targetNode], { name: 'Group', expanded: true })

  // Replace target node with new group (recursive)
  const replaceWithGroup = (nodeList: SceneNode[]): SceneNode[] => {
    return nodeList.map(node => {
      if (node.id === targetId) {
        return newGroup
      }
      if (isGroup(node)) {
        return {
          ...node,
          children: replaceWithGroup(node.children),
        }
      }
      return node
    })
  }

  return replaceWithGroup(nodes)
}

/**
 * Wrap a node in a new group with a mask modifier applied
 * Creates a new Group containing the target node (with MaskModifier added) and replaces the node with the group
 */
export const wrapNodeInMaskedGroup = (
  nodes: SceneNode[],
  targetId: string,
  groupId?: string
): SceneNode[] => {
  const targetNode = findNode(nodes, targetId)
  if (!targetNode) return nodes

  // Prevent wrapping base layer
  if (isLayer(targetNode) && targetNode.variant === 'base') return nodes

  const newGroupId = groupId ?? `masked-group-${Date.now()}`

  // Add mask modifier to the target node (if it's a Layer)
  let maskedNode: SceneNode = targetNode
  if (isLayer(targetNode)) {
    maskedNode = {
      ...targetNode,
      modifiers: [...targetNode.modifiers, createMaskModifier()],
    }
  }

  // Create new group with the masked node as child
  const newGroup = createGroup(newGroupId, [maskedNode], {
    name: 'Masked Group',
    expanded: true,
  })

  // Replace target node with new group (recursive)
  const replaceWithGroup = (nodeList: SceneNode[]): SceneNode[] => {
    return nodeList.map(node => {
      if (node.id === targetId) {
        return newGroup
      }
      if (isGroup(node)) {
        return {
          ...node,
          children: replaceWithGroup(node.children),
        }
      }
      return node
    })
  }

  return replaceWithGroup(nodes)
}

// ============================================================
// Node Move Functions
// ============================================================

/**
 * Drop position for drag & drop operations
 *
 * - before: Insert before the target node (same parent)
 * - after: Insert after the target node (same parent)
 * - into: Insert as last child of target group
 */
export type DropPosition =
  | { type: 'before'; targetId: string }
  | { type: 'after'; targetId: string }
  | { type: 'into'; targetId: string }

/**
 * Get all descendant IDs of a node (recursive)
 * Only Groups have children, Layer and Processor are leaf nodes
 */
const getDescendantIds = (node: SceneNode): string[] => {
  if (!isGroup(node)) return []
  const ids: string[] = []
  for (const child of node.children) {
    ids.push(child.id)
    ids.push(...getDescendantIds(child))
  }
  return ids
}

/**
 * Check if a node can be moved to the specified position
 *
 * Rules:
 * - Cannot move a node to itself
 * - Cannot move a group into its own descendant (circular reference)
 * - Target must exist
 * - 'into' position target must be a group
 */
export const canMoveSceneNode = (
  nodes: SceneNode[],
  nodeId: string,
  position: DropPosition
): boolean => {
  const sourceNode = findNode(nodes, nodeId)
  if (!sourceNode) return false

  const targetNode = findNode(nodes, position.targetId)
  if (!targetNode) return false

  // Cannot move to itself
  if (nodeId === position.targetId) return false

  // 'into' position requires target to be a group
  if (position.type === 'into' && !isGroup(targetNode)) return false

  // Check circular reference: cannot move a group into its own descendant
  if (isGroup(sourceNode)) {
    const descendantIds = getDescendantIds(sourceNode)
    if (descendantIds.includes(position.targetId)) return false
  }

  return true
}

/**
 * Move a scene node to a new position
 *
 * @param nodes - Current node tree
 * @param nodeId - ID of the node to move
 * @param position - Target position
 * @returns New node tree with the node moved, or original tree if move is invalid
 */
export const moveSceneNode = (
  nodes: SceneNode[],
  nodeId: string,
  position: DropPosition
): SceneNode[] => {
  // Validate the move
  if (!canMoveSceneNode(nodes, nodeId, position)) return nodes

  const nodeToMove = findNode(nodes, nodeId)
  if (!nodeToMove) return nodes

  // Step 1: Remove the node from its current position
  const nodesWithoutSource = removeNode(nodes, nodeId)

  // Step 2: Insert at new position
  return insertNode(nodesWithoutSource, nodeToMove, position)
}

/**
 * Insert a node at the specified position
 */
const insertNode = (
  nodes: SceneNode[],
  nodeToInsert: SceneNode,
  position: DropPosition
): SceneNode[] => {
  if (position.type === 'into') {
    // Insert as last child of target group
    return insertIntoGroup(nodes, nodeToInsert, position.targetId)
  }

  // Insert before or after target
  return insertBeforeOrAfter(nodes, nodeToInsert, position.targetId, position.type)
}

/**
 * Insert node as last child of a group
 */
const insertIntoGroup = (
  nodes: SceneNode[],
  nodeToInsert: SceneNode,
  targetGroupId: string
): SceneNode[] => {
  return nodes.map(node => {
    if (node.id === targetGroupId && isGroup(node)) {
      return {
        ...node,
        children: [...node.children, nodeToInsert],
      }
    }
    if (isGroup(node)) {
      return {
        ...node,
        children: insertIntoGroup(node.children, nodeToInsert, targetGroupId),
      }
    }
    return node
  })
}

/**
 * Insert node before or after target (at same level)
 */
const insertBeforeOrAfter = (
  nodes: SceneNode[],
  nodeToInsert: SceneNode,
  targetId: string,
  type: 'before' | 'after'
): SceneNode[] => {
  // Check if target is at this level
  const targetIndex = nodes.findIndex(n => n.id === targetId)

  if (targetIndex !== -1) {
    // Target found at this level - insert here
    const insertIndex = type === 'before' ? targetIndex : targetIndex + 1
    return [
      ...nodes.slice(0, insertIndex),
      nodeToInsert,
      ...nodes.slice(insertIndex),
    ]
  }

  // Target not at this level - search in children
  return nodes.map(node => {
    if (isGroup(node)) {
      return {
        ...node,
        children: insertBeforeOrAfter(node.children, nodeToInsert, targetId, type),
      }
    }
    return node
  })
}

// ============================================================
// Processor Target Functions
// ============================================================

/**
 * Get the target nodes that a Processor applies to
 *
 * Rules:
 * - Processor applies to sibling nodes that appear BEFORE it (lower index)
 * - In a Group: all preceding non-Processor siblings until another Processor
 * - At Root level: only the immediately preceding node (1 element only)
 * - If no valid target exists (processor first, or preceded by another processor), returns empty
 *
 * @param siblings - Array of sibling nodes (children of same parent)
 * @param processorIndex - Index of the Processor in the siblings array
 * @param isRoot - Whether this is at root level (true) or inside a Group (false)
 * @returns Array of SceneNodes that the Processor applies to
 *
 * @example
 * // Group context: Processor applies to all preceding siblings
 * // [Surface, Text, Processor, Surface] -> getProcessorTargets(nodes, 2, false) = [Surface, Text]
 *
 * @example
 * // Root context: Processor applies to immediately preceding node only
 * // [Surface, Surface, Processor] -> getProcessorTargets(nodes, 2, true) = [Surface]
 */
export const getProcessorTargets = (
  siblings: SceneNode[],
  processorIndex: number,
  isRoot: boolean
): SceneNode[] => {
  // No targets if processor is first or index is invalid
  if (processorIndex <= 0 || processorIndex >= siblings.length) return []

  if (isRoot) {
    // Root level: only the immediately preceding node
    const prevNode = siblings[processorIndex - 1]
    if (!prevNode) return []
    // If preceded by another processor, no targets
    return isProcessor(prevNode) ? [] : [prevNode]
  }

  // Group context: all preceding non-Processor siblings until another Processor
  const targets: SceneNode[] = []
  for (let i = processorIndex - 1; i >= 0; i--) {
    const node = siblings[i]
    if (!node) continue
    if (isProcessor(node)) break // Stop at previous Processor
    targets.unshift(node)
  }
  return targets
}

/**
 * Find the Processor that applies to a given node
 *
 * Searches forward from the node's position to find the first Processor
 * that includes this node in its targets.
 *
 * @param siblings - Array of sibling nodes
 * @param nodeIndex - Index of the target node
 * @param isRoot - Whether this is at root level
 * @returns The Processor that applies to this node, or undefined if none
 *
 * @example
 * // [Surface, Text, Processor] -> findProcessorForNode(nodes, 0, false) = Processor
 * // [Surface, Text, Processor] -> findProcessorForNode(nodes, 1, false) = Processor
 */
export const findProcessorForNode = (
  siblings: SceneNode[],
  nodeIndex: number,
  isRoot: boolean
): Processor | undefined => {
  if (nodeIndex < 0 || nodeIndex >= siblings.length) return undefined

  const targetNode = siblings[nodeIndex]
  if (!targetNode) return undefined

  // Search forward for a Processor
  for (let i = nodeIndex + 1; i < siblings.length; i++) {
    const node = siblings[i]
    if (!node) continue
    if (isProcessor(node)) {
      // Check if the node at nodeIndex is in this Processor's targets
      const targets = getProcessorTargets(siblings, i, isRoot)
      if (targets.some(t => t === targetNode)) {
        return node
      }
      // This Processor doesn't include our node, and no subsequent processor will
      // (since processors stop at the previous processor)
      return undefined
    }
  }
  return undefined
}

/**
 * Get all Processor-target pairs in a sibling array
 *
 * Useful for rendering: returns each Processor with its target nodes.
 *
 * @param siblings - Array of sibling nodes
 * @param isRoot - Whether this is at root level
 * @returns Array of { processor, targets } pairs
 */
export const getProcessorTargetPairs = (
  siblings: SceneNode[],
  isRoot: boolean
): Array<{ processor: Processor; targets: SceneNode[] }> => {
  const pairs: Array<{ processor: Processor; targets: SceneNode[] }> = []

  for (let i = 0; i < siblings.length; i++) {
    const node = siblings[i]
    if (!node) continue
    if (isProcessor(node)) {
      const targets = getProcessorTargets(siblings, i, isRoot)
      pairs.push({ processor: node, targets })
    }
  }

  return pairs
}

// ============================================================
// Modifier Move Functions
// ============================================================

/**
 * Modifier drop position for drag & drop operations
 *
 * - before: Insert before the target modifier at the specified index
 * - after: Insert after the target modifier at the specified index
 */
export type ModifierDropPosition =
  | { type: 'before'; targetNodeId: string; targetIndex: number }
  | { type: 'after'; targetNodeId: string; targetIndex: number }

/**
 * Check if a modifier can be moved to the specified position
 *
 * Rules:
 * - Source node must exist and have modifiers
 * - Target node must exist
 * - Modifier must exist at source index
 * - Cannot drop at the exact same position (same node, same index, before position when index matches)
 */
export const canMoveModifier = (
  nodes: SceneNode[],
  sourceNodeId: string,
  sourceModifierIndex: number,
  position: ModifierDropPosition
): boolean => {
  const sourceNode = findNode(nodes, sourceNodeId)
  if (!sourceNode) return false

  const targetNode = findNode(nodes, position.targetNodeId)
  if (!targetNode) return false

  // Check if modifier exists at source index
  if (sourceModifierIndex < 0 || sourceModifierIndex >= sourceNode.modifiers.length) {
    return false
  }

  // Check if target index is valid
  const targetModifiersCount = targetNode.modifiers.length
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
 * @param nodes - Current node tree
 * @param sourceNodeId - ID of the node containing the modifier
 * @param sourceModifierIndex - Index of the modifier to move
 * @param position - Target position
 * @returns New node tree with the modifier moved, or original tree if move is invalid
 */
export const moveModifier = (
  nodes: SceneNode[],
  sourceNodeId: string,
  sourceModifierIndex: number,
  position: ModifierDropPosition
): SceneNode[] => {
  // Validate the move
  if (!canMoveModifier(nodes, sourceNodeId, sourceModifierIndex, position)) {
    return nodes
  }

  const sourceNode = findNode(nodes, sourceNodeId)
  if (!sourceNode) return nodes

  const modifierToMove = sourceNode.modifiers[sourceModifierIndex]
  if (!modifierToMove) return nodes

  // Same node move (reorder within modifiers array)
  if (sourceNodeId === position.targetNodeId) {
    const newModifiers = [...sourceNode.modifiers]

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

    return updateNode(nodes, sourceNodeId, { modifiers: newModifiers })
  }

  // Cross-node move
  // Step 1: Remove modifier from source node
  const nodesWithoutSourceModifier = updateNode(nodes, sourceNodeId, {
    modifiers: sourceNode.modifiers.filter((_, i) => i !== sourceModifierIndex),
  })

  // Step 2: Add modifier to target node
  const targetNode = findNode(nodesWithoutSourceModifier, position.targetNodeId)
  if (!targetNode) return nodes

  const targetModifiers = [...targetNode.modifiers]
  const insertIndex = position.type === 'before'
    ? position.targetIndex
    : position.targetIndex + 1

  targetModifiers.splice(insertIndex, 0, modifierToMove)

  return updateNode(nodesWithoutSourceModifier, position.targetNodeId, {
    modifiers: targetModifiers,
  })
}
