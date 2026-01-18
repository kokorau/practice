/**
 * ImageRenderNode
 *
 * Renders an image to a texture using the TextureOwner pattern.
 * Supports both cover-fit and positioned rendering modes.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { BaseTextureOwner } from '../BaseTextureOwner'

// ============================================================
// Image Position Types
// ============================================================

/**
 * Position configuration for positioned image rendering.
 */
export interface ImagePosition {
  /** X coordinate (normalized 0-1 or pixel value depending on mode) */
  x: number
  /** Y coordinate (normalized 0-1 or pixel value depending on mode) */
  y: number
  /** Width (normalized 0-1 or pixel value) */
  width: number
  /** Height (normalized 0-1 or pixel value) */
  height: number
  /** Rotation angle in radians */
  rotation?: number
  /** Opacity (0-1) */
  opacity?: number
}

// ============================================================
// ImageRenderNode Implementation
// ============================================================

/**
 * Configuration for ImageRenderNode.
 */
export interface ImageRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Image ID for lookup in imageRegistry */
  imageId: string

  /** Fit mode: 'cover' fills viewport, 'positioned' uses explicit coordinates */
  mode: 'cover' | 'positioned'

  /**
   * Optional position configuration.
   * Only used when mode is 'positioned'.
   */
  position?: ImagePosition
}

/**
 * RenderNode that renders an image to texture using TextureOwner pattern.
 *
 * Supports two rendering modes:
 * - Cover-fit: Image fills the viewport maintaining aspect ratio (default)
 * - Positioned: Image placed at specific coordinates with size and rotation
 *
 * @example
 * ```typescript
 * // Cover-fit mode
 * const coverNode = new ImageRenderNode({
 *   id: 'background-image',
 *   imageId: 'image-123',
 *   mode: 'cover'
 * })
 *
 * // Positioned mode
 * const positionedNode = new ImageRenderNode({
 *   id: 'overlay-image',
 *   imageId: 'image-456',
 *   mode: 'positioned',
 *   position: { x: 0.5, y: 0.5, width: 0.3, height: 0.3, rotation: 0.1 }
 * })
 * ```
 */
export class ImageRenderNode extends BaseTextureOwner implements RenderNode, TextureOwner {
  readonly type = 'render' as const
  readonly id: string

  private readonly imageId: string
  private readonly mode: 'cover' | 'positioned'
  private readonly position?: ImagePosition

  constructor(config: ImageRenderNodeConfig) {
    super()
    this.id = config.id
    this.imageId = config.imageId
    this.mode = config.mode
    this.position = config.position
  }

  /**
   * Render the image to a texture.
   */
  render(ctx: NodeContext): TextureHandle {
    const { viewport, imageRegistry } = ctx

    // Ensure texture exists
    const texture = this.ensureTexture(ctx.device, viewport, ctx.format)

    // Get image from registry
    const source = imageRegistry?.get(this.imageId)

    // If no image source or not dirty, return cached texture
    if (!source) {
      // No image available - return empty texture handle
      return this.createTextureHandle(viewport)
    }

    if (!this.isDirty) {
      // Cache hit - return existing texture
      return this.createTextureHandle(viewport)
    }

    // Check if renderer supports image rendering
    const renderer = ctx.renderer
    if (!renderer.renderImageToTexture) {
      console.warn(
        `[ImageRenderNode] Renderer does not support image rendering (id: ${this.id}). ` +
        `Returning empty texture.`
      )
      this._isDirty = false
      return this.createTextureHandle(viewport)
    }

    if (this.mode === 'positioned' && this.position) {
      // Positioned rendering
      if (!renderer.renderPositionedImageToTexture) {
        console.warn(
          `[ImageRenderNode] Renderer does not support positioned image rendering (id: ${this.id}). ` +
          `Falling back to cover-fit mode.`
        )
        renderer.renderImageToTexture(source, texture)
      } else {
        renderer.renderPositionedImageToTexture(
          source,
          {
            x: this.position.x * viewport.width,
            y: this.position.y * viewport.height,
            width: this.position.width * viewport.width,
            height: this.position.height * viewport.height,
            rotation: this.position.rotation ?? 0,
            opacity: this.position.opacity ?? 1,
          },
          texture
        )
      }
    } else {
      // Cover-fit rendering
      renderer.renderImageToTexture(source, texture)
    }

    this._isDirty = false
    return this.createTextureHandle(viewport)
  }

  /**
   * Create a TextureHandle from the owned texture.
   */
  private createTextureHandle(viewport: { width: number; height: number }): TextureHandle {
    return {
      id: `${this.id}-texture`,
      width: viewport.width,
      height: viewport.height,
      _gpuTexture: this._outputTexture!,
      _textureIndex: -1, // Not using texture pool
    }
  }
}

/**
 * Factory function to create an ImageRenderNode.
 */
export function createImageRenderNode(
  id: string,
  imageId: string,
  mode: 'cover' | 'positioned' = 'cover',
  position?: ImagePosition
): ImageRenderNode {
  return new ImageRenderNode({ id, imageId, mode, position })
}
