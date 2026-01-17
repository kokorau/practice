/**
 * EffectRenderNode
 *
 * Applies a post-processing effect to an input texture.
 * Uses the EFFECT_REGISTRY to create shader specs.
 */

import type {
  RenderNode,
  NodeContext,
  TextureHandle,
  CompositorNodeLike,
} from '../../../Domain/Compositor'
import { isRenderNode } from '../../../Domain/Compositor'
import type { EffectType } from '../../../Domain/EffectRegistry'
import { EFFECT_REGISTRY, isValidEffectType } from '../../../Domain/EffectRegistry'

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
 * const texture = node.render(context)
 * ```
 */
export class EffectRenderNode implements RenderNode {
  readonly type = 'render' as const
  readonly id: string

  private readonly inputNode: RenderNode | CompositorNodeLike
  private readonly effectType: EffectType
  private readonly effectParams: Record<string, unknown>

  constructor(config: EffectRenderNodeConfig) {
    this.id = config.id
    this.inputNode = config.inputNode
    this.effectType = config.effectType
    this.effectParams = config.effectParams

    if (!isValidEffectType(config.effectType)) {
      throw new Error(`[EffectRenderNode] Invalid effect type "${config.effectType}" (id: ${config.id})`)
    }
  }

  /**
   * Apply the effect to the input texture.
   */
  render(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, scale, texturePool } = ctx

    // Get input texture from the input node
    const inputHandle = isRenderNode(this.inputNode)
      ? this.inputNode.render(ctx)
      : this.inputNode.composite(ctx)

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
      // Return input texture unchanged
      return inputHandle
    }

    // Get the next texture index for ping-pong rendering
    const outputIndex = texturePool.getNextIndex(inputHandle._textureIndex)

    // Apply the effect
    const gpuTexture = renderer.applyPostEffectToOffscreen(
      spec,
      inputHandle._gpuTexture,
      outputIndex
    )

    // Release the input texture back to the pool
    texturePool.release(inputHandle)

    // Return a new handle with the output texture
    return {
      id: `${this.id}-output`,
      width: viewport.width,
      height: viewport.height,
      _gpuTexture: gpuTexture,
      _textureIndex: outputIndex,
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
