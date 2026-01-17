/**
 * MaskCompositorNode
 *
 * Combines a surface texture with a greymap mask texture.
 * Uses the two-texture shader to properly alpha-composite the result.
 */

import { createSurfaceMaskSpec } from '@practice/texture'
import type {
  CompositorNode,
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import { getTextureFromNode } from '../../../Domain/Compositor'

// ============================================================
// MaskCompositorNode Implementation
// ============================================================

/**
 * Configuration for MaskCompositorNode.
 */
export interface MaskCompositorNodeConfig {
  /** Unique node identifier */
  id: string

  /** Node providing the surface texture */
  surfaceNode: RenderNode | CompositorNode

  /** Node providing the mask texture (greymap) */
  maskNode: RenderNode | CompositorNode
}

/**
 * CompositorNode that combines a surface texture with a greymap mask.
 *
 * The mask texture should contain greymap values where:
 * - 0.0 = transparent (inner area)
 * - 1.0 = opaque (outer area)
 *
 * The compositor uses a two-texture shader to properly blend
 * the surface with the mask, preserving alpha for later composition.
 *
 * @example
 * ```typescript
 * const surfaceNode = new SurfaceRenderNode(...)
 * const maskNode = new MaskRenderNode(...)
 *
 * const maskedNode = new MaskCompositorNode({
 *   id: 'layer1-masked',
 *   surfaceNode,
 *   maskNode
 * })
 *
 * const texture = maskedNode.composite(context)
 * ```
 */
export class MaskCompositorNode implements CompositorNode {
  readonly type = 'compositor' as const
  readonly id: string
  readonly inputs: ReadonlyArray<RenderNode | CompositorNode>

  private readonly surfaceNode: RenderNode | CompositorNode
  private readonly maskNode: RenderNode | CompositorNode

  constructor(config: MaskCompositorNodeConfig) {
    this.id = config.id
    this.surfaceNode = config.surfaceNode
    this.maskNode = config.maskNode
    this.inputs = [config.surfaceNode, config.maskNode]
  }

  /**
   * Composite the surface and mask textures.
   */
  composite(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, texturePool } = ctx

    // Get textures from input nodes
    const surfaceHandle = getTextureFromNode(this.surfaceNode, ctx)
    const maskHandle = getTextureFromNode(this.maskNode, ctx)

    // Create the two-texture blend spec
    const blendSpec = createSurfaceMaskSpec(viewport)

    // Get output texture index that differs from both inputs.
    // With multi-buffer pool, we can always find an index different from both.
    let outputIndex = texturePool.getNextIndex(surfaceHandle._textureIndex)
    if (outputIndex === maskHandle._textureIndex) {
      outputIndex = texturePool.getNextIndex(outputIndex)
    }

    // Apply the two-texture effect to offscreen
    const gpuTexture = renderer.applyDualTextureEffectToOffscreen(
      blendSpec,
      surfaceHandle._gpuTexture,
      maskHandle._gpuTexture,
      outputIndex
    )

    // Release input textures
    texturePool.release(surfaceHandle)
    texturePool.release(maskHandle)

    // Return new handle
    return {
      id: `${this.id}-output`,
      width: viewport.width,
      height: viewport.height,
      _gpuTexture: gpuTexture,
      _textureIndex: outputIndex,
    }
  }
}

/**
 * Factory function to create a MaskCompositorNode.
 */
export function createMaskCompositorNode(
  id: string,
  surfaceNode: RenderNode | CompositorNode,
  maskNode: RenderNode | CompositorNode
): MaskCompositorNode {
  return new MaskCompositorNode({ id, surfaceNode, maskNode })
}
