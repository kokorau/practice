/**
 * LayerNode Type Definitions
 *
 * Tree-based layer structure for the UI.
 *
 * Layer Categories:
 * - object: Drawable targets (base, surface, text, model3d, image)
 * - group: Organizational grouping only (no rendering semantics)
 *
 * Processors (effect, mask) are attached to layers, not separate layer types.
 */

import type { Processor } from './Processor'
import type { TexturePatternSpec } from '@practice/texture'

// ============================================================
// Layer Categories & Subtypes
// ============================================================

/**
 * Layer category - top-level classification
 */
export type LayerCategory = 'object' | 'group'

/**
 * Object subtypes - drawable targets
 */
export type ObjectSubtype = 'base' | 'surface' | 'text' | 'model3d' | 'image'

// ============================================================
// Inline types to avoid circular import
// ============================================================

/**
 * Text layer configuration (inline to avoid circular import)
 */
export interface TextLayerConfig {
  type: 'text'
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
 * 3D Model layer configuration (inline to avoid circular import)
 */
export interface Model3DLayerConfig {
  type: 'model3d'
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

/** @deprecated Use Model3DLayerConfig instead */
export type ObjectLayerConfig = Model3DLayerConfig

// ============================================================
// Layer Node Types
// ============================================================

/**
 * Layer node type discriminator
 */
export type LayerNodeType = 'base' | 'group' | 'surface' | 'model3d' | 'text' | 'image'

/** @deprecated Use LayerNodeType instead */
export type LegacyLayerNodeType = 'base' | 'group' | 'surface' | 'object' | 'text'

/**
 * Base properties for all layer nodes
 */
export interface LayerNodeBase {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Whether the layer is visible */
  visible: boolean
  /** Whether the layer is expanded in UI */
  expanded: boolean
  /** Layer category */
  category: LayerCategory
}

// ============================================================
// Concrete Layer Node Types (Object Category)
// ============================================================

/**
 * Base layer (background) - always present, cannot be deleted
 * Does not support mask processors (always opaque)
 */
export interface BaseLayerNode extends LayerNodeBase {
  category: 'object'
  type: 'base'
  /** Surface configuration */
  surface: SurfaceConfig
  /** Processors (effects only, no masks) */
  processors: Processor[]
}

/**
 * Surface layer - displays a texture pattern
 */
export interface SurfaceLayerNode extends LayerNodeBase {
  category: 'object'
  type: 'surface'
  /** Surface configuration */
  surface: SurfaceConfig
  /** Processors (effect + mask) */
  processors: Processor[]
}

/**
 * Text layer - displays text
 */
export interface TextLayerNode extends LayerNodeBase {
  category: 'object'
  type: 'text'
  /** Text configuration */
  config: TextLayerConfig
  /** Processors (effect + mask) */
  processors: Processor[]
}

/**
 * 3D Model layer - displays a 3D object
 */
export interface Model3DLayerNode extends LayerNodeBase {
  category: 'object'
  type: 'model3d'
  /** Model configuration */
  config: Model3DLayerConfig
  /** Processors (effect + mask) */
  processors: Processor[]
}

/** @deprecated Use Model3DLayerNode instead */
export type ObjectLayerNode = Model3DLayerNode

/**
 * Image layer - displays an image
 */
export interface ImageLayerNode extends LayerNodeBase {
  category: 'object'
  type: 'image'
  /** Image source */
  source: ImageBitmap | string
  /** Processors (effect + mask) */
  processors: Processor[]
}

// ============================================================
// Concrete Layer Node Types (Group Category)
// ============================================================

/**
 * Group layer - organizational container for child layers
 * No rendering semantics - purely for UI organization
 */
export interface GroupLayerNode extends LayerNodeBase {
  category: 'group'
  type: 'group'
  /** Child layer nodes */
  children: LayerNode[]
  /** Processors applied to the entire group (effect + mask) */
  processors: Processor[]
}

// ============================================================
// Union Types
// ============================================================

/**
 * Object layer nodes (drawable targets)
 */
export type ObjectCategoryNode =
  | BaseLayerNode
  | SurfaceLayerNode
  | TextLayerNode
  | Model3DLayerNode
  | ImageLayerNode

/**
 * Layer node union type
 */
export type LayerNode = ObjectCategoryNode | GroupLayerNode

// ============================================================
// Surface Configuration
// ============================================================

/**
 * Surface configuration - how a layer's content is rendered
 */
export type SurfaceConfig =
  | TexturePatternSurface
  | ImageSurface
  | SolidSurface

export interface TexturePatternSurface {
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
// Factory Functions
// ============================================================

import { createEffectProcessor } from './Processor'

/**
 * Create a base layer node
 */
export const createBaseLayerNode = (
  surface: SurfaceConfig,
  options?: Partial<Omit<BaseLayerNode, 'type' | 'category' | 'surface'>>
): BaseLayerNode => ({
  id: 'base',
  name: 'Background',
  visible: true,
  expanded: true,
  ...options,
  category: 'object',
  type: 'base',
  surface,
  processors: options?.processors ?? [createEffectProcessor()],
})

/**
 * Create a group layer node
 */
export const createGroupLayerNode = (
  id: string,
  children: LayerNode[] = [],
  options?: Partial<Omit<GroupLayerNode, 'type' | 'category' | 'children'>>
): GroupLayerNode => ({
  id,
  name: 'Group',
  visible: true,
  expanded: true,
  ...options,
  category: 'group',
  type: 'group',
  children,
  processors: options?.processors ?? [],
})

/**
 * Create a surface layer node
 */
export const createSurfaceLayerNode = (
  id: string,
  surface: SurfaceConfig,
  options?: Partial<Omit<SurfaceLayerNode, 'type' | 'category' | 'surface'>>
): SurfaceLayerNode => ({
  id,
  name: 'Surface',
  visible: true,
  expanded: true,
  ...options,
  category: 'object',
  type: 'surface',
  surface,
  processors: options?.processors ?? [],
})

/**
 * Create a text layer node
 */
export const createTextLayerNode = (
  id: string,
  config: TextLayerConfig,
  options?: Partial<Omit<TextLayerNode, 'type' | 'category' | 'config'>>
): TextLayerNode => ({
  id,
  name: `Text: ${config.text.slice(0, 20)}`,
  visible: true,
  expanded: true,
  ...options,
  category: 'object',
  type: 'text',
  config,
  processors: options?.processors ?? [],
})

/**
 * Create a 3D model layer node
 */
export const createModel3DLayerNode = (
  id: string,
  config: Model3DLayerConfig,
  options?: Partial<Omit<Model3DLayerNode, 'type' | 'category' | 'config'>>
): Model3DLayerNode => ({
  id,
  name: '3D Model',
  visible: true,
  expanded: true,
  ...options,
  category: 'object',
  type: 'model3d',
  config,
  processors: options?.processors ?? [],
})

/** @deprecated Use createModel3DLayerNode instead */
export const createObjectLayerNode = createModel3DLayerNode

/**
 * Create an image layer node
 */
export const createImageLayerNode = (
  id: string,
  source: ImageBitmap | string,
  options?: Partial<Omit<ImageLayerNode, 'type' | 'category' | 'source'>>
): ImageLayerNode => ({
  id,
  name: 'Image',
  visible: true,
  expanded: true,
  ...options,
  category: 'object',
  type: 'image',
  source,
  processors: options?.processors ?? [],
})

// ============================================================
// Utility Functions
// ============================================================

/**
 * Category type guards
 */
export const isObjectCategory = (node: LayerNode): node is ObjectCategoryNode =>
  node.category === 'object'

export const isGroupCategory = (node: LayerNode): node is GroupLayerNode =>
  node.category === 'group'

/**
 * Type guards for layer nodes
 */
export const isBaseLayerNode = (node: LayerNode): node is BaseLayerNode =>
  node.type === 'base'

export const isGroupLayerNode = (node: LayerNode): node is GroupLayerNode =>
  node.type === 'group'

export const isSurfaceLayerNode = (node: LayerNode): node is SurfaceLayerNode =>
  node.type === 'surface'

export const isTextLayerNode = (node: LayerNode): node is TextLayerNode =>
  node.type === 'text'

export const isModel3DLayerNode = (node: LayerNode): node is Model3DLayerNode =>
  node.type === 'model3d'

export const isImageLayerNode = (node: LayerNode): node is ImageLayerNode =>
  node.type === 'image'

/** @deprecated Use isModel3DLayerNode instead */
export const isObjectLayerNode = (node: LayerNode): node is Model3DLayerNode =>
  node.type === 'model3d' || (node as { type: string }).type === 'object'

/**
 * Find a layer node by ID (recursive search)
 */
export const findLayerNode = (nodes: LayerNode[], id: string): LayerNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (isGroupLayerNode(node)) {
      const found = findLayerNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Update a layer node by ID (recursive, immutable)
 */
export const updateLayerNode = (
  nodes: LayerNode[],
  id: string,
  updates: Partial<LayerNode>
): LayerNode[] => {
  return nodes.map(node => {
    if (node.id === id) {
      return { ...node, ...updates } as LayerNode
    }
    if (isGroupLayerNode(node)) {
      return {
        ...node,
        children: updateLayerNode(node.children, id, updates),
      }
    }
    return node
  })
}

/**
 * Remove a layer node by ID (recursive, immutable)
 */
export const removeLayerNode = (nodes: LayerNode[], id: string): LayerNode[] => {
  return nodes
    .filter(node => node.id !== id)
    .map(node => {
      if (isGroupLayerNode(node)) {
        return {
          ...node,
          children: removeLayerNode(node.children, id),
        }
      }
      return node
    })
}

/**
 * Flatten layer nodes to a list (for rendering order)
 */
export const flattenLayerNodes = (nodes: LayerNode[]): LayerNode[] => {
  const result: LayerNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (isGroupLayerNode(node)) {
      result.push(...flattenLayerNodes(node.children))
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
  nodes: LayerNode[],
  targetId: string,
  parent: GroupLayerNode | null = null
): GroupLayerNode | null | undefined => {
  for (const node of nodes) {
    if (node.id === targetId) return parent
    if (isGroupLayerNode(node)) {
      const found = findParentNode(node.children, targetId, node)
      if (found !== undefined) return found
    }
  }
  return undefined // Not found in tree
}

/**
 * Check if sourceId is an ancestor of targetId (to prevent circular moves)
 */
export const isAncestorOf = (
  nodes: LayerNode[],
  sourceId: string,
  targetId: string
): boolean => {
  const sourceNode = findLayerNode(nodes, sourceId)
  if (!sourceNode || !isGroupLayerNode(sourceNode)) return false

  const checkDescendants = (children: LayerNode[]): boolean => {
    for (const child of children) {
      if (child.id === targetId) return true
      if (isGroupLayerNode(child) && checkDescendants(child.children)) return true
    }
    return false
  }

  return checkDescendants(sourceNode.children)
}

/**
 * Insert a node at a specific position (before/after target, or into group)
 * Returns new tree (immutable)
 */
export const insertLayerNode = (
  nodes: LayerNode[],
  nodeToInsert: LayerNode,
  targetId: string,
  position: DropPosition
): LayerNode[] => {
  // Handle 'into' position - insert as first child of target group
  if (position === 'into') {
    return nodes.map(node => {
      if (node.id === targetId && isGroupLayerNode(node)) {
        return {
          ...node,
          children: [nodeToInsert, ...node.children],
          expanded: true, // Expand to show the inserted node
        }
      }
      if (isGroupLayerNode(node)) {
        return {
          ...node,
          children: insertLayerNode(node.children, nodeToInsert, targetId, position),
        }
      }
      return node
    })
  }

  // Handle 'before' and 'after' positions
  const result: LayerNode[] = []
  for (const node of nodes) {
    if (node.id === targetId) {
      if (position === 'before') {
        result.push(nodeToInsert, node)
      } else {
        result.push(node, nodeToInsert)
      }
    } else if (isGroupLayerNode(node)) {
      result.push({
        ...node,
        children: insertLayerNode(node.children, nodeToInsert, targetId, position),
      })
    } else {
      result.push(node)
    }
  }

  // If target wasn't found at this level, return as-is
  if (!nodes.some(n => n.id === targetId)) {
    return result
  }

  return result
}

/**
 * Move a layer node from its current position to a new position
 * Combines remove + insert in an immutable way
 */
export const moveLayerNode = (
  nodes: LayerNode[],
  sourceId: string,
  targetId: string,
  position: DropPosition
): LayerNode[] => {
  // Validate: prevent moving to self
  if (sourceId === targetId) return nodes

  // Validate: prevent moving into own descendants
  if (isAncestorOf(nodes, sourceId, targetId)) return nodes

  // Validate: prevent moving base layer
  const sourceNode = findLayerNode(nodes, sourceId)
  if (!sourceNode || sourceNode.type === 'base') return nodes

  // Validate: 'into' position only valid for group targets
  if (position === 'into') {
    const targetNode = findLayerNode(nodes, targetId)
    if (!targetNode || !isGroupLayerNode(targetNode)) return nodes
  }

  // Remove from current position
  const withoutSource = removeLayerNode(nodes, sourceId)

  // Insert at new position
  return insertLayerNode(withoutSource, sourceNode, targetId, position)
}
