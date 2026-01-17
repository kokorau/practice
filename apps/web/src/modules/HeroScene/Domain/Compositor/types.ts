/**
 * Compositor Node System - Core Types
 *
 * Shared types used across RenderNode, CompositorNode, and OutputNode.
 */

import type { Viewport } from '@practice/texture'
import type { PrimitivePalette } from '../../../SemanticColorPalette/Domain'

// ============================================================
// Texture Handle
// ============================================================

/**
 * Abstraction over GPU texture with lifecycle management.
 *
 * This type hides the internal GPUTexture and offscreen index details,
 * allowing nodes to work with textures without managing WebGPU resources directly.
 */
export interface TextureHandle {
  /** Unique identifier for this texture handle */
  readonly id: string

  /** Width in pixels */
  readonly width: number

  /** Height in pixels */
  readonly height: number

  /**
   * Internal GPU texture reference.
   * Prefixed with underscore to indicate internal use only.
   * Access through TexturePool methods when needed.
   */
  readonly _gpuTexture: GPUTexture

  /**
   * Internal offscreen texture index (0 or 1).
   * Used for ping-pong rendering.
   */
  readonly _textureIndex: 0 | 1
}

// ============================================================
// Texture Pool
// ============================================================

/**
 * Manages offscreen texture allocation for ping-pong rendering.
 *
 * The pool abstracts the WebGPU offscreen texture management,
 * hiding the 0/1 index details from node implementations.
 */
export interface TexturePool {
  /**
   * Acquire a texture for rendering.
   * The returned handle can be used as a render target.
   */
  acquire(): TextureHandle

  /**
   * Release a texture back to the pool.
   * The texture may be reused for subsequent operations.
   */
  release(handle: TextureHandle): void

  /**
   * Get the next available texture index for ping-pong rendering.
   * Returns the index that is NOT currently in use.
   */
  getNextIndex(currentIndex: 0 | 1): 0 | 1
}

// ============================================================
// Renderer Interface (Subset)
// ============================================================

/**
 * Minimal renderer interface required by compositor nodes.
 *
 * This is a subset of TextureRendererLike, exposing only the methods
 * needed for node-based compositing. This allows easier mocking in tests.
 */
export interface CompositorRenderer {
  /** Get the current viewport dimensions */
  getViewport(): Viewport

  /** Render a spec to an offscreen texture */
  renderToOffscreen(
    spec: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
    textureIndex: 0 | 1
  ): GPUTexture

  /** Apply a post-effect shader to a texture, output to offscreen */
  applyPostEffectToOffscreen(
    effect: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
    inputTexture: GPUTexture,
    outputTextureIndex: 0 | 1
  ): GPUTexture

  /** Apply a dual-texture effect (e.g., masking) to offscreen */
  applyDualTextureEffectToOffscreen(
    spec: { shader: string; uniforms: ArrayBuffer; bufferSize: number },
    primaryTexture: GPUTexture,
    secondaryTexture: GPUTexture,
    outputTextureIndex: 0 | 1
  ): GPUTexture

  /** Composite an offscreen texture to the canvas */
  compositeToCanvas(
    inputTexture: GPUTexture,
    options?: { clear?: boolean }
  ): void
}

// ============================================================
// Node Context
// ============================================================

/**
 * Context passed to all nodes during pipeline execution.
 *
 * Contains all dependencies needed for rendering:
 * - renderer: WebGPU renderer instance
 * - viewport: Canvas dimensions
 * - palette: Color palette for resolving color keys
 * - scale: Preview scale factor
 * - texturePool: Texture allocation manager
 */
export interface NodeContext {
  /** Renderer for WebGPU operations */
  readonly renderer: CompositorRenderer

  /** Canvas viewport dimensions */
  readonly viewport: Viewport

  /** Color palette for resolving primitive keys */
  readonly palette: PrimitivePalette

  /** Scale factor for preview rendering (1.0 = full size) */
  readonly scale: number

  /** Texture pool for offscreen texture management */
  readonly texturePool: TexturePool
}

// ============================================================
// Node Base Types
// ============================================================

/**
 * Discriminated union tag for node types.
 */
export type NodeType = 'render' | 'compositor' | 'output'

/**
 * Base interface for all pipeline nodes.
 */
export interface BaseNode {
  /** Unique identifier for this node */
  readonly id: string

  /** Discriminated union tag */
  readonly type: NodeType
}

// ============================================================
// Color Types
// ============================================================

/**
 * RGBA color with values in 0-1 range.
 */
export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Color key pair for surface rendering.
 */
export interface ColorKeyPair {
  primary: string
  secondary: string
}
