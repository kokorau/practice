/**
 * Compositor Node System - Domain Layer
 *
 * This module defines the core types and interfaces for the node-based
 * compositing system. It provides:
 *
 * - TextureHandle: Abstraction over GPU textures
 * - RenderNode: Single layer rendering interface
 * - CompositorNode: Texture composition interface
 * - OutputNode: Final canvas output interface
 * - NodeContext: Execution context for all nodes
 *
 * The actual implementations are in the Infra layer.
 *
 * @example
 * ```typescript
 * import {
 *   type RenderNode,
 *   type CompositorNode,
 *   type OutputNode,
 *   type NodeContext,
 *   isRenderNode,
 *   isCompositorNode,
 *   getTextureFromNode
 * } from './Compositor'
 * ```
 */

// Core types
export type {
  TextureHandle,
  TexturePool,
  CompositorRenderer,
  NodeContext,
  NodeType,
  BaseNode,
  RGBA,
  ColorKeyPair,
} from './types'

// TextureOwner (Node-Owned Texture Architecture)
export type { TextureOwner } from './TextureOwner'
export { isTextureOwner } from './TextureOwner'

// RenderNode
export type {
  RenderNode,
  SurfaceRenderInput,
  MaskRenderInput,
  EffectRenderInput,
  ImageRenderInput,
  CompositorNodeLike,
} from './RenderNode'

export { isRenderNode } from './RenderNode'

// CompositorNode
export type {
  CompositorNode,
  MaskCompositorInput,
  OverlayCompositorInput,
  EffectChainCompositorInput,
  BlendMode,
  CompositorInput,
} from './CompositorNode'

export {
  isCompositorNode,
  getTextureFromNode,
  DEFAULT_BLEND_MODE,
} from './CompositorNode'

// OutputNode
export type {
  OutputNode,
  CanvasOutputOptions,
} from './OutputNode'

export { isOutputNode } from './OutputNode'

// ============================================================
// Union Types
// ============================================================

import type { RenderNode } from './RenderNode'
import type { CompositorNode } from './CompositorNode'
import type { OutputNode } from './OutputNode'

/**
 * Any node in the compositor pipeline.
 */
export type PipelineNode = RenderNode | CompositorNode | OutputNode

/**
 * Nodes that produce textures (can be inputs to other nodes).
 */
export type TextureProducingNode = RenderNode | CompositorNode
