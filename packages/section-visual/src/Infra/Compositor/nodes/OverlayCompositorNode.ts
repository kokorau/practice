/**
 * OverlayCompositorNode
 *
 * Overlays multiple layers in order with alpha blending.
 * The first layer is the bottom, subsequent layers are composited on top.
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import { createOverlayBlendSpec } from '@practice/texture'
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
// OverlayCompositorNode Implementation
// ============================================================

/**
 * Configuration for OverlayCompositorNode.
 */
export interface OverlayCompositorNodeConfig {
  /** Unique node identifier */
  id: string

  /** Layers to overlay, in order (first = bottom) */
  layers: ReadonlyArray<RenderNode | CompositorNode>
}

/**
 * CompositorNode that overlays multiple textures in order.
 *
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-compositing unchanged nodes)
 * - Automatic viewport resize handling
 * - Input node dirty propagation
 *
 * Layers are composited from bottom to top using alpha blending.
 * The first layer in the array is the bottom layer, and each
 * subsequent layer is composited on top.
 *
 * Uses standard Porter-Duff alpha compositing.
 *
 * @example
 * ```typescript
 * const bgNode = new SurfaceRenderNode(...)
 * const layer1Node = new MaskCompositorNode(...)
 * const layer2Node = new MaskCompositorNode(...)
 *
 * const scene = new OverlayCompositorNode({
 *   id: 'scene',
 *   layers: [bgNode, layer1Node, layer2Node]
 * })
 *
 * scene.composite(context) // Composites to owned texture
 * const texture = scene.outputTexture // Get the texture
 * ```
 */
export class OverlayCompositorNode extends BaseTextureOwner implements CompositorNode, TextureOwner {
  readonly type = 'compositor' as const
  readonly id: string
  readonly inputs: ReadonlyArray<RenderNode | CompositorNode>

  private readonly layers: ReadonlyArray<RenderNode | CompositorNode>

  constructor(config: OverlayCompositorNodeConfig) {
    super()
    this.id = config.id
    this.layers = config.layers
    this.inputs = config.layers
  }

  /**
   * Check if this node or any layer is dirty.
   * Overrides base isDirty to propagate dirty state from layers.
   */
  get isDirty(): boolean {
    if (this._isDirty) return true

    // Check if any layer is dirty (dirty propagation)
    for (const layer of this.layers) {
      if (isTextureOwner(layer) && layer.isDirty) return true
    }

    return false
  }

  /**
   * Composite all layers in order using alpha blending.
   *
   * Uses TextureOwner caching: skips compositing if not dirty and texture exists.
   */
  composite(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, device, format } = ctx

    if (this.layers.length === 0) {
      throw new Error(`[OverlayCompositorNode] No layers to composite (id: ${this.id})`)
    }

    // Ensure texture exists (handles viewport resize and format)
    this.ensureTexture(device, viewport, format)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Get first layer texture
    const firstLayerHandle = getTextureFromNode(this.layers[0]!, ctx)

    // If only one layer, copy it to our owned texture
    if (this.layers.length === 1) {
      this.copyToOwnedTexture(renderer, firstLayerHandle._gpuTexture, viewport)
      this._isDirty = false
      return this.createTextureHandle(viewport)
    }

    // Create the overlay blend spec
    const blendSpec = createOverlayBlendSpec(viewport)

    // For multi-layer overlay, blend into owned texture
    // First, copy first layer to owned texture
    this.copyToOwnedTexture(renderer, firstLayerHandle._gpuTexture, viewport)

    // Overlay subsequent layers directly onto owned texture
    for (let i = 1; i < this.layers.length; i++) {
      const layerHandle = getTextureFromNode(this.layers[i]!, ctx)

      // Apply overlay blending: owned (base) + layer (overlay) → owned
      // Note: Since we can't read and write to the same texture simultaneously,
      // we need to use a temporary approach. For now, continue using pool.
      const tempResult = renderer.applyDualTextureEffectToOffscreen(
        blendSpec,
        this.outputTexture!,
        layerHandle._gpuTexture,
        0 // Use any available index
      )

      // Copy the result back to owned texture
      this.copyToOwnedTexture(renderer, tempResult, viewport)
    }

    // Mark as clean (cache valid)
    this._isDirty = false

    return this.createTextureHandle(viewport)
  }

  /**
   * Copy a source texture to the owned texture using passthrough shader.
   */
  private copyToOwnedTexture(
    renderer: NodeContext['renderer'],
    sourceTexture: GPUTexture,
    viewport: { width: number; height: number }
  ): void {
    const passthroughSpec = this.createPassthroughSpec(viewport)
    renderer.applyPostEffectToTexture(
      passthroughSpec,
      sourceTexture,
      this.outputTexture!
    )
  }

  /**
   * Create a passthrough shader spec for copying texture.
   */
  private createPassthroughSpec(viewport: { width: number; height: number }): {
    shader: string
    uniforms: ArrayBuffer
    bufferSize: number
  } {
    const passthroughShader = /* wgsl */ `
struct Params {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  return textureSample(inputTexture, inputSampler, uv);
}
`
    const buffer = new ArrayBuffer(16)
    const view = new Float32Array(buffer)
    view[0] = viewport.width
    view[1] = viewport.height
    view[2] = 0 // padding
    view[3] = 0 // padding

    return {
      shader: passthroughShader,
      uniforms: buffer,
      bufferSize: 16,
    }
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
 * Factory function to create an OverlayCompositorNode.
 */
export function createOverlayCompositorNode(
  id: string,
  layers: ReadonlyArray<RenderNode | CompositorNode>
): OverlayCompositorNode {
  return new OverlayCompositorNode({ id, layers })
}
