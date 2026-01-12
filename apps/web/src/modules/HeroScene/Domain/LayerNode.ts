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
import { createEffectPlaceholder } from './Modifier'
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
 * Layer type discriminator
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
 * Scene node union type
 */
export type SceneNode = Layer | Group

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
  BASE: 'base-layer',
  MASK: 'mask-layer',
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
 */
const getDescendantIds = (node: SceneNode): string[] => {
  if (isLayer(node)) return []
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
