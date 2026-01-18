/**
 * BaseTextureOwner - Abstract base class for texture-owning nodes
 *
 * Provides common implementation for TextureOwner interface,
 * handling texture lifecycle, viewport change detection, and dirty tracking.
 *
 * @see https://github.com/anthropics/practice-beta/issues/463
 */

import type { Viewport } from '@practice/texture'
import type { TextureOwner } from '../../Domain/Compositor/TextureOwner'
import {
  createRenderTexture,
  needsTextureResize,
  DEFAULT_TEXTURE_FORMAT,
} from './TextureFactory'

/**
 * Abstract base class providing TextureOwner implementation.
 *
 * Subclasses should:
 * 1. Call `ensureTexture()` at the start of render/composite
 * 2. Set `_isDirty = false` after successful rendering
 * 3. Call `invalidate()` when input parameters change
 *
 * @example
 * ```typescript
 * class MySurfaceNode extends BaseTextureOwner implements RenderNode {
 *   render(ctx: NodeContext): void {
 *     if (!this.isDirty && this.outputTexture) return // Cache hit
 *
 *     const texture = this.ensureTexture(ctx.device, ctx.viewport)
 *     ctx.renderer.renderToTexture(spec, texture)
 *     this._isDirty = false
 *   }
 * }
 * ```
 */
export abstract class BaseTextureOwner implements TextureOwner {
  /** The owned GPU texture */
  protected _outputTexture: GPUTexture | null = null

  /** Whether re-rendering is needed */
  protected _isDirty = true

  /** Last viewport used for texture creation */
  protected _lastViewport: Viewport | null = null

  /** Texture format to use (set by first ensureTexture call) */
  protected _format: GPUTextureFormat = DEFAULT_TEXTURE_FORMAT

  /**
   * Get the current output texture.
   */
  get outputTexture(): GPUTexture | null {
    return this._outputTexture
  }

  /**
   * Check if this node needs to re-render.
   */
  get isDirty(): boolean {
    return this._isDirty
  }

  /**
   * Ensure a texture exists with the correct dimensions and format.
   *
   * If the viewport size or format has changed, the old texture is destroyed
   * and a new one is created. The dirty flag is set when this happens.
   *
   * @param device - WebGPU device for texture creation
   * @param viewport - Target viewport dimensions
   * @param format - Texture format (uses renderer's format from context)
   * @returns The output texture (existing or newly created)
   */
  ensureTexture(device: GPUDevice, viewport: Viewport, format?: GPUTextureFormat): GPUTexture {
    const targetFormat = format ?? this._format

    // Check if we need to recreate the texture (size or format change)
    const needsRecreate = needsTextureResize(this._outputTexture, viewport) ||
      (this._outputTexture && format && this._format !== format)

    if (needsRecreate) {
      // Destroy old texture if it exists
      this._outputTexture?.destroy()

      // Create new texture with the target format
      this._format = targetFormat
      this._outputTexture = createRenderTexture(device, viewport, this._format)
      this._lastViewport = { ...viewport }

      // Size/format change requires re-render
      this._isDirty = true
    }

    return this._outputTexture!
  }

  /**
   * Mark this node as needing re-render.
   */
  invalidate(): void {
    this._isDirty = true
  }

  /**
   * Release GPU resources.
   */
  dispose(): void {
    this._outputTexture?.destroy()
    this._outputTexture = null
    this._lastViewport = null
    this._isDirty = true
  }
}
