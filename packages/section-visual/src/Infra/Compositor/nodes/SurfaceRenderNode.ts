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
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import type { AnySurfaceConfig } from '../../../Domain/HeroViewConfig'
import type { CompiledSurface } from '../../../Domain/CompiledHeroView'
import type { RGBA } from '@practice/texture'
import { createBackgroundSpecFromSurface } from '../../renderHeroConfig'
import { BaseTextureOwner } from '../BaseTextureOwner'

// ============================================================
// SurfaceRenderNode Implementation
// ============================================================

/**
 * Configuration for SurfaceRenderNode.
 *
 * Requires pre-resolved colors from CompiledHeroView.
 * All color resolution happens at compile time.
 */
export interface SurfaceRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Surface configuration (pattern type and params) */
  surface: AnySurfaceConfig

  /**
   * Pre-resolved colors (from CompiledHeroView).
   * Required - color resolution happens at compile time.
   */
  resolvedColors: { color1: RGBA; color2: RGBA }
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
 *   surface: { type: 'stripe', width1: 10, width2: 10, angle: 45, color1: 'F1', color2: 'F3' }
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
  private readonly resolvedColors: { color1: RGBA; color2: RGBA }

  constructor(config: SurfaceRenderNodeConfig) {
    super()
    this.id = config.id
    this.surface = config.surface
    this.resolvedColors = config.resolvedColors
  }

  /**
   * Render the surface pattern to the owned texture.
   *
   * Uses TextureOwner caching: skips rendering if not dirty and texture exists.
   *
   * Requires resolvedColors to be set (from CompiledHeroView).
   * Color resolution is handled at compile time, not at render time.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, scale, device, format } = ctx

    // Ensure texture exists (handles viewport resize and format)
    const texture = this.ensureTexture(device, viewport, format)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Use pre-resolved colors (from CompiledHeroView)
    const { color1, color2 } = this.resolvedColors

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
 * Factory function to create a SurfaceRenderNode from CompiledSurface.
 *
 * Uses pre-resolved colors from CompiledHeroView.
 * This is the only way to create SurfaceRenderNode - all color resolution
 * must happen at compile time via compileHeroView.
 */
export function createSurfaceRenderNodeFromCompiled(
  id: string,
  compiled: CompiledSurface
): SurfaceRenderNode {
  // CompiledSurface.params are already resolved (number/string/boolean values)
  // Cast to AnySurfaceConfig format - the params will be used as-is
  const surface = {
    id: compiled.id,
    params: compiled.params,
  } as unknown as AnySurfaceConfig

  return new SurfaceRenderNode({
    id,
    surface,
    resolvedColors: { color1: compiled.color1, color2: compiled.color2 },
  })
}
