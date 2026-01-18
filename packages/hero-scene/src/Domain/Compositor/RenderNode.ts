/**
 * RenderNode Interface
 *
 * A RenderNode is responsible for rendering a single layer or element to a texture.
 * It takes a spec (what to render) and produces a TextureHandle (the result).
 *
 * RenderNodes are the "leaf" nodes in the compositor graph - they generate new
 * texture content rather than combining existing textures.
 *
 * Examples:
 * - SurfaceRenderNode: Renders a pattern/gradient to texture
 * - MaskRenderNode: Renders a greymap mask shape to texture
 * - EffectRenderNode: Applies a post-effect to an input texture
 * - ImageRenderNode: Renders an image to texture
 */

import type { BaseNode, NodeContext, TextureHandle } from './types'

// ============================================================
// RenderNode Interface
// ============================================================

/**
 * A node that renders content to a texture.
 *
 * RenderNodes are pure in the sense that they always produce the same
 * output for the same inputs. They don't maintain internal state between
 * calls (stateless).
 *
 * @example
 * ```typescript
 * const surfaceNode: RenderNode = new SurfaceRenderNode(
 *   'background',
 *   { id: 'stripe', params: { width1: 10, width2: 10 } },
 *   { primary: 'F1', secondary: 'F3' }
 * )
 *
 * const texture = surfaceNode.render(context)
 * ```
 */
export interface RenderNode extends BaseNode {
  readonly type: 'render'

  /**
   * Render content to a texture.
   *
   * @param ctx - Node execution context with renderer, palette, etc.
   * @returns Handle to the rendered texture
   */
  render(ctx: NodeContext): TextureHandle
}

// ============================================================
// RenderNode Input Types
// ============================================================

/**
 * Input for SurfaceRenderNode.
 * Defines a texture pattern with color keys.
 */
export interface SurfaceRenderInput {
  /** Surface configuration (pattern type and params) */
  surface: {
    id: string
    params: Record<string, unknown>
  }

  /** Color keys to resolve from palette */
  colors: {
    primary: string
    secondary: string
  }
}

/**
 * Input for MaskRenderNode.
 * Defines a greymap mask shape.
 */
export interface MaskRenderInput {
  /** Mask shape configuration */
  shape: {
    type: string
    params: Record<string, unknown>
  }

  /** Whether to invert the mask (cutout mode) */
  cutout?: boolean
}

/**
 * Input for EffectRenderNode.
 * Defines a post-effect to apply.
 */
export interface EffectRenderInput {
  /** Input texture to apply effect to */
  inputNode: RenderNode | CompositorNodeLike

  /** Effect configuration */
  effect: {
    id: string
    params: Record<string, unknown>
  }
}

/**
 * Input for ImageRenderNode.
 * Defines an image to render.
 */
export interface ImageRenderInput {
  /** Image source (URL, File, or ImageBitmap) */
  source: string | File | ImageBitmap

  /** Optional positioning */
  position?: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    opacity?: number
  }
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard to check if a node is a RenderNode.
 */
export function isRenderNode(node: BaseNode): node is RenderNode {
  return node.type === 'render'
}

// ============================================================
// Forward Reference (to avoid circular imports)
// ============================================================

/**
 * Minimal CompositorNode interface for RenderNode references.
 * Full interface is in CompositorNode.ts.
 */
export interface CompositorNodeLike extends BaseNode {
  readonly type: 'compositor'
  composite(ctx: NodeContext): TextureHandle
}
