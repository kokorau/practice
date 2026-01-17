/**
 * SurfaceRenderNode
 *
 * Renders a surface pattern (stripe, grid, polkaDot, etc.) to a texture.
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
  ColorKeyPair,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import type { AnySurfaceConfig } from '../../../Domain/HeroViewConfig'
import {
  getColorFromPalette,
  createBackgroundSpecFromSurface,
} from '../../renderHeroConfig'
import { BaseTextureOwner } from '../BaseTextureOwner'

// ============================================================
// SurfaceRenderNode Implementation
// ============================================================

/**
 * Configuration for SurfaceRenderNode.
 */
export interface SurfaceRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Surface configuration (pattern type and params) */
  surface: AnySurfaceConfig

  /** Color keys to resolve from palette */
  colors: ColorKeyPair
}

/**
 * RenderNode that renders a surface pattern to texture.
 *
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-rendering unchanged nodes)
 * - Automatic viewport resize handling
 *
 * Supports all 15 surface pattern types:
 * - solid, stripe, grid, polkaDot, checker
 * - triangle, hexagon, gradientGrain
 * - asanoha, seigaiha, wave, scales, ogee, sunburst
 * - image (not supported in config-based rendering)
 *
 * @example
 * ```typescript
 * const node = new SurfaceRenderNode({
 *   id: 'background',
 *   surface: { type: 'stripe', width1: 10, width2: 10, angle: 45 },
 *   colors: { primary: 'F1', secondary: 'F3' }
 * })
 *
 * node.render(context) // Renders to owned texture
 * const texture = node.outputTexture // Get the texture
 * ```
 */
export class SurfaceRenderNode extends BaseTextureOwner implements RenderNode, TextureOwner {
  readonly type = 'render' as const
  readonly id: string

  private readonly surface: AnySurfaceConfig
  private readonly colors: ColorKeyPair

  constructor(config: SurfaceRenderNodeConfig) {
    super()
    this.id = config.id
    this.surface = config.surface
    this.colors = config.colors
  }

  /**
   * Render the surface pattern to the owned texture.
   *
   * Uses TextureOwner caching: skips rendering if not dirty and texture exists.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, palette, scale, device } = ctx

    // Ensure texture exists (handles viewport resize)
    const texture = this.ensureTexture(device, viewport)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Resolve colors from palette
    const color1 = getColorFromPalette(palette, this.colors.primary)
    const color2 = getColorFromPalette(palette, this.colors.secondary)

    // Create the texture render spec
    const spec = createBackgroundSpecFromSurface(
      this.surface,
      color1,
      color2,
      viewport,
      scale
    )

    if (!spec) {
      throw new Error(`[SurfaceRenderNode] Failed to create surface spec (id: ${this.id})`)
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
 * Factory function to create a SurfaceRenderNode.
 */
export function createSurfaceRenderNode(
  id: string,
  surface: AnySurfaceConfig,
  colors: ColorKeyPair
): SurfaceRenderNode {
  return new SurfaceRenderNode({ id, surface, colors })
}
