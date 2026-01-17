/**
 * MaskRenderNode
 *
 * Renders a greymap mask shape to a texture.
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import type { AnyMaskConfig } from '../../../Domain/HeroViewConfig'
import { createGreymapMaskSpecFromShape } from '../../renderHeroConfig'
import { BaseTextureOwner } from '../BaseTextureOwner'

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
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-rendering unchanged nodes)
 * - Automatic viewport resize handling
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
 * node.render(context) // Renders to owned texture
 * const texture = node.outputTexture // Get the texture
 * ```
 */
export class MaskRenderNode extends BaseTextureOwner implements RenderNode, TextureOwner {
  readonly type = 'render' as const
  readonly id: string

  private readonly shape: AnyMaskConfig

  constructor(config: MaskRenderNodeConfig) {
    super()
    this.id = config.id
    this.shape = config.shape
  }

  /**
   * Render the mask shape to the owned greymap texture.
   *
   * Uses TextureOwner caching: skips rendering if not dirty and texture exists.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, device, format } = ctx

    // Ensure texture exists (handles viewport resize and format)
    const texture = this.ensureTexture(device, viewport, format)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Create the greymap mask spec
    const spec = createGreymapMaskSpecFromShape(this.shape, viewport)

    if (!spec) {
      throw new Error(`[MaskRenderNode] Failed to create mask spec (id: ${this.id})`)
    }

    // Render directly to our owned texture
    renderer.renderToTexture(spec, texture)

    // Mark as clean (cache valid)
    this._isDirty = false

    return this.createTextureHandle(viewport)
  }

  /**
   * Create a TextureHandle for compatibility with legacy code.
   */
  private createTextureHandle(viewport: { width: number; height: number }): TextureHandle {
    return {
      id: `${this.id}-owned`,
      width: viewport.width,
      height: viewport.height,
      _gpuTexture: this.outputTexture!,
      _textureIndex: -1, // Not used in TextureOwner pattern
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
