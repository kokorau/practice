/**
 * Compositor - Infrastructure Layer
 *
 * Concrete implementations of the Compositor Node System.
 */

// TexturePool
export {
  PingPongTexturePool,
  createTexturePool,
} from './TexturePool'

// RenderNode implementations
export {
  // Surface
  SurfaceRenderNode,
  createSurfaceRenderNode,
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
} from './nodes'

// Re-export Domain types for convenience
export type {
  TextureHandle,
  TexturePool,
  NodeContext,
  RenderNode,
  CompositorNode,
  OutputNode,
  ColorKeyPair,
} from '../../Domain/Compositor'
