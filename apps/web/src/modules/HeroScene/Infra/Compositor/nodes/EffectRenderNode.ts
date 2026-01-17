/**
 * EffectRenderNode
 *
 * Applies a post-processing effect to an input texture.
 * Uses the EFFECT_REGISTRY to create shader specs.
 * Implements TextureOwner pattern for per-node texture ownership and caching.
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
import type { EffectType } from '../../../Domain/EffectRegistry'
import { EFFECT_REGISTRY, isValidEffectType } from '../../../Domain/EffectRegistry'
import { BaseTextureOwner } from '../BaseTextureOwner'

// ============================================================
// EffectRenderNode Implementation
// ============================================================

/**
 * Configuration for EffectRenderNode.
 */
export interface EffectRenderNodeConfig {
  /** Unique node identifier */
  id: string

  /** Input node providing the texture to apply effect to */
  inputNode: RenderNode | CompositorNodeLike

  /** Effect type (vignette, chromaticAberration, dotHalftone, lineHalftone, blur) */
  effectType: EffectType

  /** Effect parameters (type-specific) */
  effectParams: Record<string, unknown>
}

/**
 * RenderNode that applies a post-processing effect to an input texture.
 *
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-rendering unchanged nodes)
 * - Automatic viewport resize handling
 *
 * Supports all 5 effect types from EFFECT_REGISTRY:
 * - vignette (with shapes: ellipse, circle, rectangle, linear)
 * - chromaticAberration
 * - dotHalftone
 * - lineHalftone
 * - blur
 *
 * @example
 * ```typescript
 * const node = new EffectRenderNode({
 *   id: 'layer1-vignette',
 *   inputNode: surfaceNode,
 *   effectType: 'vignette',
 *   effectParams: { shape: 'ellipse', intensity: 0.5, radius: 0.8 }
 * })
 *
 * node.render(context) // Renders to owned texture
 * const texture = node.outputTexture // Get the texture
 * ```
 */
export class EffectRenderNode extends BaseTextureOwner implements RenderNode, TextureOwner {
  readonly type = 'render' as const
  readonly id: string

  private readonly inputNode: RenderNode | CompositorNodeLike
  private readonly effectType: EffectType
  private readonly effectParams: Record<string, unknown>

  constructor(config: EffectRenderNodeConfig) {
    super()
    this.id = config.id
    this.inputNode = config.inputNode
    this.effectType = config.effectType
    this.effectParams = config.effectParams

    if (!isValidEffectType(config.effectType)) {
      throw new Error(`[EffectRenderNode] Invalid effect type "${config.effectType}" (id: ${config.id})`)
    }
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
   * Apply the effect to the input texture.
   *
   * Uses TextureOwner caching: skips rendering if not dirty and texture exists.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, scale, device } = ctx

    // Ensure texture exists (handles viewport resize)
    this.ensureTexture(device, viewport)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Get input texture from the input node (supports both TextureOwner and legacy)
    const inputHandle = getTextureFromNode(this.inputNode, ctx)

    // Get the effect definition from registry
    const effectDef = EFFECT_REGISTRY[this.effectType]
    if (!effectDef) {
      throw new Error(`[EffectRenderNode] Effect not found in registry "${this.effectType}" (id: ${this.id})`)
    }

    // Create the shader spec
    const spec = effectDef.createShaderSpec(
      this.effectParams as never,
      viewport,
      scale
    )

    if (!spec) {
      // Effect returned null (possibly disabled or invalid params)
      // Use passthrough shader to copy input to owned texture
      renderer.applyPostEffectToTexture(
        this.createPassthroughSpec(viewport),
        inputHandle._gpuTexture,
        this.outputTexture!
      )
    } else {
      // Apply the effect to the owned texture
      renderer.applyPostEffectToTexture(
        spec,
        inputHandle._gpuTexture,
        this.outputTexture!
      )
    }

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

  /**
   * Create a passthrough shader spec for copying input to output unchanged.
   * Uses the same binding layout as other post-effect shaders.
   */
  private createPassthroughSpec(viewport: { width: number; height: number }): {
    shader: string
    uniforms: ArrayBuffer
    bufferSize: number
  } {
    // Passthrough shader that samples from input texture and outputs unchanged
    // Matches the binding layout used by applyPostEffectToTexture:
    // binding 0 = uniform buffer, binding 1 = sampler, binding 2 = input texture
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
}

/**
 * Factory function to create an EffectRenderNode.
 */
export function createEffectRenderNode(
  id: string,
  inputNode: RenderNode | CompositorNodeLike,
  effectType: EffectType,
  effectParams: Record<string, unknown>
): EffectRenderNode {
  return new EffectRenderNode({
    id,
    inputNode,
    effectType,
    effectParams,
  })
}
