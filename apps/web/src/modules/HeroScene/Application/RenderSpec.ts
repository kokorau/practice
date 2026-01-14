/**
 * RenderSpec - Rendering specifications derived from SceneNode tree
 *
 * This module provides functions to convert SceneNode[] to RenderSpec[],
 * eliminating the need to store CanvasLayer[] as state.
 *
 * Design:
 * - RenderSpec is a simplified, flat structure for rendering
 * - toRenderSpecs() derives render instructions from SceneNode tree on demand
 * - Supports Layer, Group (recursive), and Processor nodes
 */

import type { TexturePatternSpec } from '@practice/texture'
import type {
  SceneNode,
  Layer,
  Group,
  Processor,
  Surface,
  PatternSurface,
  ImageSurface,
  SolidSurface,
  LayerEffectConfig,
  BlendMode,
  MaskModifier,
} from '../Domain'
import {
  isLayer,
  isGroup,
  isProcessor,
  getProcessorTargets,
} from '../Domain'

// ============================================================
// RenderSpec Types
// ============================================================

/**
 * Base properties for all render specs
 */
export interface RenderSpecBase {
  /** Layer ID for reference */
  id: string
  /** Display name */
  name: string
  /** Whether to render */
  visible: boolean
  /** Opacity (0.0 - 1.0) */
  opacity: number
  /** Blend mode */
  blendMode: BlendMode
  /** Effect filters */
  filters?: LayerEffectConfig
}

/**
 * Texture pattern render spec
 */
export interface TextureRenderSpec extends RenderSpecBase {
  type: 'texture'
  /** Texture pattern specification */
  spec: TexturePatternSpec
}

/**
 * Image render spec
 */
export interface ImageRenderSpec extends RenderSpecBase {
  type: 'image'
  /** Image source */
  source: ImageBitmap | string
}

/**
 * Solid color render spec
 */
export interface SolidRenderSpec extends RenderSpecBase {
  type: 'solid'
  /** Color (CSS color string or palette key) */
  color: string
}

/**
 * Text render spec
 */
export interface TextRenderSpec extends RenderSpecBase {
  type: 'text'
  /** Text content */
  text: string
  /** Font family */
  fontFamily: string
  /** Font size in pixels */
  fontSize: number
  /** Font weight */
  fontWeight: number
  /** Letter spacing in em units */
  letterSpacing: number
  /** Line height multiplier */
  lineHeight: number
  /** Text color */
  color: string
  /** Position */
  position: {
    x: number
    y: number
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  }
  /** Rotation in radians */
  rotation: number
}

/**
 * 3D object render spec
 */
export interface Object3DRenderSpec extends RenderSpecBase {
  type: 'object'
  /** Model URL */
  modelUrl: string
  /** 3D position */
  position: { x: number; y: number; z: number }
  /** 3D rotation in radians */
  rotation: { x: number; y: number; z: number }
  /** Scale */
  scale: number
  /** Material overrides */
  materialOverrides?: {
    color?: string
    metalness?: number
    roughness?: number
  }
}

/**
 * Clip group render spec (for masked rendering)
 */
export interface ClipGroupRenderSpec extends RenderSpecBase {
  type: 'clipGroup'
  /** Child render specs to be masked */
  children: RenderSpec[]
  /** Mask configuration from processor modifiers */
  mask?: {
    shape: unknown // MaskShapeConfig - keeping loose for now
    invert: boolean
    feather: number
  }
}

/**
 * Union of all render spec types
 */
export type RenderSpec =
  | TextureRenderSpec
  | ImageRenderSpec
  | SolidRenderSpec
  | TextRenderSpec
  | Object3DRenderSpec
  | ClipGroupRenderSpec

// ============================================================
// Render Context
// ============================================================

/**
 * Context for rendering conversion
 */
export interface RenderContext {
  /** Viewport dimensions */
  viewport: { width: number; height: number }
  /** Device pixel ratio */
  devicePixelRatio: number
}

// ============================================================
// Conversion Functions
// ============================================================

/**
 * Convert a Surface to render spec properties
 */
const surfaceToRenderProps = (
  surface: Surface
): { type: 'texture'; spec: TexturePatternSpec } | { type: 'image'; source: ImageBitmap | string } | { type: 'solid'; color: string } | null => {
  switch (surface.type) {
    case 'pattern':
      return { type: 'texture', spec: (surface as PatternSurface).spec }
    case 'image':
      return { type: 'image', source: (surface as ImageSurface).source }
    case 'solid':
      return { type: 'solid', color: (surface as SolidSurface).color }
    default:
      return null
  }
}

/**
 * Convert a Layer to RenderSpec
 */
const layerToRenderSpec = (
  layer: Layer,
  _context: RenderContext
): RenderSpec | null => {
  // Skip invisible layers
  if (!layer.visible) return null

  // Base properties
  const base: RenderSpecBase = {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: 1.0, // Layer doesn't have opacity in current design
    blendMode: 'normal',
    filters: layer.filters,
  }

  // Handle text layers
  if (layer.variant === 'text' && layer.textConfig) {
    return {
      ...base,
      type: 'text',
      text: layer.textConfig.text,
      fontFamily: layer.textConfig.fontFamily,
      fontSize: layer.textConfig.fontSize,
      fontWeight: layer.textConfig.fontWeight,
      letterSpacing: layer.textConfig.letterSpacing,
      lineHeight: layer.textConfig.lineHeight,
      color: layer.textConfig.color,
      position: layer.textConfig.position,
      rotation: layer.textConfig.rotation,
    }
  }

  // Handle 3D model layers
  if (layer.variant === 'model3d' && layer.model3dConfig) {
    return {
      ...base,
      type: 'object',
      modelUrl: layer.model3dConfig.modelUrl,
      position: layer.model3dConfig.position,
      rotation: layer.model3dConfig.rotation,
      scale: layer.model3dConfig.scale,
      materialOverrides: layer.model3dConfig.materialOverrides,
    }
  }

  // Handle surface-based layers (base, surface, image)
  if (layer.sources.length === 0) return null

  const firstSource = layer.sources[0]
  if (!firstSource) return null

  const surfaceProps = surfaceToRenderProps(firstSource)
  if (!surfaceProps) return null

  return {
    ...base,
    ...surfaceProps,
  } as RenderSpec
}

/**
 * Convert a Group to RenderSpecs (recursive)
 */
const groupToRenderSpecs = (
  group: Group,
  context: RenderContext
): RenderSpec[] => {
  if (!group.visible) return []

  // Recursively process children
  return toRenderSpecs(group.children, context)
}

/**
 * Apply a Processor to target nodes
 * Returns modified RenderSpecs with mask/effects applied
 */
const processorToRenderSpecs = (
  processor: Processor,
  siblings: SceneNode[],
  processorIndex: number,
  context: RenderContext,
  isRoot: boolean
): RenderSpec[] => {
  if (!processor.visible) return []

  // Get target nodes
  const targets = getProcessorTargets(siblings, processorIndex, isRoot)
  if (targets.length === 0) return []

  // Convert targets to render specs
  const targetSpecs = targets.flatMap((target: SceneNode) => {
    if (isLayer(target)) {
      const spec = layerToRenderSpec(target, context)
      return spec ? [spec] : []
    }
    if (isGroup(target)) {
      return groupToRenderSpecs(target, context)
    }
    return []
  })

  // Find mask modifier (MaskModifier has config.shape/invert/feather)
  const maskModifier = processor.modifiers.find(
    (m): m is MaskModifier => m.type === 'mask' && 'enabled' in m && m.enabled
  )

  if (maskModifier) {
    // Wrap targets in a clip group
    return [{
      id: processor.id,
      name: processor.name,
      visible: true,
      opacity: 1.0,
      blendMode: 'normal',
      type: 'clipGroup',
      children: targetSpecs,
      mask: {
        shape: maskModifier.config.shape,
        invert: maskModifier.config.invert,
        feather: maskModifier.config.feather,
      },
    }]
  }

  // No mask, just return target specs
  return targetSpecs
}

/**
 * Convert SceneNode tree to flat RenderSpec array
 *
 * This is the main entry point for deriving render instructions from SceneNodes.
 * The result can be passed directly to the renderer.
 *
 * @param nodes - Array of SceneNodes (tree structure)
 * @param context - Rendering context (viewport, dpr)
 * @param isRoot - Whether this is the root level (affects processor targeting)
 * @returns Flat array of RenderSpecs for rendering
 */
export const toRenderSpecs = (
  nodes: SceneNode[],
  context: RenderContext,
  isRoot: boolean = true
): RenderSpec[] => {
  const specs: RenderSpec[] = []

  // Pre-calculate all processor targets to avoid processing them as standalone nodes
  const processedIds = new Set<string>()
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node && isProcessor(node)) {
      const targets = getProcessorTargets(nodes, i, isRoot)
      targets.forEach((t: SceneNode) => processedIds.add(t.id))
    }
  }

  // Process nodes, skipping those that are targets of processors
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (!node) continue

    // Skip if this node is a target of a processor (will be rendered by the processor)
    if (processedIds.has(node.id)) continue

    if (isProcessor(node)) {
      // Convert processor with its targets
      const processorSpecs = processorToRenderSpecs(node, nodes, i, context, isRoot)
      specs.push(...processorSpecs)
    } else if (isLayer(node)) {
      const spec = layerToRenderSpec(node, context)
      if (spec) specs.push(spec)
    } else if (isGroup(node)) {
      const groupSpecs = groupToRenderSpecs(node, context)
      specs.push(...groupSpecs)
    }
  }

  return specs
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if a RenderSpec is a texture type
 */
export const isTextureSpec = (spec: RenderSpec): spec is TextureRenderSpec =>
  spec.type === 'texture'

/**
 * Check if a RenderSpec is an image type
 */
export const isImageSpec = (spec: RenderSpec): spec is ImageRenderSpec =>
  spec.type === 'image'

/**
 * Check if a RenderSpec is a solid color type
 */
export const isSolidSpec = (spec: RenderSpec): spec is SolidRenderSpec =>
  spec.type === 'solid'

/**
 * Check if a RenderSpec is a text type
 */
export const isTextSpec = (spec: RenderSpec): spec is TextRenderSpec =>
  spec.type === 'text'

/**
 * Check if a RenderSpec is a 3D object type
 */
export const isObjectSpec = (spec: RenderSpec): spec is Object3DRenderSpec =>
  spec.type === 'object'

/**
 * Check if a RenderSpec is a clip group type
 */
export const isClipGroupSpec = (spec: RenderSpec): spec is ClipGroupRenderSpec =>
  spec.type === 'clipGroup'
