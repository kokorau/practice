/**
 * SurfaceRenderNode
 *
 * Renders a surface pattern (stripe, grid, polkaDot, etc.) to a texture.
 * Wraps the existing createBackgroundSpecFromSurface function.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
  ColorKeyPair,
} from '../../../Domain/Compositor'
import type { AnySurfaceConfig } from '../../../Domain/HeroViewConfig'
import {
  getColorFromPalette,
  createBackgroundSpecFromSurface,
} from '../../renderHeroConfig'

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
 * const texture = node.render(context)
 * ```
 */
export class SurfaceRenderNode implements RenderNode {
  readonly type = 'render' as const
  readonly id: string

  private readonly surface: AnySurfaceConfig
  private readonly colors: ColorKeyPair

  constructor(config: SurfaceRenderNodeConfig) {
    this.id = config.id
    this.surface = config.surface
    this.colors = config.colors
  }

  /**
   * Render the surface pattern to a texture.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, palette, scale, texturePool } = ctx

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
      throw new Error(`Failed to create surface spec for node: ${this.id}`)
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
 * Factory function to create a SurfaceRenderNode.
 */
export function createSurfaceRenderNode(
  id: string,
  surface: AnySurfaceConfig,
  colors: ColorKeyPair
): SurfaceRenderNode {
  return new SurfaceRenderNode({ id, surface, colors })
}
