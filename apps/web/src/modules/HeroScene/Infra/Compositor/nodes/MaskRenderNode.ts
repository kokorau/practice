/**
 * MaskRenderNode
 *
 * Renders a greymap mask shape to a texture.
 * Wraps the existing createGreymapMaskSpecFromShape function.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import type { AnyMaskConfig } from '../../../Domain/HeroViewConfig'
import { createGreymapMaskSpecFromShape } from '../../renderHeroConfig'

// ============================================================
// MaskRenderNode Implementation
// ============================================================

/**
 * Configuration for MaskRenderNode.
 */
export interface MaskRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Mask shape configuration */
  shape: AnyMaskConfig
}

/**
 * RenderNode that renders a greymap mask to texture.
 *
 * Supports all 7 mask shape types:
 * - circle, rect, blob, perlin
 * - linearGradient, radialGradient, boxGradient
 *
 * The output is a greymap texture where:
 * - 0.0 = transparent (inner area or cutout)
 * - 1.0 = opaque (outer area or mask fill)
 *
 * This texture is used by MaskCompositorNode to composite
 * a surface with proper alpha blending.
 *
 * @example
 * ```typescript
 * const node = new MaskRenderNode({
 *   id: 'layer1-mask',
 *   shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3 }
 * })
 *
 * const texture = node.render(context)
 * ```
 */
export class MaskRenderNode implements RenderNode {
  readonly type = 'render' as const
  readonly id: string

  private readonly shape: AnyMaskConfig

  constructor(config: MaskRenderNodeConfig) {
    this.id = config.id
    this.shape = config.shape
  }

  /**
   * Render the mask shape to a greymap texture.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, texturePool } = ctx

    // Create the greymap mask spec
    const spec = createGreymapMaskSpecFromShape(this.shape, viewport)

    if (!spec) {
      throw new Error(`[MaskRenderNode] Failed to create mask spec (id: ${this.id})`)
    }

    // Acquire a texture from the pool
    const handle = texturePool.acquire()

    // Render to offscreen texture
    const gpuTexture = renderer.renderToOffscreen(spec, handle._textureIndex)

    // Return a new handle with the actual GPU texture
    return {
      ...handle,
      _gpuTexture: gpuTexture,
    }
  }
}

/**
 * Factory function to create a MaskRenderNode.
 */
export function createMaskRenderNode(
  id: string,
  shape: AnyMaskConfig
): MaskRenderNode {
  return new MaskRenderNode({ id, shape })
}
