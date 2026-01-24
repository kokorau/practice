/**
 * Compositor - Infrastructure Layer
 *
 * Concrete implementations of the Compositor Node System.
 */

// TexturePool
export {
  TripleBufferTexturePool,
  createTexturePool,
} from './TexturePool'

// TextureOwner infrastructure (Node-Owned Texture Architecture)
export { BaseTextureOwner } from './BaseTextureOwner'
export {
  createRenderTexture,
  needsTextureResize,
  DEFAULT_TEXTURE_FORMAT,
} from './TextureFactory'

// RenderNode implementations
export {
  // Surface
  SurfaceRenderNode,
  createSurfaceRenderNode,
  createSurfaceRenderNodeFromCompiled,
  type SurfaceRenderNodeConfig,
  // Mask
  MaskRenderNode,
  createMaskRenderNode,
  type MaskRenderNodeConfig,
  // Effect
  EffectRenderNode,
  createEffectRenderNode,
  type EffectRenderNodeConfig,
  // Image
  ImageRenderNode,
  createImageRenderNode,
  type ImageRenderNodeConfig,
  type ImagePosition,
  // Text
  TextRenderNode,
  createTextRenderNode,
  type TextRenderNodeConfig,
} from './nodes'

// CompositorNode implementations
export {
  // Mask Compositor
  MaskCompositorNode,
  createMaskCompositorNode,
  type MaskCompositorNodeConfig,
  // Effect Chain Compositor
  EffectChainCompositorNode,
  createEffectChainCompositorNode,
  type EffectChainCompositorNodeConfig,
  type EffectConfig,
  // Overlay Compositor
  OverlayCompositorNode,
  createOverlayCompositorNode,
  type OverlayCompositorNodeConfig,
  // Group Compositor
  GroupCompositorNode,
  createGroupCompositorNode,
  type GroupCompositorNodeConfig,
} from './nodes'

// OutputNode implementations
export {
  CanvasOutputNode,
  createCanvasOutputNode,
  type CanvasOutputNodeConfig,
} from './nodes'

// Pipeline Builder
export {
  buildPipeline,
  type PipelineResult,
  type BuildPipelineOptions,
} from './buildPipeline'

// Pipeline Execution
export {
  executePipeline,
  renderWithPipeline,
  type ExecutePipelineOptions,
} from './executePipeline'

// Re-export Domain types for convenience
export type {
  TextureHandle,
  TexturePool,
  NodeContext,
  RenderNode,
  CompositorNode,
  OutputNode,
  ColorKeyPair,
  CompositorRenderer,
} from '../../Domain/Compositor'
