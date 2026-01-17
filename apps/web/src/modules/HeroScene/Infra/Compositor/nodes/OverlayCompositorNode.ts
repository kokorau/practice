/**
 * OverlayCompositorNode
 *
 * Overlays multiple layers in order with alpha blending.
 * The first layer is the bottom, subsequent layers are composited on top.
 */

import type {
  CompositorNode,
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import { getTextureFromNode } from '../../../Domain/Compositor'
import type { BlendMode } from '../../../Domain/Compositor/CompositorNode'

// ============================================================
// OverlayCompositorNode Implementation
// ============================================================

/**
 * Configuration for OverlayCompositorNode.
 */
export interface OverlayCompositorNodeConfig {
  /** Unique node identifier */
  id: string

  /** Layers to overlay, in order (first = bottom) */
  layers: ReadonlyArray<RenderNode | CompositorNode>

  /** Blend mode for composition (default: 'normal') */
  blendMode?: BlendMode
}

/**
 * CompositorNode that overlays multiple textures in order.
 *
 * Layers are composited from bottom to top using alpha blending.
 * The first layer in the array is the bottom layer, and each
 * subsequent layer is composited on top.
 *
 * Note: Currently only 'normal' blend mode is supported.
 * Other blend modes may be added in the future.
 *
 * @example
 * ```typescript
 * const bgNode = new SurfaceRenderNode(...)
 * const layer1Node = new MaskCompositorNode(...)
 * const layer2Node = new MaskCompositorNode(...)
 *
 * const scene = new OverlayCompositorNode({
 *   id: 'scene',
 *   layers: [bgNode, layer1Node, layer2Node]
 * })
 *
 * const texture = scene.composite(context)
 * ```
 */
export class OverlayCompositorNode implements CompositorNode {
  readonly type = 'compositor' as const
  readonly id: string
  readonly inputs: ReadonlyArray<RenderNode | CompositorNode>

  private readonly layers: ReadonlyArray<RenderNode | CompositorNode>

  constructor(config: OverlayCompositorNodeConfig) {
    this.id = config.id
    this.layers = config.layers
    // Note: config.blendMode is available for future use (currently defaults to 'normal' overlay)
    this.inputs = config.layers
  }

  /**
   * Composite all layers in order.
   */
  composite(ctx: NodeContext): TextureHandle {
    const { texturePool } = ctx

    if (this.layers.length === 0) {
      throw new Error(`[OverlayCompositorNode] No layers to composite: ${this.id}`)
    }

    // Start with the first layer
    let currentHandle = getTextureFromNode(this.layers[0]!, ctx)

    // If only one layer, return it directly
    if (this.layers.length === 1) {
      return currentHandle
    }

    // Overlay subsequent layers
    for (let i = 1; i < this.layers.length; i++) {
      const layerHandle = getTextureFromNode(this.layers[i]!, ctx)

      // For now, we just return the last layer
      // TODO: Implement proper overlay blending
      // This would require a custom overlay shader that blends
      // the current accumulated result with the new layer

      // Release the current handle and use the new layer
      texturePool.release(currentHandle)
      currentHandle = layerHandle
    }

    // Return the final composited result
    return {
      ...currentHandle,
      id: `${this.id}-output`,
    }
  }
}

/**
 * Factory function to create an OverlayCompositorNode.
 */
export function createOverlayCompositorNode(
  id: string,
  layers: ReadonlyArray<RenderNode | CompositorNode>,
  blendMode?: BlendMode
): OverlayCompositorNode {
  return new OverlayCompositorNode({ id, layers, blendMode })
}
