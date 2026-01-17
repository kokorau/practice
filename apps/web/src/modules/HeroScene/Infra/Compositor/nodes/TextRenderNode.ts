/**
 * TextRenderNode
 *
 * Renders text to a texture using Canvas 2D API.
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import type { TextLayerNodeConfig } from '../../../Domain/HeroViewConfig'
import { BaseTextureOwner } from '../BaseTextureOwner'

// ============================================================
// TextRenderNode Implementation
// ============================================================

/**
 * Configuration for TextRenderNode.
 */
export interface TextRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Text layer configuration */
  textConfig: TextLayerNodeConfig
}

/**
 * Anchor point for text positioning.
 */
type TextAnchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

/**
 * RenderNode that renders text to texture using Canvas 2D.
 *
 * Uses Canvas 2D API to render text, then copies to WebGPU texture.
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-rendering unchanged nodes)
 * - Automatic viewport resize handling
 *
 * @example
 * ```typescript
 * const node = new TextRenderNode({
 *   id: 'text-layer-1',
 *   textConfig: {
 *     type: 'text',
 *     id: 'text-1',
 *     name: 'Title',
 *     visible: true,
 *     text: 'Hello World',
 *     fontFamily: 'sans-serif',
 *     fontSize: 48,
 *     fontWeight: 700,
 *     letterSpacing: 0,
 *     lineHeight: 1.2,
 *     color: '#ffffff',
 *     position: { x: 0.5, y: 0.5, anchor: 'center' },
 *     rotation: 0,
 *   }
 * })
 *
 * node.render(context) // Renders to owned texture
 * const texture = node.outputTexture // Get the texture
 * ```
 */
export class TextRenderNode extends BaseTextureOwner implements RenderNode, TextureOwner {
  readonly type = 'render' as const
  readonly id: string

  private readonly textConfig: TextLayerNodeConfig
  private canvas: OffscreenCanvas | null = null
  private ctx: OffscreenCanvasRenderingContext2D | null = null

  constructor(config: TextRenderNodeConfig) {
    super()
    this.id = config.id
    this.textConfig = config.textConfig
  }

  /**
   * Render the text to the owned texture.
   *
   * Uses TextureOwner caching: skips rendering if not dirty and texture exists.
   */
  render(ctx: NodeContext): TextureHandle {
    const { viewport, device } = ctx

    // Ensure texture exists (handles viewport resize)
    const texture = this.ensureTexture(device, viewport)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Ensure canvas exists and is correctly sized
    this.ensureCanvas(viewport.width, viewport.height)

    // Render text to canvas
    this.renderTextToCanvas(viewport.width, viewport.height)

    // Copy canvas to GPU texture
    this.copyCanvasToTexture(device, texture)

    // Mark as clean (cache valid)
    this._isDirty = false

    return this.createTextureHandle(viewport)
  }

  /**
   * Ensure offscreen canvas exists with correct dimensions.
   */
  private ensureCanvas(width: number, height: number): void {
    if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas = new OffscreenCanvas(width, height)
      this.ctx = this.canvas.getContext('2d')
    }
  }

  /**
   * Render text to the offscreen canvas.
   */
  private renderTextToCanvas(width: number, height: number): void {
    if (!this.ctx || !this.canvas) return

    const config = this.textConfig
    const ctx2d = this.ctx

    // Clear canvas with transparent background
    ctx2d.clearRect(0, 0, width, height)

    // Set up font
    const fontWeight = config.fontWeight || 400
    const fontSize = config.fontSize || 48
    const fontFamily = config.fontFamily || 'sans-serif'
    ctx2d.font = `${fontWeight} ${fontSize}px ${fontFamily}`

    // Set color
    ctx2d.fillStyle = config.color || '#ffffff'

    // Calculate position based on anchor
    const position = config.position || { x: 0.5, y: 0.5, anchor: 'center' }
    const anchor = (position.anchor || 'center') as TextAnchor

    // Convert normalized coordinates to pixels
    const baseX = position.x * width
    const baseY = position.y * height

    // Set text alignment based on anchor
    const [verticalAnchor, horizontalAnchor] = this.parseAnchor(anchor)
    ctx2d.textAlign = horizontalAnchor
    ctx2d.textBaseline = verticalAnchor

    // Apply letter spacing if supported
    if (config.letterSpacing && 'letterSpacing' in ctx2d) {
      (ctx2d as unknown as { letterSpacing: string }).letterSpacing = `${config.letterSpacing}em`
    }

    // Handle rotation
    if (config.rotation) {
      ctx2d.save()
      ctx2d.translate(baseX, baseY)
      ctx2d.rotate((config.rotation * Math.PI) / 180)
      this.renderMultilineText(ctx2d, config.text, 0, 0, config.lineHeight || 1.2, fontSize)
      ctx2d.restore()
    } else {
      this.renderMultilineText(ctx2d, config.text, baseX, baseY, config.lineHeight || 1.2, fontSize)
    }
  }

  /**
   * Parse anchor string into vertical and horizontal components.
   */
  private parseAnchor(anchor: TextAnchor): [CanvasTextBaseline, CanvasTextAlign] {
    const parts = anchor.split('-')

    let vertical: CanvasTextBaseline = 'middle'
    let horizontal: CanvasTextAlign = 'center'

    if (parts.length === 1) {
      // Single value like 'center'
      if (parts[0] === 'center') {
        return ['middle', 'center']
      }
    } else if (parts.length === 2) {
      // Two values like 'top-left'
      const [v, h] = parts

      switch (v) {
        case 'top': vertical = 'top'; break
        case 'center': case 'middle': vertical = 'middle'; break
        case 'bottom': vertical = 'bottom'; break
      }

      switch (h) {
        case 'left': horizontal = 'left'; break
        case 'center': horizontal = 'center'; break
        case 'right': horizontal = 'right'; break
      }
    }

    return [vertical, horizontal]
  }

  /**
   * Render multiline text with proper line height.
   */
  private renderMultilineText(
    ctx2d: OffscreenCanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    lineHeight: number,
    fontSize: number
  ): void {
    const lines = text.split('\n')
    const lineHeightPx = fontSize * lineHeight

    // Adjust y position based on number of lines and text baseline
    const totalHeight = (lines.length - 1) * lineHeightPx
    let startY = y

    if (ctx2d.textBaseline === 'middle') {
      startY = y - totalHeight / 2
    } else if (ctx2d.textBaseline === 'bottom') {
      startY = y - totalHeight
    }

    for (let i = 0; i < lines.length; i++) {
      ctx2d.fillText(lines[i]!, x, startY + i * lineHeightPx)
    }
  }

  /**
   * Copy canvas content to GPU texture.
   */
  private copyCanvasToTexture(device: GPUDevice, texture: GPUTexture): void {
    if (!this.canvas) return

    device.queue.copyExternalImageToTexture(
      { source: this.canvas },
      { texture },
      { width: this.canvas.width, height: this.canvas.height }
    )
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

  /**
   * Release resources.
   */
  override dispose(): void {
    super.dispose()
    this.canvas = null
    this.ctx = null
  }
}

/**
 * Factory function to create a TextRenderNode.
 */
export function createTextRenderNode(
  id: string,
  textConfig: TextLayerNodeConfig
): TextRenderNode {
  return new TextRenderNode({ id, textConfig })
}
