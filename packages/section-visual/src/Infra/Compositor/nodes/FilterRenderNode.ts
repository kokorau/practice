/**
 * FilterRenderNode
 *
 * Applies color correction filter (exposure, contrast, etc.) to an input texture
 * using 1D LUT lookup. Implements TextureOwner pattern for per-node texture ownership.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
  CompositorNodeLike,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { isTextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { getTextureFromNode } from '../../../Domain/Compositor'
import { BaseTextureOwner } from '../BaseTextureOwner'
import {
  lut1dShader,
  createLut1dUniforms,
  LUT1D_BUFFER_SIZE,
  type Lut1DParams,
} from '@practice/texture/filters'

// ============================================================
// Filter Parameters
// ============================================================

/**
 * Resolved filter parameters (raw values, not PropertyValue)
 */
export interface FilterParams {
  /** Exposure: -2 (dark) to +2 (bright) in EV */
  exposure: number
  /** Brightness: -1 (dark) to +1 (bright) */
  brightness: number
  /** Contrast: -1 (low) to +1 (high) */
  contrast: number
  /** Highlights: -1 (dark) to +1 (bright) */
  highlights: number
  /** Shadows: -1 (dark) to +1 (bright) */
  shadows: number
  /** Temperature: -1 (cool/blue) to +1 (warm/yellow) */
  temperature: number
  /** Tint: -1 (green) to +1 (magenta) */
  tint: number
}

/**
 * LUT provider function type
 * Called during render to generate LUT from filter params
 */
export type LutProvider = (params: FilterParams) => Lut1DParams

// ============================================================
// FilterRenderNode Configuration
// ============================================================

/**
 * Configuration for FilterRenderNode
 */
export interface FilterRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Input node providing the texture to apply filter to */
  inputNode: RenderNode | CompositorNodeLike

  /** Filter parameters (resolved to raw values) */
  filterParams: FilterParams

  /** LUT provider function (generates LUT from params) */
  lutProvider: LutProvider
}

// ============================================================
// FilterRenderNode Implementation
// ============================================================

/**
 * RenderNode that applies color correction filter using 1D LUT lookup.
 *
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-rendering unchanged nodes)
 * - Automatic viewport resize handling
 *
 * @example
 * ```typescript
 * const node = new FilterRenderNode({
 *   id: 'layer1-filter',
 *   inputNode: surfaceNode,
 *   filterParams: { exposure: 0.5, brightness: 0, contrast: 0.2, ... },
 *   lutProvider: (params) => createLutFromFilterParams(params),
 * })
 *
 * node.render(context) // Renders to owned texture
 * const texture = node.outputTexture // Get the texture
 * ```
 */
export class FilterRenderNode extends BaseTextureOwner implements RenderNode, TextureOwner {
  readonly type = 'render' as const
  readonly id: string

  private readonly inputNode: RenderNode | CompositorNodeLike
  private readonly filterParams: FilterParams
  private readonly lutProvider: LutProvider

  constructor(config: FilterRenderNodeConfig) {
    super()
    this.id = config.id
    this.inputNode = config.inputNode
    this.filterParams = config.filterParams
    this.lutProvider = config.lutProvider
  }

  /**
   * Check if this node or the input node is dirty.
   * Overrides base isDirty to propagate dirty state from input.
   */
  get isDirty(): boolean {
    if (this._isDirty) return true

    // Check if input is dirty (dirty propagation)
    if (isTextureOwner(this.inputNode) && this.inputNode.isDirty) return true

    return false
  }

  /**
   * Apply the filter to the input texture.
   *
   * Uses TextureOwner caching: skips rendering if not dirty and texture exists.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, device, format } = ctx

    // Ensure texture exists (handles viewport resize and format)
    this.ensureTexture(device, viewport, format)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Get input texture from the input node (supports both TextureOwner and legacy)
    const inputHandle = getTextureFromNode(this.inputNode, ctx)

    // Generate LUT from filter params
    const lutParams = this.lutProvider(this.filterParams)

    // Create shader spec
    const spec = {
      shader: lut1dShader,
      uniforms: createLut1dUniforms(lutParams, viewport),
      bufferSize: LUT1D_BUFFER_SIZE,
    }

    // Apply the filter to the owned texture
    renderer.applyPostEffectToTexture(
      spec,
      inputHandle._gpuTexture,
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
 * Factory function to create a FilterRenderNode.
 */
export function createFilterRenderNode(
  id: string,
  inputNode: RenderNode | CompositorNodeLike,
  filterParams: FilterParams,
  lutProvider: LutProvider
): FilterRenderNode {
  return new FilterRenderNode({
    id,
    inputNode,
    filterParams,
    lutProvider,
  })
}
