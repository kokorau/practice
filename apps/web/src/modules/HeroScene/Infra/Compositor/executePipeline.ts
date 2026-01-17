/**
 * executePipeline
 *
 * Executes a Compositor Node Graph by traversing from OutputNode.
 * Provides the NodeContext required for all node operations.
 */

import type { PrimitivePalette } from '../../../SemanticColorPalette/Domain'
import type {
  OutputNode,
  NodeContext,
  CompositorRenderer,
} from '../../Domain/Compositor'
import { createTexturePool } from './TexturePool'
import { DEFAULT_TEXTURE_FORMAT } from './TextureFactory'

// ============================================================
// Execution Options
// ============================================================

/**
 * Options for pipeline execution.
 */
export interface ExecutePipelineOptions {
  /**
   * Parameter scale for preview rendering (default: 1)
   * For thumbnail preview, use ~0.3 to scale texture parameters
   */
  scale?: number
}

// ============================================================
// Pipeline Execution
// ============================================================

/**
 * Execute a compositor pipeline
 *
 * This function:
 * 1. Creates the NodeContext with renderer, palette, and texture pool
 * 2. Calls outputNode.output(ctx) which triggers the full graph traversal
 *
 * @param outputNode - Root output node from buildPipeline
 * @param renderer - TextureRenderer-like instance with GPU capabilities
 * @param palette - PrimitivePalette for color resolution
 * @param options - Execution options (scale, etc.)
 */
export function executePipeline(
  outputNode: OutputNode,
  renderer: CompositorRenderer,
  palette: PrimitivePalette,
  options?: ExecutePipelineOptions
): void {
  const scale = options?.scale ?? 1
  const viewport = renderer.getViewport()
  const device = renderer.getDevice()

  // Create texture pool for ping-pong rendering (legacy - will be removed)
  const texturePool = createTexturePool(viewport.width, viewport.height)

  // Build the node execution context
  const ctx: NodeContext = {
    renderer,
    viewport,
    palette,
    scale,
    texturePool,
    device,
    format: DEFAULT_TEXTURE_FORMAT,
  }

  // Execute the pipeline by calling output on the root node
  // This triggers lazy evaluation: each node pulls from its inputs
  outputNode.output(ctx)
}

// ============================================================
// Convenience Function
// ============================================================

/**
 * Build and execute a pipeline in one call
 *
 * This is a convenience function that combines buildPipeline and executePipeline.
 * Use this when you don't need to inspect the pipeline structure.
 *
 * @param config - HeroViewConfig to render
 * @param renderer - TextureRenderer-like instance with GPU capabilities
 * @param palette - PrimitivePalette for color resolution
 * @param options - Execution options (scale, etc.)
 */
export async function renderWithPipeline(
  config: import('../../Domain/HeroViewConfig').HeroViewConfig,
  renderer: CompositorRenderer,
  palette: PrimitivePalette,
  options?: ExecutePipelineOptions
): Promise<void> {
  const { buildPipeline } = await import('./buildPipeline')

  const { outputNode } = buildPipeline(config, palette)
  executePipeline(outputNode, renderer, palette, options)
}
