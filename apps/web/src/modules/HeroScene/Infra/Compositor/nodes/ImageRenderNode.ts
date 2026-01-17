/**
 * ImageRenderNode
 *
 * Renders an image to a texture.
 * Supports both cover-fit and positioned rendering modes.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'

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

  /** Image source (ImageBitmap, HTMLImageElement, or image URL) */
  source: ImageBitmap | HTMLImageElement | string

  /**
   * Optional position configuration.
   * If not provided, image is rendered with cover-fit.
   */
  position?: ImagePosition
}

/**
 * RenderNode that renders an image to texture.
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
 *   source: imageBitmap
 * })
 *
 * // Positioned mode
 * const positionedNode = new ImageRenderNode({
 *   id: 'overlay-image',
 *   source: imageBitmap,
 *   position: { x: 0.5, y: 0.5, width: 0.3, height: 0.3, rotation: 0.1 }
 * })
 * ```
 */
export class ImageRenderNode implements RenderNode {
  readonly type = 'render' as const
  readonly id: string

  private readonly source: ImageBitmap | HTMLImageElement | string
  private readonly position?: ImagePosition

  constructor(config: ImageRenderNodeConfig) {
    this.id = config.id
    this.source = config.source
    this.position = config.position
  }

  /**
   * Render the image to a texture.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, texturePool } = ctx

    // Acquire a texture from the pool
    const handle = texturePool.acquire()

    // Get the actual image source
    // Note: String URLs need to be loaded asynchronously before rendering
    // For now, we only support ImageBitmap and HTMLImageElement
    if (typeof this.source === 'string') {
      throw new Error(
        `ImageRenderNode: String URLs are not supported. ` +
        `Load the image first and pass ImageBitmap or HTMLImageElement.`
      )
    }

    // Use the extended renderer interface for image rendering
    // This requires the renderer to implement image rendering methods
    const extendedRenderer = renderer as ExtendedCompositorRenderer

    if (!extendedRenderer.renderImageToOffscreen) {
      throw new Error(
        `ImageRenderNode: Renderer does not support image rendering. ` +
        `Make sure the renderer implements renderImageToOffscreen.`
      )
    }

    let gpuTexture: GPUTexture

    if (this.position) {
      // Positioned rendering
      if (!extendedRenderer.renderPositionedImageToOffscreen) {
        throw new Error(
          `ImageRenderNode: Renderer does not support positioned image rendering.`
        )
      }

      gpuTexture = extendedRenderer.renderPositionedImageToOffscreen(
        this.source,
        {
          x: this.position.x * viewport.width,
          y: this.position.y * viewport.height,
          width: this.position.width * viewport.width,
          height: this.position.height * viewport.height,
          rotation: this.position.rotation ?? 0,
          opacity: this.position.opacity ?? 1,
        },
        handle._textureIndex
      )
    } else {
      // Cover-fit rendering
      gpuTexture = extendedRenderer.renderImageToOffscreen(
        this.source,
        handle._textureIndex
      )
    }

    // Return a new handle with the actual GPU texture
    return {
      ...handle,
      _gpuTexture: gpuTexture,
    }
  }
}

/**
 * Extended renderer interface with image rendering support.
 * This extends CompositorRenderer with additional methods for images.
 */
interface ExtendedCompositorRenderer {
  renderImageToOffscreen?(
    source: ImageBitmap | HTMLImageElement,
    textureIndex: number
  ): GPUTexture

  renderPositionedImageToOffscreen?(
    source: ImageBitmap | HTMLImageElement,
    position: {
      x: number
      y: number
      width: number
      height: number
      rotation: number
      opacity: number
    },
    textureIndex: number
  ): GPUTexture
}

/**
 * Factory function to create an ImageRenderNode.
 */
export function createImageRenderNode(
  id: string,
  source: ImageBitmap | HTMLImageElement,
  position?: ImagePosition
): ImageRenderNode {
  return new ImageRenderNode({ id, source, position })
}
