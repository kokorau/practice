/**
 * OverlayCompositorNode
 *
 * Overlays multiple layers in order with alpha blending.
 * The first layer is the bottom, subsequent layers are composited on top.
 */

import { createOverlayBlendSpec } from '@practice/texture'
import type {
  CompositorNode,
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import { getTextureFromNode } from '../../../Domain/Compositor'

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
}

/**
 * CompositorNode that overlays multiple textures in order.
 *
 * Layers are composited from bottom to top using alpha blending.
 * The first layer in the array is the bottom layer, and each
 * subsequent layer is composited on top.
 *
 * Uses standard Porter-Duff alpha compositing.
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
    this.inputs = config.layers
  }

  /**
   * Composite all layers in order using alpha blending.
   */
  composite(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, texturePool } = ctx

    if (this.layers.length === 0) {
      throw new Error(`[OverlayCompositorNode] No layers to composite (id: ${this.id})`)
    }

    // Start with the first layer
    let currentHandle = getTextureFromNode(this.layers[0]!, ctx)

    // If only one layer, return it directly
    if (this.layers.length === 1) {
      return currentHandle
    }

    // Create the overlay blend spec
    const blendSpec = createOverlayBlendSpec(viewport)

    // Overlay subsequent layers using alpha compositing
    for (let i = 1; i < this.layers.length; i++) {
      const layerHandle = getTextureFromNode(this.layers[i]!, ctx)

      // Get output texture index (alternates between 0 and 1)
      const outputIndex = texturePool.getNextIndex(currentHandle._textureIndex)

      // Apply overlay blending: base (current) + overlay (layer) → output
      const gpuTexture = renderer.applyDualTextureEffectToOffscreen(
        blendSpec,
        currentHandle._gpuTexture,
        layerHandle._gpuTexture,
        outputIndex
      )

      // Release input textures
      texturePool.release(currentHandle)
      texturePool.release(layerHandle)

      // Update current handle to the blended result
      currentHandle = {
        id: `${this.id}-blend-${i}`,
        width: viewport.width,
        height: viewport.height,
        _gpuTexture: gpuTexture,
        _textureIndex: outputIndex,
      }
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
  layers: ReadonlyArray<RenderNode | CompositorNode>
): OverlayCompositorNode {
  return new OverlayCompositorNode({ id, layers })
}
