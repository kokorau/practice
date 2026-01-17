/**
 * OutputNode Interface
 *
 * An OutputNode is responsible for the final step of the pipeline:
 * outputting a composed texture to the canvas.
 *
 * OutputNodes are the "root" of the compositor graph - they consume
 * a final texture and produce no further output.
 *
 * Examples:
 * - CanvasOutputNode: Draws texture to canvas with alpha blending
 */

import type { BaseNode, NodeContext } from './types'
import type { RenderNode } from './RenderNode'
import type { CompositorNode } from './CompositorNode'

// ============================================================
// OutputNode Interface
// ============================================================

/**
 * A node that outputs a texture to a final destination.
 *
 * OutputNodes are the terminal nodes in the compositor graph.
 * They consume a texture and produce a side effect (drawing to canvas).
 *
 * @example
 * ```typescript
 * const output: OutputNode = new CanvasOutputNode(
 *   'output',
 *   sceneCompositor  // CompositorNode containing all layers
 * )
 *
 * output.output(context)  // Draws to canvas
 * ```
 */
export interface OutputNode extends BaseNode {
  readonly type: 'output'

  /**
   * Input node that provides the final texture to output.
   */
  readonly input: RenderNode | CompositorNode

  /**
   * Output the composed texture to the final destination.
   *
   * @param ctx - Node execution context with renderer, palette, etc.
   */
  output(ctx: NodeContext): void
}

// ============================================================
// OutputNode Options
// ============================================================

/**
 * Options for CanvasOutputNode.
 */
export interface CanvasOutputOptions {
  /**
   * Whether to clear the canvas before drawing.
   * Default: false (allows layered output)
   */
  clear?: boolean
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard to check if a node is an OutputNode.
 */
export function isOutputNode(node: BaseNode): node is OutputNode {
  return node.type === 'output'
}
