/**
 * Compositor Nodes - Infrastructure Layer
 *
 * Concrete implementations of RenderNode, CompositorNode, and OutputNode.
 */

// ============================================================
// RenderNode implementations
// ============================================================


export {
  SurfaceRenderNode,
  createSurfaceRenderNode,
  type SurfaceRenderNodeConfig,
} from './SurfaceRenderNode'

export {
  MaskRenderNode,
  createMaskRenderNode,
  type MaskRenderNodeConfig,
} from './MaskRenderNode'

export {
  EffectRenderNode,
  createEffectRenderNode,
  type EffectRenderNodeConfig,
} from './EffectRenderNode'

export {
  ImageRenderNode,
  createImageRenderNode,
  type ImageRenderNodeConfig,
  type ImagePosition,
} from './ImageRenderNode'

// ============================================================
// CompositorNode implementations
// ============================================================

export {
  MaskCompositorNode,
  createMaskCompositorNode,
  type MaskCompositorNodeConfig,
} from './MaskCompositorNode'

export {
  EffectChainCompositorNode,
  createEffectChainCompositorNode,
  type EffectChainCompositorNodeConfig,
  type EffectConfig,
} from './EffectChainCompositorNode'

export {
  OverlayCompositorNode,
  createOverlayCompositorNode,
  type OverlayCompositorNodeConfig,
} from './OverlayCompositorNode'

// ============================================================
// OutputNode implementations
// ============================================================

export {
  CanvasOutputNode,
  createCanvasOutputNode,
  type CanvasOutputNodeConfig,
} from './CanvasOutputNode'
