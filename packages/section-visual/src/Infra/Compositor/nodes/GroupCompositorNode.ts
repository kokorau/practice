/**
 * GroupCompositorNode
 *
 * A compositor node that represents a group of layers with:
 * - Blend mode for compositing onto layers below
 *
 * Implements TextureOwner pattern for per-node texture ownership and caching.
 */

import { createOverlayBlendSpec } from '@practice/texture'
import type {
  CompositorNode,
  RenderNode,
  NodeContext,
  TextureHandle,
} from '../../../Domain/Compositor'
import type { TextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { isTextureOwner } from '../../../Domain/Compositor/TextureOwner'
import { getTextureFromNode } from '../../../Domain/Compositor'
import { BaseTextureOwner } from '../BaseTextureOwner'
import type { GroupBlendMode } from '../../../Domain/HeroViewConfig'

// ============================================================
// GroupCompositorNode Implementation
// ============================================================

/**
 * Resolved transform values for group rendering.
 * All values are raw numbers (PropertyValue resolved).
 */
export interface GroupTransform {
  /** Opacity (0-1) */
  opacity: number
  /** X offset (-1 to 1, normalized) */
  offsetX: number
  /** Y offset (-1 to 1, normalized) */
  offsetY: number
  /** Rotation in degrees */
  rotation: number
}

/**
 * Default transform values (identity transform).
 */
const DEFAULT_TRANSFORM: GroupTransform = {
  opacity: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
}

/**
 * Configuration for GroupCompositorNode.
 */
export interface GroupCompositorNodeConfig {
  /** Unique node identifier */
  id: string

  /** Child nodes to composite in order */
  children: ReadonlyArray<RenderNode | CompositorNode>

  /** Blend mode for compositing this group onto layers below */
  blendMode?: GroupBlendMode

  /** Transform to apply to the group (resolved values) */
  transform?: GroupTransform
}

/**
 * CompositorNode that composes a group of layers with blend mode support.
 *
 * Implements TextureOwner pattern for:
 * - Per-node texture ownership (no shared pool limits)
 * - Dirty-flag based caching (skip re-compositing unchanged nodes)
 * - Automatic viewport resize handling
 * - Input node dirty propagation
 *
 * @example
 * ```typescript
 * const layer1 = new SurfaceRenderNode(...)
 * const layer2 = new TextRenderNode(...)
 *
 * const group = new GroupCompositorNode({
 *   id: 'clip-group',
 *   children: [layer1, layer2],
 *   blendMode: 'multiply',
 * })
 *
 * group.composite(context) // Composites to owned texture
 * ```
 */
export class GroupCompositorNode extends BaseTextureOwner implements CompositorNode, TextureOwner {
  readonly type = 'compositor' as const
  readonly id: string
  readonly inputs: ReadonlyArray<RenderNode | CompositorNode>

  private readonly children: ReadonlyArray<RenderNode | CompositorNode>
  private readonly blendMode: GroupBlendMode
  private readonly transform: GroupTransform

  constructor(config: GroupCompositorNodeConfig) {
    super()
    this.id = config.id
    this.children = config.children
    this.inputs = config.children
    this.blendMode = config.blendMode ?? 'normal'
    this.transform = config.transform ?? DEFAULT_TRANSFORM
  }

  /**
   * Get the blend mode for this group.
   */
  getBlendMode(): GroupBlendMode {
    return this.blendMode
  }

  /**
   * Check if this node or any child is dirty.
   * Overrides base isDirty to propagate dirty state from children.
   */
  get isDirty(): boolean {
    if (this._isDirty) return true

    // Check if any child is dirty (dirty propagation)
    for (const child of this.children) {
      if (isTextureOwner(child) && child.isDirty) return true
    }

    return false
  }

  /**
   * Composite all children in order.
   *
   * Uses TextureOwner caching: skips compositing if not dirty and texture exists.
   */
  composite(ctx: NodeContext): TextureHandle {
    const { renderer, viewport, device, format } = ctx

    if (this.children.length === 0) {
      throw new Error(`[GroupCompositorNode] No children to composite (id: ${this.id})`)
    }

    // Ensure texture exists (handles viewport resize and format)
    this.ensureTexture(device, viewport, format)

    // Skip if not dirty (cache hit)
    if (!this.isDirty) {
      return this.createTextureHandle(viewport)
    }

    // Get first child texture
    const firstChildHandle = getTextureFromNode(this.children[0]!, ctx)

    // If only one child, copy to owned texture and apply transform
    if (this.children.length === 1) {
      this.copyTexture(renderer, firstChildHandle._gpuTexture, this.outputTexture!, viewport)
      // Apply transform if needed
      if (this.needsTransform()) {
        this.applyTransform(renderer, device, viewport, format)
      }
      this._isDirty = false
      return this.createTextureHandle(viewport)
    }

    // Create the overlay blend spec for combining children
    const blendSpec = createOverlayBlendSpec(viewport)

    // First, copy first child to owned texture
    this.copyTexture(renderer, firstChildHandle._gpuTexture, this.outputTexture!, viewport)

    // Create a temporary texture to hold the accumulated result
    const tempTexture = this.createTempTexture(device, viewport, format)

    // Copy current state to temp
    this.copyTexture(renderer, this.outputTexture!, tempTexture, viewport)

    // Overlay subsequent children
    for (let i = 1; i < this.children.length; i++) {
      const childHandle = getTextureFromNode(this.children[i]!, ctx)

      // Blend: temp (base) + child (overlay) → result
      const blendResult = renderer.applyDualTextureEffectToOffscreen(
        blendSpec,
        tempTexture,
        childHandle._gpuTexture,
        0
      )

      // Copy result back to temp for next iteration
      this.copyTexture(renderer, blendResult, tempTexture, viewport)
    }

    // Final copy from temp to owned texture
    this.copyTexture(renderer, tempTexture, this.outputTexture!, viewport)

    // Clean up temp texture
    tempTexture.destroy()

    // Apply transform if needed
    if (this.needsTransform()) {
      this.applyTransform(renderer, device, viewport, format)
    }

    // Mark as clean (cache valid)
    this._isDirty = false

    return this.createTextureHandle(viewport)
  }

  /**
   * Create a temporary texture for intermediate operations.
   */
  private createTempTexture(
    device: GPUDevice,
    viewport: { width: number; height: number },
    format?: GPUTextureFormat
  ): GPUTexture {
    return device.createTexture({
      size: { width: viewport.width, height: viewport.height },
      format: format ?? 'bgra8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT |
             GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_SRC |
             GPUTextureUsage.COPY_DST,
    })
  }

  /**
   * Copy a source texture to destination using passthrough shader.
   */
  private copyTexture(
    renderer: NodeContext['renderer'],
    sourceTexture: GPUTexture,
    destTexture: GPUTexture,
    viewport: { width: number; height: number }
  ): void {
    const passthroughSpec = this.createPassthroughSpec(viewport)
    renderer.applyPostEffectToTexture(passthroughSpec, sourceTexture, destTexture)
  }

  /**
   * Create a passthrough shader spec for copying texture.
   */
  private createPassthroughSpec(viewport: { width: number; height: number }): {
    shader: string
    uniforms: ArrayBuffer
    bufferSize: number
  } {
    const passthroughShader = /* wgsl */ `
struct Params {
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);
  return textureSample(inputTexture, inputSampler, uv);
}
`
    const buffer = new ArrayBuffer(16)
    const view = new Float32Array(buffer)
    view[0] = viewport.width
    view[1] = viewport.height
    view[2] = 0 // padding
    view[3] = 0 // padding

    return {
      shader: passthroughShader,
      uniforms: buffer,
      bufferSize: 16,
    }
  }

  /**
   * Check if this group needs transform applied.
   */
  private needsTransform(): boolean {
    const t = this.transform
    return t.opacity !== 1 || t.offsetX !== 0 || t.offsetY !== 0 || t.rotation !== 0
  }

  /**
   * Apply transform to the output texture.
   */
  private applyTransform(
    renderer: NodeContext['renderer'],
    device: GPUDevice,
    viewport: { width: number; height: number },
    format?: GPUTextureFormat
  ): void {
    const tempTexture = this.createTempTexture(device, viewport, format)

    // Copy current output to temp
    this.copyTexture(renderer, this.outputTexture!, tempTexture, viewport)

    // Apply transform shader: temp → output
    const transformSpec = this.createTransformSpec(viewport)
    renderer.applyPostEffectToTexture(transformSpec, tempTexture, this.outputTexture!)

    tempTexture.destroy()
  }

  /**
   * Create transform shader spec.
   * Handles opacity, offset, and rotation with proper aspect ratio correction.
   */
  private createTransformSpec(viewport: { width: number; height: number }): {
    shader: string
    uniforms: ArrayBuffer
    bufferSize: number
  } {
    const transformShader = /* wgsl */ `
struct TransformParams {
  viewportWidth: f32,
  viewportHeight: f32,
  opacity: f32,
  rotation: f32,
  offsetX: f32,
  offsetY: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: TransformParams;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // Convert to normalized coordinates (0-1)
  let normalizedPos = vec2f(pos.x / params.viewportWidth, pos.y / params.viewportHeight);

  // Convert to centered coordinates (-0.5 to 0.5)
  let centered = normalizedPos - vec2f(0.5, 0.5);

  // Apply aspect ratio correction for proper rotation
  let aspectRatio = params.viewportWidth / params.viewportHeight;
  let aspectCorrected = vec2f(centered.x * aspectRatio, centered.y);

  // Apply rotation (convert degrees to radians)
  let radians = params.rotation * 3.14159265359 / 180.0;
  let cosR = cos(radians);
  let sinR = sin(radians);
  let rotated = vec2f(
    aspectCorrected.x * cosR - aspectCorrected.y * sinR,
    aspectCorrected.x * sinR + aspectCorrected.y * cosR
  );

  // Remove aspect ratio correction
  let unaspected = vec2f(rotated.x / aspectRatio, rotated.y);

  // Apply offset and convert back to UV (0-1)
  let uv = unaspected + vec2f(0.5, 0.5) - vec2f(params.offsetX, params.offsetY);

  // Clamp UV to valid range for sampling (avoids non-uniform control flow issue)
  let clampedUv = clamp(uv, vec2f(0.0), vec2f(1.0));

  // Sample texture (must be in uniform control flow)
  let color = textureSample(inputTexture, inputSampler, clampedUv);

  // Calculate bounds mask (1.0 if in bounds, 0.0 if out of bounds)
  let inBounds = select(0.0, 1.0, uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0);

  // Apply opacity to all channels (premultiplied alpha style for proper blending)
  return vec4f(color.rgb * params.opacity, color.a * params.opacity) * inBounds;
}
`
    // Buffer layout: 8 floats = 32 bytes
    const buffer = new ArrayBuffer(32)
    const view = new Float32Array(buffer)
    view[0] = viewport.width
    view[1] = viewport.height
    view[2] = this.transform.opacity
    view[3] = this.transform.rotation
    view[4] = this.transform.offsetX
    view[5] = this.transform.offsetY
    view[6] = 0 // padding
    view[7] = 0 // padding

    return {
      shader: transformShader,
      uniforms: buffer,
      bufferSize: 32,
    }
  }

  /**
   * Create a TextureHandle for compatibility with legacy code.
   */
  private createTextureHandle(viewport: { width: number; height: number }): TextureHandle {
    return {
      id: `${this.id}-owned`,
      width: viewport.width,
      height: viewport.height,
      _gpuTexture: this.outputTexture!,
      _textureIndex: -1, // Not used in TextureOwner pattern
    }
  }
}

/**
 * Factory function to create a GroupCompositorNode.
 */
export function createGroupCompositorNode(
  id: string,
  children: ReadonlyArray<RenderNode | CompositorNode>,
  options?: {
    blendMode?: GroupBlendMode
    transform?: GroupTransform
  }
): GroupCompositorNode {
  return new GroupCompositorNode({
    id,
    children,
    blendMode: options?.blendMode,
    transform: options?.transform,
  })
}
