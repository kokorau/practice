/**
 * CompositorNode Interface
 *
 * A CompositorNode combines multiple textures into a single output texture.
 * It takes one or more input nodes (RenderNode or other CompositorNode) and
 * produces a combined TextureHandle.
 *
 * CompositorNodes form the "branch" nodes in the compositor graph - they
 * combine outputs from other nodes rather than generating new content.
 *
 * Examples:
 * - MaskCompositorNode: Applies a mask texture to a surface texture
 * - OverlayCompositorNode: Overlays multiple layers with alpha blending
 * - EffectChainCompositorNode: Applies a sequence of effects using ping-pong
 */

import type { BaseNode, NodeContext, TextureHandle } from './types'
import type { RenderNode } from './RenderNode'

// ============================================================
// CompositorNode Interface
// ============================================================

/**
 * A node that composes multiple textures into one.
 *
 * CompositorNodes are pure in the sense that they always produce the same
 * output for the same inputs. The composition logic is deterministic.
 *
 * @example
 * ```typescript
 * const maskCompositor: CompositorNode = new MaskCompositorNode(
 *   'layer1-masked',
 *   surfaceNode,  // RenderNode
 *   maskNode      // RenderNode
 * )
 *
 * const texture = maskCompositor.composite(context)
 * ```
 */
export interface CompositorNode extends BaseNode {
  readonly type: 'compositor'

  /**
   * Input nodes that provide textures for composition.
   * Order may matter depending on the compositor type.
   */
  readonly inputs: ReadonlyArray<RenderNode | CompositorNode>

  /**
   * Compose input textures into a single output texture.
   *
   * @param ctx - Node execution context with renderer, palette, etc.
   * @returns Handle to the composited texture
   */
  composite(ctx: NodeContext): TextureHandle
}

// ============================================================
// CompositorNode Input Types
// ============================================================

/**
 * Input for MaskCompositorNode.
 * Combines a surface texture with a mask texture.
 */
export interface MaskCompositorInput {
  /** Node providing the surface texture */
  surfaceNode: RenderNode | CompositorNode

  /** Node providing the mask texture (greymap) */
  maskNode: RenderNode | CompositorNode
}

/**
 * Input for OverlayCompositorNode.
 * Overlays multiple layers in order.
 */
export interface OverlayCompositorInput {
  /** Nodes providing layers to overlay, in order (first = bottom) */
  layers: ReadonlyArray<RenderNode | CompositorNode>

  /** Blend mode for composition */
  blendMode?: BlendMode
}

/**
 * Input for EffectChainCompositorNode.
 * Applies a sequence of effects to an input texture.
 */
export interface EffectChainCompositorInput {
  /** Node providing the input texture */
  inputNode: RenderNode | CompositorNode

  /** Effects to apply in order */
  effects: ReadonlyArray<{
    id: string
    params: Record<string, unknown>
  }>
}

// ============================================================
// Blend Modes
// ============================================================

/**
 * Supported blend modes for overlay composition.
 */
export type BlendMode =
  | 'normal'      // Standard alpha blending
  | 'multiply'    // Darken by multiplying
  | 'screen'      // Lighten by inverse multiply
  | 'overlay'     // Contrast enhancement
  | 'add'         // Additive blending

/**
 * Default blend mode when not specified.
 */
export const DEFAULT_BLEND_MODE: BlendMode = 'normal'

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard to check if a node is a CompositorNode.
 */
export function isCompositorNode(node: BaseNode): node is CompositorNode {
  return node.type === 'compositor'
}

// ============================================================
// Utility Types
// ============================================================

/**
 * Union type for nodes that can be inputs to a CompositorNode.
 */
export type CompositorInput = RenderNode | CompositorNode

/**
 * Helper to get texture from either a RenderNode or CompositorNode.
 */
export function getTextureFromNode(
  node: CompositorInput,
  ctx: NodeContext
): TextureHandle {
  if (node.type === 'render') {
    return node.render(ctx)
  } else {
    return node.composite(ctx)
  }
}
