/**
 * EffectChainCompositorNode
 *
 * Applies a sequence of effects to an input texture using ping-pong rendering.
 */

import type {
  CompositorNode,
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import { getTextureFromNode } from '../../../Domain/Compositor'
import type { EffectType } from '../../../Domain/EffectRegistry'
import { EFFECT_REGISTRY, isValidEffectType } from '../../../Domain/EffectRegistry'

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
 * Uses ping-pong rendering to apply effects sequentially:
 * 1. Apply effect 1: offscreen[0] → offscreen[1]
 * 2. Apply effect 2: offscreen[1] → offscreen[0]
 * 3. Apply effect 3: offscreen[0] → offscreen[1]
 * ... and so on
 *
 * This ensures each effect reads from the result of the previous effect.
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
 * const texture = effectChain.composite(context)
 * ```
 */
export class EffectChainCompositorNode implements CompositorNode {
  readonly type = 'compositor' as const
  readonly id: string
  readonly inputs: ReadonlyArray<RenderNode | CompositorNode>

  private readonly inputNode: RenderNode | CompositorNode
  private readonly effects: ReadonlyArray<EffectConfig>

  constructor(config: EffectChainCompositorNodeConfig) {
    this.id = config.id
    this.inputNode = config.inputNode
    this.effects = config.effects
    this.inputs = [config.inputNode]
  }

  /**
   * Apply all effects in sequence and return the result.
   */
  composite(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, scale, texturePool } = ctx

    // Get input texture
    let currentHandle = getTextureFromNode(this.inputNode, ctx)

    // If no effects, return input unchanged
    if (this.effects.length === 0) {
      return currentHandle
    }

    // Apply effects in sequence using ping-pong
    for (const effect of this.effects) {
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

      // Get output texture index (ping-pong)
      const outputIndex = texturePool.getNextIndex(currentHandle._textureIndex)

      // Apply effect
      const gpuTexture = renderer.applyPostEffectToOffscreen(
        spec,
        currentHandle._gpuTexture,
        outputIndex
      )

      // Release previous texture
      texturePool.release(currentHandle)

      // Update current handle
      currentHandle = {
        id: `${this.id}-${effect.id}`,
        width: viewport.width,
        height: viewport.height,
        _gpuTexture: gpuTexture,
        _textureIndex: outputIndex,
      }
    }

    return currentHandle
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
