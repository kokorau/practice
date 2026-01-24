/**
 * executePipeline
 *
 * Executes a Compositor Node Graph by traversing from OutputNode.
 * Provides the NodeContext required for all node operations.
 *
 * Note: Color resolution is handled at compile time (via compileHeroView),
 * so palette is not needed at execution time.
 */

import type {
  OutputNode,
  NodeContext,
  CompositorRenderer,
} from '../../Domain/Compositor'
import { createTexturePool } from './TexturePool'

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

  /**
   * Image registry for ImageLayer rendering.
   * Maps imageId to ImageBitmap.
   */
  imageRegistry?: Map<string, ImageBitmap>
}

// ============================================================
// Pipeline Execution
// ============================================================

/**
 * Execute a compositor pipeline
 *
 * This function:
 * 1. Creates the NodeContext with renderer and texture pool
 * 2. Calls outputNode.output(ctx) which triggers the full graph traversal
 *
 * Note: Color resolution is handled at compile time (via compileHeroView),
 * so palette is not needed. All color values in the pipeline are pre-resolved.
 *
 * @param outputNode - Root output node from buildPipeline
 * @param renderer - TextureRenderer-like instance with GPU capabilities
 * @param options - Execution options (scale, etc.)
 */
export function executePipeline(
  outputNode: OutputNode,
  renderer: CompositorRenderer,
  options?: ExecutePipelineOptions
): void {
  const scale = options?.scale ?? 1
  const viewport = renderer.getViewport()
  const device = renderer.getDevice()
  const format = renderer.getFormat()

  // Create texture pool for ping-pong rendering (legacy - will be removed)
  const texturePool = createTexturePool(viewport.width, viewport.height)

  // Build the node execution context (palette no longer needed)
  const ctx: NodeContext = {
    renderer,
    viewport,
    scale,
    texturePool,
    device,
    format,
    imageRegistry: options?.imageRegistry,
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
 * This is a convenience function that combines compileHeroView, buildPipeline,
 * and executePipeline. Use this when you don't need to inspect the pipeline structure.
 *
 * @param config - HeroViewConfig to render
 * @param renderer - TextureRenderer-like instance with GPU capabilities
 * @param palette - PrimitivePalette for color resolution
 * @param options - Execution options (scale, intensityProvider, etc.)
 */
export async function renderWithPipeline(
  config: import('../../Domain/HeroViewConfig').HeroViewConfig,
  renderer: CompositorRenderer,
  palette: import('@practice/semantic-color-palette').PrimitivePalette,
  options?: ExecutePipelineOptions & {
    intensityProvider?: import('../../Application/resolvers/resolvePropertyValue').IntensityProvider
  }
): Promise<void> {
  const { buildPipeline } = await import('./buildPipeline')
  const { compileHeroView } = await import('../../Application/compileHeroView')
  const { isDarkTheme } = await import('../../Domain/ColorHelpers')

  // Compile HeroView to resolve all color keys to RGBA
  const isDark = isDarkTheme(palette)
  const compiled = compileHeroView(config, palette, isDark, {
    intensityProvider: options?.intensityProvider,
  })

  // Build pipeline with pre-compiled layers
  const { outputNode } = buildPipeline(config, {
    isDark,
    intensityProvider: options?.intensityProvider,
    compiledLayers: compiled.layers,
  })

  // Execute pipeline
  executePipeline(outputNode, renderer, options)
}
