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
import { createEffectModifier, createMaskModifier } from './Modifier'
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
  modifiers: options?.modifiers ?? [createEffectModifier()],
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
    modifiers: [createEffectModifier(), createMaskModifier()],
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
// Tree Manipulation Functions (for Drag & Drop)
// ============================================================

/**
 * Drop position for move operations
 */
export type DropPosition = 'before' | 'after' | 'into'

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
 * Check if sourceId is an ancestor of targetId (to prevent circular moves)
 */
export const isAncestorOf = (
  nodes: SceneNode[],
  sourceId: string,
  targetId: string
): boolean => {
  const sourceNode = findNode(nodes, sourceId)
  if (!sourceNode || !isGroup(sourceNode)) return false

  const checkDescendants = (children: SceneNode[]): boolean => {
    for (const child of children) {
      if (child.id === targetId) return true
      if (isGroup(child) && checkDescendants(child.children)) return true
    }
    return false
  }

  return checkDescendants(sourceNode.children)
}

/**
 * Insert a node at a specific position (before/after target, or into group)
 * Returns new tree (immutable)
 */
export const insertNode = (
  nodes: SceneNode[],
  nodeToInsert: SceneNode,
  targetId: string,
  position: DropPosition
): SceneNode[] => {
  if (position === 'into') {
    return nodes.map(node => {
      if (node.id === targetId && isGroup(node)) {
        return {
          ...node,
          children: [nodeToInsert, ...node.children],
          expanded: true,
        }
      }
      if (isGroup(node)) {
        return {
          ...node,
          children: insertNode(node.children, nodeToInsert, targetId, position),
        }
      }
      return node
    })
  }

  const result: SceneNode[] = []
  for (const node of nodes) {
    if (node.id === targetId) {
      if (position === 'before') {
        result.push(nodeToInsert, node)
      } else {
        result.push(node, nodeToInsert)
      }
    } else if (isGroup(node)) {
      result.push({
        ...node,
        children: insertNode(node.children, nodeToInsert, targetId, position),
      })
    } else {
      result.push(node)
    }
  }

  if (!nodes.some(n => n.id === targetId)) {
    return result
  }

  return result
}

/**
 * Move a node from its current position to a new position
 * Combines remove + insert in an immutable way
 */
export const moveNode = (
  nodes: SceneNode[],
  sourceId: string,
  targetId: string,
  position: DropPosition
): SceneNode[] => {
  if (sourceId === targetId) return nodes
  if (isAncestorOf(nodes, sourceId, targetId)) return nodes

  const sourceNode = findNode(nodes, sourceId)
  if (!sourceNode) return nodes

  // Prevent moving base layer
  if (isLayer(sourceNode) && sourceNode.variant === 'base') return nodes

  // 'into' position only valid for group targets
  if (position === 'into') {
    const targetNode = findNode(nodes, targetId)
    if (!targetNode || !isGroup(targetNode)) return nodes
  }

  const withoutSource = removeNode(nodes, sourceId)
  return insertNode(withoutSource, sourceNode, targetId, position)
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

  // Prevent wrapping base layer
  if (isLayer(targetNode) && targetNode.variant === 'base') return nodes

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
 * Wrap a node in a new group with a mask modifier
 * Creates a new Group containing the target node with a mask modifier added to the node
 * (Mask is applied to the child layer, not the group itself)
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

