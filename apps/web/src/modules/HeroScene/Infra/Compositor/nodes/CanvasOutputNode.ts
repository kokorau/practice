/**
 * CanvasOutputNode
 *
 * Outputs the final composed texture to the canvas.
 * This is the terminal node in the compositor pipeline.
 */

import type {
  OutputNode,
  RenderNode,
  CompositorNode,
  NodeContext,
  CanvasOutputOptions,
} from '../../../Domain/Compositor'
import { getTextureFromNode } from '../../../Domain/Compositor'

// ============================================================
// CanvasOutputNode Implementation
// ============================================================

/**
 * Configuration for CanvasOutputNode.
 */
export interface CanvasOutputNodeConfig {
  /** Unique node identifier */
  id: string

  /** Input node providing the final texture */
  input: RenderNode | CompositorNode

  /** Output options */
  options?: CanvasOutputOptions
}

/**
 * OutputNode that draws the final composed texture to the canvas.
 *
 * This is the terminal node in the compositor pipeline. It takes
 * the final composed texture from a RenderNode or CompositorNode
 * and draws it to the canvas.
 *
 * @example
 * ```typescript
 * const sceneNode = new OverlayCompositorNode({
 *   id: 'scene',
 *   layers: [backgroundNode, layer1Node, layer2Node]
 * })
 *
 * const outputNode = new CanvasOutputNode({
 *   id: 'output',
 *   input: sceneNode,
 *   options: { clear: true }
 * })
 *
 * outputNode.output(context)  // Draws to canvas
 * ```
 */
export class CanvasOutputNode implements OutputNode {
  readonly type = 'output' as const
  readonly id: string
  readonly input: RenderNode | CompositorNode

  constructor(config: CanvasOutputNodeConfig) {
    this.id = config.id
    this.input = config.input
    // Note: config.options is available for future use (e.g., clear, viewport override)
  }

  /**
   * Output the final texture to the canvas.
   */
  output(ctx: NodeContext): void {
    const { renderer, texturePool } = ctx

    // Get the final texture from the input node
    const textureHandle = getTextureFromNode(this.input, ctx)

    // Composite to the canvas
    renderer.compositeToCanvas(textureHandle._gpuTexture)

    // Release the texture back to the pool
    texturePool.release(textureHandle)
  }
}

/**
 * Factory function to create a CanvasOutputNode.
 */
export function createCanvasOutputNode(
  id: string,
  input: RenderNode | CompositorNode,
  options?: CanvasOutputOptions
): CanvasOutputNode {
  return new CanvasOutputNode({ id, input, options })
}
