/**
 * MaskCompositorNode
 *
 * Combines a surface texture with a greymap mask texture.
 * Uses the two-texture shader to properly alpha-composite the result.
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import { createSurfaceMaskSpec } from '@practice/texture'
import type {
  CompositorNode,
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { isTextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { getTextureFromNode } from '../../../Domain/Compositor'
import { BaseTextureOwner } from '../BaseTextureOwner'

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
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-compositing unchanged nodes)
 * - Automatic viewport resize handling
 * - Input node dirty propagation
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
 * maskedNode.composite(context) // Composites to owned texture
 * const texture = maskedNode.outputTexture // Get the texture
 * ```
 */
export class MaskCompositorNode extends BaseTextureOwner implements CompositorNode, TextureOwner {
  readonly type = 'compositor' as const
  readonly id: string
  readonly inputs: ReadonlyArray<RenderNode | CompositorNode>

  private readonly surfaceNode: RenderNode | CompositorNode
  private readonly maskNode: RenderNode | CompositorNode

  constructor(config: MaskCompositorNodeConfig) {
    super()
    this.id = config.id
    this.surfaceNode = config.surfaceNode
    this.maskNode = config.maskNode
    this.inputs = [config.surfaceNode, config.maskNode]
  }

  /**
   * Check if this node or any input node is dirty.
   * Overrides base isDirty to propagate dirty state from inputs.
   */
  get isDirty(): boolean {
    if (this._isDirty) return true

    // Check if any input is dirty (dirty propagation)
    if (isTextureOwner(this.surfaceNode) && this.surfaceNode.isDirty) return true
    if (isTextureOwner(this.maskNode) && this.maskNode.isDirty) return true

    return false
  }

  /**
   * Composite the surface and mask textures.
   *
   * Uses TextureOwner caching: skips compositing if not dirty and texture exists.
   */
  composite(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, device } = ctx

    // Ensure texture exists (handles viewport resize)
    this.ensureTexture(device, viewport)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Get textures from input nodes (supports both TextureOwner and legacy)
    const surfaceHandle = getTextureFromNode(this.surfaceNode, ctx)
    const maskHandle = getTextureFromNode(this.maskNode, ctx)

    // Create the two-texture blend spec
    const blendSpec = createSurfaceMaskSpec(viewport)

    // Apply the two-texture effect to our owned texture
    renderer.applyDualTextureEffectToTexture(
      blendSpec,
      surfaceHandle._gpuTexture,
      maskHandle._gpuTexture,
      this.outputTexture!
    )

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
 * Factory function to create a MaskCompositorNode.
 */
export function createMaskCompositorNode(
  id: string,
  surfaceNode: RenderNode | CompositorNode,
  maskNode: RenderNode | CompositorNode
): MaskCompositorNode {
  return new MaskCompositorNode({ id, surfaceNode, maskNode })
}
