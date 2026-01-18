/**
 * EffectChainCompositorNode
 *
 * Applies a sequence of effects to an input texture using ping-pong rendering.
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import type {
  CompositorNode,
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { isTextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { getTextureFromNode } from '../../../Domain/Compositor'
import type { EffectType } from '../../../Domain/EffectRegistry'
import { EFFECT_REGISTRY, isValidEffectType } from '../../../Domain/EffectRegistry'
import { BaseTextureOwner } from '../BaseTextureOwner'

// ============================================================
// Effect Config Type
// ============================================================

/**
 * Configuration for a single effect in the chain.
 */
export interface EffectConfig {
  /** Effect type ID */
  id: string

  /** Effect parameters (type-specific) */
  params: Record<string, unknown>
}

// ============================================================
// EffectChainCompositorNode Implementation
// ============================================================

/**
 * Configuration for EffectChainCompositorNode.
 */
export interface EffectChainCompositorNodeConfig {
  /** Unique node identifier */
  id: string

  /** Node providing the input texture */
  inputNode: RenderNode | CompositorNode

  /** Effects to apply in order */
  effects: ReadonlyArray<EffectConfig>
}

/**
 * CompositorNode that applies a sequence of effects to an input texture.
 *
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-processing unchanged nodes)
 * - Automatic viewport resize handling
 * - Input node dirty propagation
 *
 * Uses ping-pong rendering to apply effects sequentially:
 * 1. Apply effect 1: input → pool[0]
 * 2. Apply effect 2: pool[0] → pool[1]
 * 3. Apply effect N: pool[...] → owned texture
 *
 * @example
 * ```typescript
 * const inputNode = new SurfaceRenderNode(...)
 *
 * const effectChain = new EffectChainCompositorNode({
 *   id: 'layer1-effects',
 *   inputNode,
 *   effects: [
 *     { id: 'blur', params: { strength: 5 } },
 *     { id: 'vignette', params: { shape: 'ellipse', intensity: 0.5 } }
 *   ]
 * })
 *
 * effectChain.composite(context) // Processes to owned texture
 * const texture = effectChain.outputTexture // Get the texture
 * ```
 */
export class EffectChainCompositorNode extends BaseTextureOwner implements CompositorNode, TextureOwner {
  readonly type = 'compositor' as const
  readonly id: string
  readonly inputs: ReadonlyArray<RenderNode | CompositorNode>

  private readonly inputNode: RenderNode | CompositorNode
  private readonly effects: ReadonlyArray<EffectConfig>

  constructor(config: EffectChainCompositorNodeConfig) {
    super()
    this.id = config.id
    this.inputNode = config.inputNode
    this.effects = config.effects
    this.inputs = [config.inputNode]
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
   * Apply all effects in sequence and return the result.
   *
   * Uses TextureOwner caching: skips processing if not dirty and texture exists.
   */
  composite(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, scale, device, format, texturePool } = ctx

    // Ensure texture exists (handles viewport resize and format)
    this.ensureTexture(device, viewport, format)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Get input texture
    const inputHandle = getTextureFromNode(this.inputNode, ctx)

    // If no effects, copy input to owned texture
    if (this.effects.length === 0) {
      this.copyToOwnedTexture(renderer, inputHandle._gpuTexture, viewport)
      this._isDirty = false
      return this.createTextureHandle(viewport)
    }

    // Apply effects in sequence
    let lastValidSpec: { shader: string; uniforms: ArrayBuffer; bufferSize: number } | null = null
    let currentTexture = inputHandle._gpuTexture
    let currentIndex = inputHandle._textureIndex

    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]!

      // Skip invalid effect types (recoverable: just skip this effect)
      if (!isValidEffectType(effect.id)) {
        console.warn(`[EffectChainCompositorNode] Unknown effect type "${effect.id}", skipping (id: ${this.id})`)
        continue
      }

      const effectType = effect.id as EffectType
      const definition = EFFECT_REGISTRY[effectType]

      // Create shader spec
      const spec = definition.createShaderSpec(
        effect.params as never,
        viewport,
        scale
      )

      if (!spec) {
        // Effect returned null (recoverable: disabled or invalid params, skip)
        console.warn(`[EffectChainCompositorNode] Effect "${effect.id}" returned null spec, skipping (id: ${this.id})`)
        continue
      }

      lastValidSpec = spec

      // For the last effect, output directly to owned texture
      const isLastEffect = i === this.effects.length - 1 ||
        this.effects.slice(i + 1).every(e => !isValidEffectType(e.id))

      if (isLastEffect) {
        // Apply directly to owned texture
        renderer.applyPostEffectToTexture(spec, currentTexture, this.outputTexture!)
      } else {
        // Apply to pool texture (ping-pong)
        const outputIndex = texturePool.getNextIndex(currentIndex)
        const resultTexture = renderer.applyPostEffectToOffscreen(spec, currentTexture, outputIndex)
        currentTexture = resultTexture
        currentIndex = outputIndex
      }
    }

    // If no effects were valid, copy input to owned texture
    if (!lastValidSpec) {
      this.copyToOwnedTexture(renderer, inputHandle._gpuTexture, viewport)
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
 * Factory function to create an EffectChainCompositorNode.
 */
export function createEffectChainCompositorNode(
  id: string,
  inputNode: RenderNode | CompositorNode,
  effects: ReadonlyArray<EffectConfig>
): EffectChainCompositorNode {
  return new EffectChainCompositorNode({ id, inputNode, effects })
}
