/**
 * LayerNode Type Definitions
 *
 * Tree-based layer structure for the UI.
 * Supports:
 * - Hierarchical grouping
 * - Processors (effects and masks) attached to layers
 * - Recursive nesting (in implementation layer)
 */

import type { Processor } from './Processor'
import type { TexturePatternSpec } from '@practice/texture'

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
 * 3D Object layer configuration (inline to avoid circular import)
 */
export interface ObjectLayerConfig {
  type: 'object'
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

// ============================================================
// Layer Node Types
// ============================================================

/**
 * Layer node type discriminator
 */
export type LayerNodeType = 'base' | 'group' | 'surface' | 'object' | 'text'

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
}

// ============================================================
// Concrete Layer Node Types
// ============================================================

/**
 * Base layer (background) - always present, cannot be deleted
 * Does not support mask processors (always opaque)
 */
export interface BaseLayerNode extends LayerNodeBase {
  type: 'base'
  /** Surface configuration */
  surface: SurfaceConfig
  /** Processors (effects only, no masks) */
  processors: Processor[]
}

/**
 * Group layer - contains child layers and processors
 */
export interface GroupLayerNode extends LayerNodeBase {
  type: 'group'
  /** Child layer nodes */
  children: LayerNode[]
  /** Processors applied to the entire group (effect + mask) */
  processors: Processor[]
}

/**
 * Surface layer - displays a texture pattern
 */
export interface SurfaceLayerNode extends LayerNodeBase {
  type: 'surface'
  /** Surface configuration */
  surface: SurfaceConfig
  /** Processors (effect + mask) */
  processors: Processor[]
}

/**
 * Object layer - displays a 3D object
 */
export interface ObjectLayerNode extends LayerNodeBase {
  type: 'object'
  /** Object configuration */
  config: ObjectLayerConfig
  /** Processors (effect + mask) */
  processors: Processor[]
}

/**
 * Text layer - displays text
 */
export interface TextLayerNode extends LayerNodeBase {
  type: 'text'
  /** Text configuration */
  config: TextLayerConfig
  /** Processors (effect + mask) */
  processors: Processor[]
}

/**
 * Layer node union type
 */
export type LayerNode =
  | BaseLayerNode
  | GroupLayerNode
  | SurfaceLayerNode
  | ObjectLayerNode
  | TextLayerNode

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
  options?: Partial<Omit<BaseLayerNode, 'type' | 'surface'>>
): BaseLayerNode => ({
  id: 'base',
  name: 'Background',
  visible: true,
  expanded: true,
  ...options,
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
  options?: Partial<Omit<GroupLayerNode, 'type' | 'children'>>
): GroupLayerNode => ({
  id,
  name: 'Group',
  visible: true,
  expanded: false,
  ...options,
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
  options?: Partial<Omit<SurfaceLayerNode, 'type' | 'surface'>>
): SurfaceLayerNode => ({
  id,
  name: 'Surface',
  visible: true,
  expanded: false,
  ...options,
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
  options?: Partial<Omit<TextLayerNode, 'type' | 'config'>>
): TextLayerNode => ({
  id,
  name: `Text: ${config.text.slice(0, 20)}`,
  visible: true,
  expanded: false,
  ...options,
  type: 'text',
  config,
  processors: options?.processors ?? [],
})

/**
 * Create an object layer node
 */
export const createObjectLayerNode = (
  id: string,
  config: ObjectLayerConfig,
  options?: Partial<Omit<ObjectLayerNode, 'type' | 'config'>>
): ObjectLayerNode => ({
  id,
  name: 'Object',
  visible: true,
  expanded: false,
  ...options,
  type: 'object',
  config,
  processors: options?.processors ?? [],
})

// ============================================================
// Utility Functions
// ============================================================

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

export const isObjectLayerNode = (node: LayerNode): node is ObjectLayerNode =>
  node.type === 'object'

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
