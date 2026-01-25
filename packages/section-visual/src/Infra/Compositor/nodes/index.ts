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
  createSurfaceRenderNodeFromCompiled,
  type SurfaceRenderNodeConfig,
} from './SurfaceRenderNode'

export {
  MaskRenderNode,
  createMaskRenderNode,
  type MaskRenderNodeConfig,
} from './MaskRenderNode'

export {
  MaskChildrenRenderNode,
  createMaskChildrenRenderNode,
  type MaskChildrenRenderNodeConfig,
} from './MaskChildrenRenderNode'

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

export {
  TextRenderNode,
  createTextRenderNode,
  type TextRenderNodeConfig,
} from './TextRenderNode'

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

export {
  GroupCompositorNode,
  createGroupCompositorNode,
  type GroupCompositorNodeConfig,
} from './GroupCompositorNode'

// ============================================================
// OutputNode implementations
// ============================================================

export {
  CanvasOutputNode,
  createCanvasOutputNode,
  type CanvasOutputNodeConfig,
} from './CanvasOutputNode'
